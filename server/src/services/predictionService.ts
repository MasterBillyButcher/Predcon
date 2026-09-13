import { ApiException } from "../lib/apiResponse.js";
import { assertTransition, isOpenForEntries } from "../lib/stateMachine.js";
import { publish } from "../lib/eventBus.js";
import {
  predictionsRepo,
  outcomesRepo,
  participantsRepo,
  eventsRepo,
  usersRepo,
} from "../lib/repositories.js";
import type { z } from "zod";
import type { createPredictionSchema, joinPredictionSchema, updatePredictionSchema } from "../lib/validation.js";


type CreateInput = z.infer<typeof createPredictionSchema>;
type JoinInput = z.infer<typeof joinPredictionSchema>;
type UpdateInput = z.infer<typeof updatePredictionSchema>;

// In-memory timers driving auto-lock (ACTIVE -> LOCKED) and auto-expire
// (LOCKED -> EXPIRED if abandoned). Keyed by prediction id. This is
// appropriate for a single-process deployment; a multi-instance production
// deployment would move this to a durable job queue (documented in README).
const lockTimers = new Map<string, NodeJS.Timeout>();
const expireTimers = new Map<string, NodeJS.Timeout>();
const LOCKED_ABANDON_MS = 1000 * 60 * 10; // auto-expire if left unresolved 10 min after lock

function clearTimers(predictionId: string) {
  const l = lockTimers.get(predictionId);
  if (l) clearTimeout(l);
  lockTimers.delete(predictionId);
  const e = expireTimers.get(predictionId);
  if (e) clearTimeout(e);
  expireTimers.delete(predictionId);
}

function logEvent(predictionId: string, type: string, payload: unknown) {
  eventsRepo.create(predictionId, type, payload);
  publish({ type, predictionId, payload });
}

export async function withOutcomeTotals(predictionId: string) {
  const prediction = predictionsRepo.findById(predictionId);
  if (!prediction) throw new ApiException(404, "NOT_FOUND", "Prediction not found.");

  const outcomeRows = outcomesRepo.listByPrediction(predictionId);
  const participantRows = participantsRepo.listByPrediction(predictionId);
  const creator = usersRepo.findById(prediction.creatorId);

  const totalPoints = participantRows.reduce((sum, p) => sum + p.points, 0);
  const totalParticipants = participantRows.length;

  const outcomes = outcomeRows.map((o) => {
    const entries = participantRows.filter((p) => p.outcomeId === o.id);
    const points = entries.reduce((sum, p) => sum + p.points, 0);
    return {
      id: o.id,
      label: o.label,
      color: o.color,
      order: o.order,
      points,
      participants: entries.length,
      percentage: totalPoints > 0 ? Math.round((points / totalPoints) * 1000) / 10 : 0,
    };
  });

  return {
    id: prediction.id,
    title: prediction.title,
    question: prediction.question,
    description: prediction.description,
    status: prediction.status,
    durationSecs: prediction.durationSecs,
    startedAt: prediction.startedAt,
    locksAt: prediction.locksAt,
    resolvedAt: prediction.resolvedAt,
    cancelledAt: prediction.cancelledAt,
    winningOutcomeId: prediction.winningOutcomeId,
    minPoints: prediction.minPoints,
    maxPoints: prediction.maxPoints,
    creator: creator
      ? {
          id: creator.id,
          username: creator.username,
          displayName: creator.displayName,
          profileImageUrl: creator.profileImageUrl,
        }
      : null,
    outcomes,
    totalPoints,
    totalParticipants,
    serverNow: new Date().toISOString(),
  };
}

export async function createPrediction(creatorId: string, input: CreateInput) {
  const prediction = predictionsRepo.create({
    creatorId,
    title: input.title,
    question: input.question,
    description: input.description,
    durationSecs: input.durationSecs,
    minPoints: input.minPoints,
    maxPoints: input.maxPoints,
  });
  outcomesRepo.createMany(
    prediction.id,
    input.outcomes.map((o) => ({ label: o.label, color: o.color })),
  );
  logEvent(prediction.id, "prediction.created", { predictionId: prediction.id });
  return withOutcomeTotals(prediction.id);
}

