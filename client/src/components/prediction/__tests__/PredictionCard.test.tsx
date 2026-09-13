import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PredictionCard } from "../PredictionCard";
import { useAuthStore } from "../../../store/authStore";
import type { Prediction } from "../../../types";

function basePrediction(overrides: Partial<Prediction> = {}): Prediction {
  return {
    id: "pred_1",
    title: null,
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
    ...overrides,
  };
}

function setRole(role: "USER" | "ADMIN" | "SUPER_ADMIN" | null) {
  useAuthStore.setState({
    user: role
      ? { id: "u2", username: "viewer", displayName: "Viewer", profileImageUrl: null, isDemo: false, role }
      : null,
  } as Partial<ReturnType<typeof useAuthStore.getState>>);
}

function renderCard(prediction: Prediction, interactive = false) {
  return render(
    <MemoryRouter>
      <PredictionCard prediction={prediction} onChanged={vi.fn()} interactive={interactive} />
    </MemoryRouter>,
  );
}

describe("PredictionCard", () => {
  beforeEach(() => setRole(null));

  it("renders the question and every outcome", () => {
    renderCard(basePrediction());
    expect(screen.getByText("Will chat pick pizza or tacos?")).toBeInTheDocument();
    expect(screen.getByText("Pizza")).toBeInTheDocument();
    expect(screen.getByText("Tacos")).toBeInTheDocument();
  });

  it("shows a live status badge for an ACTIVE prediction", () => {
    renderCard(basePrediction({ status: "ACTIVE" }));
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("shows the winner and Resolved badge for a RESOLVED prediction", () => {
    renderCard(
      basePrediction({
        status: "RESOLVED",
        winningOutcomeId: "o1",
        resolvedAt: new Date().toISOString(),
        locksAt: null,
      }),
    );
    expect(screen.getByText("Resolved")).toBeInTheDocument();
    expect(screen.getByText("Winner")).toBeInTheDocument();
  });

  it("shows total participants and points", () => {
    renderCard(basePrediction());
    expect(screen.getByText(/3 participants/)).toBeInTheDocument();
    expect(screen.getByText(/100 points/)).toBeInTheDocument();
  });

  it("does not render join/controls UI when interactive is false, even for an Admin", () => {
    setRole("ADMIN");
    renderCard(basePrediction(), false);
    expect(screen.queryByText("Join this prediction")).not.toBeInTheDocument();
    expect(screen.queryByText("Lock now")).not.toBeInTheDocument();
  });

  it("prompts a logged-out visitor to sign in instead of showing the join form", () => {
    renderCard(basePrediction(), true);
    expect(screen.getByText(/sign in with twitch to join/i)).toBeInTheDocument();
    expect(screen.queryByText("Join this prediction")).not.toBeInTheDocument();
    expect(screen.queryByText("Lock now")).not.toBeInTheDocument();
  });

  it("shows the join form but NOT admin controls for a regular signed-in USER", () => {
    setRole("USER");
    renderCard(basePrediction(), true);
    expect(screen.getByText("Join this prediction")).toBeInTheDocument();
    expect(screen.queryByText("Lock now")).not.toBeInTheDocument();
  });

  it("shows both the join form and admin controls for an Admin", () => {
    setRole("ADMIN");
    renderCard(basePrediction(), true);
    expect(screen.getByText("Join this prediction")).toBeInTheDocument();
    expect(screen.getByText("Lock now")).toBeInTheDocument();
  });

  it("shows admin controls for a Super Admin too", () => {
    setRole("SUPER_ADMIN");
    renderCard(basePrediction(), true);
    expect(screen.getByText("Lock now")).toBeInTheDocument();
  });
});
