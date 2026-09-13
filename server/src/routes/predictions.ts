import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ok } from "../lib/apiResponse.js";
import {
  createPredictionSchema,
  joinPredictionSchema,
  resolvePredictionSchema,
  updatePredictionSchema,
} from "../lib/validation.js";
import * as predictionService from "../services/predictionService.js";

export const predictionsRouter = Router();

// This is a shared, site-wide platform: anyone — including a logged-out
// visitor — can read the current/past predictions. Only join (any signed-in
// role) and create/manage (Admin or Super Admin) require auth. Gating
// happens per-route below rather than with a single router-wide `use`.
const manage = requireRole("ADMIN", "SUPER_ADMIN");

predictionsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const predictions = await predictionService.listPredictions(status);
    ok(res, predictions);
  }),
);

predictionsRouter.get(
  "/active",
  asyncHandler(async (_req, res) => {
    const active = await predictionService.getActivePrediction();
    ok(res, active);
  }),
);

predictionsRouter.post(
  "/",
  requireAuth,
  manage,
  asyncHandler(async (req, res) => {
    const input = createPredictionSchema.parse(req.body);
    const prediction = await predictionService.createPrediction(req.user!.id, input);
    ok(res, prediction, 201);
  }),
);

predictionsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const prediction = await predictionService.withOutcomeTotals(req.params.id);
    ok(res, prediction);
  }),
);

predictionsRouter.get(
  "/:id/results",
  asyncHandler(async (req, res) => {
    const prediction = await predictionService.withOutcomeTotals(req.params.id);
    ok(res, prediction);
  }),
);

predictionsRouter.get(
  "/:id/events",
  asyncHandler(async (req, res) => {
    const events = await predictionService.getEvents(req.params.id);
    ok(res, events);
  }),
);

predictionsRouter.patch(
  "/:id",
  requireAuth,
  manage,
  asyncHandler(async (req, res) => {
    const input = updatePredictionSchema.parse(req.body);
    const prediction = await predictionService.updatePrediction(req.params.id, input);
    ok(res, prediction);
  }),
);

predictionsRouter.post(
  "/:id/start",
  requireAuth,
  manage,
  asyncHandler(async (req, res) => {
    const prediction = await predictionService.startPrediction(req.params.id);
    ok(res, prediction);
  }),
);

// Joining is the one write action open to any signed-in role (USER,
// ADMIN, or SUPER_ADMIN) — a regular viewer needs to be able to vote.
predictionsRouter.post(
  "/:id/join",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = joinPredictionSchema.parse(req.body);
    const prediction = await predictionService.joinPrediction(req.params.id, req.user!.id, input);
    ok(res, prediction);
  }),
);

predictionsRouter.post(
  "/:id/lock",
  requireAuth,
  manage,
  asyncHandler(async (req, res) => {
    const prediction = await predictionService.lockPrediction(req.params.id);
    ok(res, prediction);
  }),
);

predictionsRouter.post(
  "/:id/resolve",
  requireAuth,
  manage,
  asyncHandler(async (req, res) => {
    const input = resolvePredictionSchema.parse(req.body);
    const prediction = await predictionService.resolvePrediction(req.params.id, input.winningOutcomeId);
    ok(res, prediction);
  }),
);

predictionsRouter.post(
  "/:id/cancel",
  requireAuth,
  manage,
  asyncHandler(async (req, res) => {
    const prediction = await predictionService.cancelPrediction(req.params.id);
    ok(res, prediction);
  }),
);