export async function startPrediction(predictionId: string) {
  const prediction = requireExists(predictionId);
  assertTransition(prediction.status, "ACTIVE");

  const startedAt = new Date();
  const locksAt = new Date(startedAt.getTime() + prediction.durationSecs * 1000);

  predictionsRepo.update(predictionId, {
    status: "ACTIVE",
    startedAt: startedAt.toISOString(),
    locksAt: locksAt.toISOString(),
  });

  scheduleAutoLock(predictionId, locksAt);
  logEvent(predictionId, "prediction.started", { startedAt, locksAt });
  return withOutcomeTotals(predictionId);
}

function scheduleAutoLock(predictionId: string, locksAt: Date) {
  clearTimers(predictionId);
  const delay = Math.max(0, locksAt.getTime() - Date.now());
  const timer = setTimeout(() => {
    lockPrediction(predictionId, true).catch((err) =>
       
      console.error(`Auto-lock failed for ${predictionId}:`, err),
    );
  }, delay);
  lockTimers.set(predictionId, timer);
}

function scheduleAutoExpire(predictionId: string) {
  const timer = setTimeout(() => {
    expirePrediction(predictionId).catch((err) =>
       
      console.error(`Auto-expire failed for ${predictionId}:`, err),
    );
  }, LOCKED_ABANDON_MS);
  expireTimers.set(predictionId, timer);
}

export async function joinPrediction(predictionId: string, userId: string, input: JoinInput) {
  const prediction = predictionsRepo.findById(predictionId);
  if (!prediction) throw new ApiException(404, "NOT_FOUND", "Prediction not found.");
  if (!isOpenForEntries(prediction.status)) {
    throw new ApiException(409, "PREDICTION_LOCKED", "This prediction is no longer accepting entries.");
  }
  const outcome = outcomesRepo.findById(input.outcomeId);
  if (!outcome || outcome.predictionId !== predictionId) {
    throw new ApiException(422, "INVALID_OUTCOME", "That outcome does not belong to this prediction.");
  }
  if (input.points < prediction.minPoints) {
    throw new ApiException(422, "BELOW_MINIMUM", `Minimum participation is ${prediction.minPoints} points.`);
  }
  if (prediction.maxPoints && input.points > prediction.maxPoints) {
    throw new ApiException(422, "ABOVE_MAXIMUM", `Maximum participation is ${prediction.maxPoints} points.`);
  }

  const existing = participantsRepo.findByPredictionAndUser(predictionId, userId);
  if (existing) {
    throw new ApiException(409, "DUPLICATE_ENTRY", "You already joined this prediction.");
  }

  participantsRepo.create({ predictionId, userId, outcomeId: input.outcomeId, points: input.points });

  const totals = await withOutcomeTotals(predictionId);
  logEvent(predictionId, "prediction.joined", { userId, outcomeId: input.outcomeId, points: input.points });
  logEvent(predictionId, "leaderboard.updated", { outcomes: totals.outcomes, totalPoints: totals.totalPoints });
  return totals;
}

export async function lockPrediction(predictionId: string, automatic = false) {
  const prediction = requireExists(predictionId);

  // Auto-lock races: if it was already moved on (cancelled, or manually
  // locked already), silently no-op instead of throwing into a timer.
  if (automatic && prediction.status !== "ACTIVE") return withOutcomeTotals(predictionId);

  assertTransition(prediction.status, "LOCKED");
  clearTimers(predictionId);
  predictionsRepo.update(predictionId, { status: "LOCKED" });
  scheduleAutoExpire(predictionId);
  logEvent(predictionId, "prediction.locked", { automatic });
  return withOutcomeTotals(predictionId);
}

export async function resolvePrediction(predictionId: string, winningOutcomeId: string) {
  const prediction = requireExists(predictionId);
  assertTransition(prediction.status, "RESOLVING");

  const outcome = outcomesRepo.findById(winningOutcomeId);
  if (!outcome || outcome.predictionId !== predictionId) {
    throw new ApiException(422, "INVALID_OUTCOME", "That outcome does not belong to this prediction.");
  }

  clearTimers(predictionId);

  // Transactional: flip to RESOLVING then RESOLVED with the winner set in
  // one atomic write, so no reader ever observes a winner without RESOLVED
  // (or vice versa).
  predictionsRepo.update(predictionId, { status: "RESOLVING" });
  predictionsRepo.update(predictionId, {
    status: "RESOLVED",
    winningOutcomeId,
    resolvedAt: new Date().toISOString(),
  });

  logEvent(predictionId, "prediction.resolving", { winningOutcomeId });
  const totals = await withOutcomeTotals(predictionId);
  logEvent(predictionId, "prediction.resolved", {
    winningOutcomeId,
    outcomes: totals.outcomes,
    totalPoints: totals.totalPoints,
    totalParticipants: totals.totalParticipants,
  });
  return totals;
}

