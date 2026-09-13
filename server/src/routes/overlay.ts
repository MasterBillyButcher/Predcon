import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler.js";
import { ok } from "../lib/apiResponse.js";
import * as predictionService from "../services/predictionService.js";

// Deliberately outside requireAuth — OBS browser sources can't complete an
// interactive login. The overlay is read-only: it can never join, lock, or
// resolve a prediction, only observe it.
export const overlayRouter = Router();

overlayRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const prediction = await predictionService.withOutcomeTotals(req.params.id);
    ok(res, prediction);
  }),
);
