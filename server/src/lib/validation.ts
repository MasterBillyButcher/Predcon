import { z } from "zod";

const outcomeSchema = z.object({
  label: z.string().trim().min(1, "Outcome text is required").max(45, "Keep outcomes under 45 characters"),
  color: z.enum(["blue", "pink", "teal", "amber"]),
});

export const createPredictionSchema = z
  .object({
    title: z.string().trim().max(80).optional(),
    question: z.string().trim().min(1, "Question is required").max(140, "Keep the question under 140 characters"),
    description: z.string().trim().max(280).optional(),
    outcomes: z.array(outcomeSchema).min(2, "At least 2 outcomes are required").max(4, "At most 4 outcomes are allowed"),
    durationSecs: z.number().int().min(15, "Minimum duration is 15 seconds").max(1800, "Maximum duration is 30 minutes"),
    minPoints: z.number().int().min(1).default(1),
    maxPoints: z.number().int().min(1).optional(),
  })
  .refine(
    (v) => new Set(v.outcomes.map((o) => o.label.toLowerCase())).size === v.outcomes.length,
    { message: "Outcomes must be unique", path: ["outcomes"] },
  )
  .refine((v) => !v.maxPoints || v.maxPoints >= v.minPoints, {
    message: "Maximum participation must be greater than or equal to the minimum",
    path: ["maxPoints"],
  });

export const updatePredictionSchema = z
  .object({
    title: z.string().trim().max(80).optional(),
    question: z.string().trim().min(1, "Question is required").max(140, "Keep the question under 140 characters").optional(),
    description: z.string().trim().max(280).optional(),
    outcomes: z
      .array(outcomeSchema)
      .min(2, "At least 2 outcomes are required")
      .max(4, "At most 4 outcomes are allowed")
      .optional(),
    durationSecs: z.number().int().min(15, "Minimum duration is 15 seconds").max(1800, "Maximum duration is 30 minutes").optional(),
    minPoints: z.number().int().min(1).optional(),
    maxPoints: z.number().int().min(1).optional(),
  })
  .refine(
    (v) => !v.outcomes || new Set(v.outcomes.map((o) => o.label.toLowerCase())).size === v.outcomes.length,
    { message: "Outcomes must be unique", path: ["outcomes"] },
  )
  .refine((v) => !v.maxPoints || !v.minPoints || v.maxPoints >= v.minPoints, {
    message: "Maximum participation must be greater than or equal to the minimum",
    path: ["maxPoints"],
  });

export const joinPredictionSchema = z.object({
  outcomeId: z.string().min(1, "Choose an outcome"),
  points: z.number().int().positive("Points must be a positive number"),
});

export const resolvePredictionSchema = z.object({
  winningOutcomeId: z.string().min(1, "A winning outcome is required"),
});