export async function updatePrediction(predictionId: string, input: UpdateInput) {
  const prediction = requireExists(predictionId);
  // Editing is only safe before a prediction goes live — once it's ACTIVE,
  // viewers may already be looking at (and about to enter) the current
  // question and outcomes, so changing them out from under an in-flight
  // prediction is not allowed. Use cancel + create-new instead.
  if (prediction.status !== "DRAFT") {
    throw new ApiException(
      409,
      "PREDICTION_NOT_EDITABLE",
      "Only a draft prediction can be edited. Cancel and recreate it instead.",
    );
  }

  const { outcomes, ...fields } = input;
  const patch: Partial<Parameters<typeof predictionsRepo.update>[1]> = {};
  if (fields.title !== undefined) patch.title = fields.title;
  if (fields.question !== undefined) patch.question = fields.question;
  if (fields.description !== undefined) patch.description = fields.description;
  if (fields.durationSecs !== undefined) patch.durationSecs = fields.durationSecs;
  if (fields.minPoints !== undefined) patch.minPoints = fields.minPoints;
  if (fields.maxPoints !== undefined) patch.maxPoints = fields.maxPoints;
  if (Object.keys(patch).length > 0) {
    predictionsRepo.update(predictionId, patch);
  }

  if (outcomes) {
    outcomesRepo.deleteByPrediction(predictionId);
    outcomesRepo.createMany(
      predictionId,
      outcomes.map((o) => ({ label: o.label, color: o.color })),
    );
  }

  logEvent(predictionId, "prediction.updated", { fields: Object.keys(input) });
  return withOutcomeTotals(predictionId);
}

export async function cancelPrediction(predictionId: string) {
  const prediction = requireExists(predictionId);
  assertTransition(prediction.status, "CANCELLED");
  clearTimers(predictionId);
  predictionsRepo.update(predictionId, { status: "CANCELLED", cancelledAt: new Date().toISOString() });
  logEvent(predictionId, "prediction.cancelled", {});
  return withOutcomeTotals(predictionId);
}

export async function expirePrediction(predictionId: string) {
  const prediction = requireExists(predictionId);
  if (prediction.status !== "LOCKED" && prediction.status !== "ACTIVE") {
    return withOutcomeTotals(predictionId);
  }
  assertTransition(prediction.status, "EXPIRED");
  clearTimers(predictionId);
  predictionsRepo.update(predictionId, { status: "EXPIRED" });
  logEvent(predictionId, "prediction.expired", {});
  return withOutcomeTotals(predictionId);
}

// Site-wide reads — this is a shared platform, not a per-creator one, so
// these are never scoped to whoever happens to be logged in (including
// nobody at all — see the public GET routes in routes/predictions.ts).
export async function listPredictions(statusFilter?: string) {
  const predictions = predictionsRepo.listAll(statusFilter);
  return Promise.all(predictions.map((p) => withOutcomeTotals(p.id)));
}

export async function getActivePrediction() {
  const active = predictionsRepo.findActiveAny();
  return active ? withOutcomeTotals(active.id) : null;
}

export async function getEvents(predictionId: string) {
  const events = eventsRepo.listByPrediction(predictionId);
  return events.map((e) => ({ ...e, payload: JSON.parse(e.payload) as unknown }));
}

// On process start, re-arm timers for any prediction left ACTIVE/LOCKED
// from a previous run (e.g. dev server restart) so state keeps moving
// instead of getting stuck.
export async function rearmTimersOnBoot() {
  const active = predictionsRepo.findAllByStatus("ACTIVE");
  for (const p of active) {
    if (p.locksAt) scheduleAutoLock(p.id, new Date(p.locksAt));
  }
  const locked = predictionsRepo.findAllByStatus("LOCKED");
  for (const p of locked) {
    scheduleAutoExpire(p.id);
  }
}

function requireExists(predictionId: string) {
  const prediction = predictionsRepo.findById(predictionId);
  if (!prediction) throw new ApiException(404, "NOT_FOUND", "Prediction not found.");
  return prediction;
}
