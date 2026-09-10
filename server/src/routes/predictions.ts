import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { ok } from "../lib/apiResponse.js";
import {
  createPredictionSchema,
  joinPredictionSchema,
  resolvePredictionSchema,
  updatePredictionSchema,
} from "../lib/validation.js";
import * as predictionService from "../services/predictionService.js";

export const predictionsRouter = Router();
predictionsRouter.use(requireAuth);

predictionsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const predictions = await predictionService.listPredictions(req.user!.id, status);
    ok(res, predictions);
  }),
);

predictionsRouter.get(
  "/active",
  asyncHandler(async (req, res) => {
    const active = await predictionService.getActivePrediction(req.user!.id);
    ok(res, active);
  }),
);

predictionsRouter.post(
  "/",
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
  asyncHandler(async (req, res) => {
    const input = updatePredictionSchema.parse(req.body);
    const prediction = await predictionService.updatePrediction(req.params.id, req.user!.id, input);
    ok(res, prediction);
  }),
);

predictionsRouter.post(
  "/:id/start",
  asyncHandler(async (req, res) => {
    const prediction = await predictionService.startPrediction(req.params.id, req.user!.id);
    ok(res, prediction);
  }),
);

predictionsRouter.post(
  "/:id/join",
  asyncHandler(async (req, res) => {
    const input = joinPredictionSchema.parse(req.body);
    const prediction = await predictionService.joinPrediction(req.params.id, req.user!.id, input);
    ok(res, prediction);
  }),
);

predictionsRouter.post(
  "/:id/lock",
  asyncHandler(async (req, res) => {
    const prediction = await predictionService.lockPrediction(req.params.id, req.user!.id);
    ok(res, prediction);
  }),
);

predictionsRouter.post(
  "/:id/resolve",
  asyncHandler(async (req, res) => {
    const input = resolvePredictionSchema.parse(req.body);
    const prediction = await predictionService.resolvePrediction(
      req.params.id,
      req.user!.id,
      input.winningOutcomeId,
    );
    ok(res, prediction);
  }),
);

predictionsRouter.post(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const prediction = await predictionService.cancelPrediction(req.params.id, req.user!.id);
    ok(res, prediction);
  }),
);
