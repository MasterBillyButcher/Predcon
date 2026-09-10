import type { PredictionStatus } from "../types/index.js";
import { ApiException } from "./apiResponse.js";

// The only legal transitions. Every mutation to `Prediction.status` in the
// codebase must go through `assertTransition` — never set `.status`
// directly anywhere else. This is what makes the lifecycle a real state
// machine rather than a client-trusted flag.
const TRANSITIONS: Record<PredictionStatus, PredictionStatus[]> = {
  DRAFT: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["LOCKED", "CANCELLED", "EXPIRED"],
  LOCKED: ["RESOLVING", "CANCELLED", "EXPIRED"],
  RESOLVING: ["RESOLVED", "CANCELLED"],
  RESOLVED: [],
  CANCELLED: [],
  EXPIRED: [],
};

export function assertTransition(from: PredictionStatus, to: PredictionStatus): void {
  const allowed = TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new ApiException(
      409,
      "INVALID_TRANSITION",
      `Cannot move a prediction from ${from} to ${to}.`,
    );
  }
}

export function isOpenForEntries(status: PredictionStatus): boolean {
  return status === "ACTIVE";
}

export function isTerminal(status: PredictionStatus): boolean {
  return status === "RESOLVED" || status === "CANCELLED" || status === "EXPIRED";
}
