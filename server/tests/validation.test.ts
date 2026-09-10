import { describe, expect, it } from "vitest";
import { createPredictionSchema, joinPredictionSchema } from "../src/lib/validation.js";

describe("createPredictionSchema", () => {
  const base = {
    question: "Will we win?",
    outcomes: [
      { label: "Yes", color: "blue" as const },
      { label: "No", color: "pink" as const },
    ],
    durationSecs: 60,
    minPoints: 1,
  };

  it("accepts a valid payload", () => {
    expect(() => createPredictionSchema.parse(base)).not.toThrow();
  });

  it("rejects fewer than 2 outcomes", () => {
    expect(() => createPredictionSchema.parse({ ...base, outcomes: [base.outcomes[0]] })).toThrow();
  });

  it("rejects more than 4 outcomes", () => {
    const outcomes = [
      { label: "A", color: "blue" as const },
      { label: "B", color: "pink" as const },
      { label: "C", color: "teal" as const },
      { label: "D", color: "amber" as const },
      { label: "E", color: "blue" as const },
    ];
    expect(() => createPredictionSchema.parse({ ...base, outcomes })).toThrow();
  });

  it("rejects duplicate outcome labels (case-insensitive)", () => {
    const outcomes = [
      { label: "Yes", color: "blue" as const },
      { label: "yes", color: "pink" as const },
    ];
    expect(() => createPredictionSchema.parse({ ...base, outcomes })).toThrow();
  });

  it("rejects an empty question", () => {
    expect(() => createPredictionSchema.parse({ ...base, question: "" })).toThrow();
  });

  it("rejects duration outside 15s-30min", () => {
    expect(() => createPredictionSchema.parse({ ...base, durationSecs: 5 })).toThrow();
    expect(() => createPredictionSchema.parse({ ...base, durationSecs: 5000 })).toThrow();
  });

  it("rejects maxPoints below minPoints", () => {
    expect(() => createPredictionSchema.parse({ ...base, minPoints: 100, maxPoints: 10 })).toThrow();
  });
});

describe("joinPredictionSchema", () => {
  it("accepts a valid entry", () => {
    expect(() => joinPredictionSchema.parse({ outcomeId: "abc", points: 10 })).not.toThrow();
  });

  it("rejects non-positive points", () => {
    expect(() => joinPredictionSchema.parse({ outcomeId: "abc", points: 0 })).toThrow();
    expect(() => joinPredictionSchema.parse({ outcomeId: "abc", points: -5 })).toThrow();
  });

  it("rejects a missing outcomeId", () => {
    expect(() => joinPredictionSchema.parse({ outcomeId: "", points: 10 })).toThrow();
  });
});
