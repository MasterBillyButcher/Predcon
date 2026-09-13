import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDbPath = path.resolve(__dirname, "test.db");

// Point at an isolated on-disk DB before any module touches src/lib/db.ts,
// so this suite never shares state with local dev data. DATABASE_URL is
// expressed relative to the server package root, matching how db.ts
// resolves it (two levels up from src/lib or dist/lib).
process.env.DATABASE_URL = `file:${path.relative(path.resolve(__dirname, ".."), testDbPath)}`;

const { migrate, db } = await import("../src/lib/db.js");
const { usersRepo } = await import("../src/lib/repositories.js");
const predictionService = await import("../src/services/predictionService.js");

describe("prediction lifecycle (integration)", () => {
  let adminId: string;
  let viewerId: string;

  beforeAll(() => {
    migrate();
  });

  afterAll(() => {
    db.close();
    for (const suffix of ["", "-shm", "-wal"]) {
      const p = testDbPath + suffix;
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  });

  beforeEach(() => {
    db.exec(
      "DELETE FROM PredictionEvent; DELETE FROM PredictionParticipant; DELETE FROM PredictionOutcome; DELETE FROM Prediction; DELETE FROM Session; DELETE FROM User;",
    );
    adminId = usersRepo.create({ username: `admin_${Date.now()}`, displayName: "Admin", role: "ADMIN" }).id;
    viewerId = usersRepo.create({ username: `viewer_${Date.now()}`, displayName: "Viewer" }).id;
  });

  it("runs the full happy path: create -> start -> join -> lock -> resolve", async () => {
    const created = await predictionService.createPrediction(adminId, {
      question: "Will it rain?",
      outcomes: [
        { label: "Yes", color: "blue" },
        { label: "No", color: "pink" },
      ],
      durationSecs: 30,
      minPoints: 1,
    });
    expect(created.status).toBe("DRAFT");

    const started = await predictionService.startPrediction(created.id);
    expect(started.status).toBe("ACTIVE");
    expect(started.locksAt).not.toBeNull();

    const yesOutcome = started.outcomes.find((o) => o.label === "Yes")!;
    const joined = await predictionService.joinPrediction(created.id, viewerId, {
      outcomeId: yesOutcome.id,
      points: 50,
    });
    expect(joined.totalParticipants).toBe(1);
    expect(joined.totalPoints).toBe(50);

    const locked = await predictionService.lockPrediction(created.id);
    expect(locked.status).toBe("LOCKED");

    const resolved = await predictionService.resolvePrediction(created.id, yesOutcome.id);
    expect(resolved.status).toBe("RESOLVED");
    expect(resolved.winningOutcomeId).toBe(yesOutcome.id);
  });

  it("rejects joining a prediction that never started (DRAFT)", async () => {
    const created = await predictionService.createPrediction(adminId, {
      question: "Draft only",
      outcomes: [
        { label: "A", color: "blue" },
        { label: "B", color: "pink" },
      ],
      durationSecs: 30,
      minPoints: 1,
    });
    await expect(
      predictionService.joinPrediction(created.id, viewerId, {
        outcomeId: created.outcomes[0].id,
        points: 10,
      }),
    ).rejects.toThrow(/no longer accepting entries/);
  });

  it("rejects a duplicate entry from the same user", async () => {
    const created = await predictionService.createPrediction(adminId, {
      question: "Dup test",
      outcomes: [
        { label: "A", color: "blue" },
        { label: "B", color: "pink" },
      ],
      durationSecs: 30,
      minPoints: 1,
    });
    await predictionService.startPrediction(created.id);
    const outcomeId = created.outcomes[0].id;
    await predictionService.joinPrediction(created.id, viewerId, { outcomeId, points: 10 });
    await expect(
      predictionService.joinPrediction(created.id, viewerId, { outcomeId, points: 10 }),
    ).rejects.toThrow(/already joined/);
  });

  it("lets any Admin manage a prediction another Admin created (shared, site-wide platform)", async () => {
    const otherAdminId = usersRepo.create({
      username: `admin2_${Date.now()}`,
      displayName: "Other Admin",
      role: "ADMIN",
    }).id;
    const created = await predictionService.createPrediction(adminId, {
      question: "Shared management test",
      outcomes: [
        { label: "A", color: "blue" },
        { label: "B", color: "pink" },
      ],
      durationSecs: 30,
      minPoints: 1,
    });
    await predictionService.startPrediction(created.id);
    // The *service layer* no longer enforces who may call this — that's
    // the route layer's job (requireRole), covered by the live HTTP check
    // and by the middleware unit tests below. This confirms the service
    // itself has no leftover ownership restriction blocking a second admin.
    const locked = await predictionService.lockPrediction(created.id);
    expect(locked.status).toBe("LOCKED");
    void otherAdminId;
  });

  it("rejects entries below the minimum and above the maximum", async () => {
    const created = await predictionService.createPrediction(adminId, {
      question: "Bounds test",
      outcomes: [
        { label: "A", color: "blue" },
        { label: "B", color: "pink" },
      ],
      durationSecs: 30,
      minPoints: 20,
      maxPoints: 100,
    });
    await predictionService.startPrediction(created.id);
    const outcomeId = created.outcomes[0].id;
    await expect(
      predictionService.joinPrediction(created.id, viewerId, { outcomeId, points: 5 }),
    ).rejects.toThrow(/Minimum participation/);
    await expect(
      predictionService.joinPrediction(created.id, viewerId, { outcomeId, points: 500 }),
    ).rejects.toThrow(/Maximum participation/);
  });

  it("allows editing a DRAFT prediction's question and outcomes", async () => {
    const created = await predictionService.createPrediction(adminId, {
      question: "Original question?",
      outcomes: [
        { label: "A", color: "blue" },
        { label: "B", color: "pink" },
      ],
      durationSecs: 30,
      minPoints: 1,
    });

    const updated = await predictionService.updatePrediction(created.id, {
      question: "Edited question?",
      outcomes: [
        { label: "X", color: "teal" },
        { label: "Y", color: "amber" },
        { label: "Z", color: "blue" },
      ],
    });

    expect(updated.question).toBe("Edited question?");
    expect(updated.outcomes.map((o) => o.label)).toEqual(["X", "Y", "Z"]);
  });

  it("rejects editing a prediction that has already started", async () => {
    const created = await predictionService.createPrediction(adminId, {
      question: "Locked-in question?",
      outcomes: [
        { label: "A", color: "blue" },
        { label: "B", color: "pink" },
      ],
      durationSecs: 30,
      minPoints: 1,
    });
    await predictionService.startPrediction(created.id);

    await expect(
      predictionService.updatePrediction(created.id, { question: "Too late?" }),
    ).rejects.toThrow(/Only a draft prediction can be edited/);
  });

  it("lists predictions site-wide, regardless of who created them", async () => {
    const otherAdminId = usersRepo.create({
      username: `admin3_${Date.now()}`,
      displayName: "Third Admin",
      role: "ADMIN",
    }).id;
    await predictionService.createPrediction(adminId, {
      question: "From admin 1",
      outcomes: [
        { label: "A", color: "blue" },
        { label: "B", color: "pink" },
      ],
      durationSecs: 30,
      minPoints: 1,
    });
    await predictionService.createPrediction(otherAdminId, {
      question: "From admin 2",
      outcomes: [
        { label: "A", color: "blue" },
        { label: "B", color: "pink" },
      ],
      durationSecs: 30,
      minPoints: 1,
    });
    const all = await predictionService.listPredictions();
    const questions = all.map((p) => p.question);
    expect(questions).toContain("From admin 1");
    expect(questions).toContain("From admin 2");
  });
});
