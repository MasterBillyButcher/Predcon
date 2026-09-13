import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { MemoryRouter } from "react-router-dom";
import { Login } from "../pages/Login";
import { PredictCreate } from "../pages/PredictCreate";
import { PredictionCard } from "../components/prediction/PredictionCard";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import type { Prediction } from "../types";

const prediction: Prediction = {
  id: "pred_1",
  title: "Chat vote",
  question: "Will chat pick pizza or tacos?",
  description: null,
  status: "ACTIVE",
  durationSecs: 60,
  startedAt: new Date().toISOString(),
  locksAt: new Date(Date.now() + 30_000).toISOString(),
  resolvedAt: null,
  cancelledAt: null,
  winningOutcomeId: null,
  minPoints: 1,
  maxPoints: null,
  creator: { id: "u1", username: "demo_streamer", displayName: "Demo Streamer", profileImageUrl: null },
  outcomes: [
    { id: "o1", label: "Pizza", color: "blue", order: 0, points: 60, participants: 2, percentage: 60 },
    { id: "o2", label: "Tacos", color: "pink", order: 1, points: 40, participants: 1, percentage: 40 },
  ],
  totalPoints: 100,
  totalParticipants: 3,
  serverNow: new Date().toISOString(),
};

/**
 * Structural a11y checks via axe-core running against jsdom. This can't
 * catch everything a real browser + screen reader pass would (focus order,
 * actual contrast rendering, zoom behavior) — but it does catch the
 * mechanical stuff the spec calls out: unlabeled inputs, non-semantic
 * buttons, missing landmarks, invalid ARIA usage.
 */
describe("accessibility (axe)", () => {
  it("Login page has no detectable violations", async () => {
    const { container } = render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("PredictCreate form has no detectable violations", async () => {
    const { container } = render(
      <MemoryRouter>
        <PredictCreate />
      </MemoryRouter>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("PredictionCard has no detectable violations", async () => {
    const { container } = render(
      <MemoryRouter>
        <PredictionCard prediction={prediction} onChanged={() => {}} interactive />
      </MemoryRouter>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("ConfirmModal has no detectable violations when open", async () => {
    const { container } = render(
      <ConfirmModal
        open
        title="Cancel this prediction?"
        description="This cannot be undone."
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
