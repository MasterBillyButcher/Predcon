import { nanoid } from "nanoid";
import { db } from "./db.js";
import type { PredictionStatus } from "../types/index.js";

export interface UserRow {
  id: string;
  twitchId: string | null;
  username: string;
  displayName: string;
  profileImageUrl: string | null;
  isDemo: number;
  accessToken: string | null;
  refreshToken: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionRow {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface PredictionRow {
  id: string;
  creatorId: string;
  title: string | null;
  question: string;
  description: string | null;
  status: PredictionStatus;
  durationSecs: number;
  startedAt: string | null;
  locksAt: string | null;
  resolvedAt: string | null;
  cancelledAt: string | null;
  winningOutcomeId: string | null;
  minPoints: number;
  maxPoints: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface OutcomeRow {
  id: string;
  predictionId: string;
  label: string;
  color: string;
  order: number;
}

export interface ParticipantRow {
  id: string;
  predictionId: string;
  outcomeId: string;
  userId: string;
  points: number;
  createdAt: string;
}

export interface EventRow {
  id: string;
  predictionId: string;
  type: string;
  payload: string;
  createdAt: string;
}

const now = () => new Date().toISOString();
const newId = () => nanoid(24);

// ---------------------------------------------------------------- users --
export const usersRepo = {
  findByUsername(username: string): UserRow | undefined {
    return db.prepare("SELECT * FROM User WHERE username = ?").get(username) as UserRow | undefined;
  },
  findById(id: string): UserRow | undefined {
    return db.prepare("SELECT * FROM User WHERE id = ?").get(id) as UserRow | undefined;
  },
  findByTwitchId(twitchId: string): UserRow | undefined {
    return db.prepare("SELECT * FROM User WHERE twitchId = ?").get(twitchId) as UserRow | undefined;
  },
  create(input: {
    username: string;
    displayName: string;
    profileImageUrl?: string | null;
    isDemo?: boolean;
    twitchId?: string | null;
    accessToken?: string | null;
    refreshToken?: string | null;
  }): UserRow {
    const id = newId();
    const ts = now();
    db.prepare(
      `INSERT INTO User (id, twitchId, username, displayName, profileImageUrl, isDemo, accessToken, refreshToken, createdAt, updatedAt)
       VALUES (@id, @twitchId, @username, @displayName, @profileImageUrl, @isDemo, @accessToken, @refreshToken, @createdAt, @updatedAt)`,
    ).run({
      id,
      twitchId: input.twitchId ?? null,
      username: input.username,
      displayName: input.displayName,
      profileImageUrl: input.profileImageUrl ?? null,
      isDemo: input.isDemo ? 1 : 0,
      accessToken: input.accessToken ?? null,
      refreshToken: input.refreshToken ?? null,
      createdAt: ts,
      updatedAt: ts,
    });
    return usersRepo.findById(id)!;
  },
  upsertByTwitchId(input: {
    twitchId: string;
    username: string;
    displayName: string;
    profileImageUrl: string | null;
    accessToken: string;
    refreshToken: string;
  }): UserRow {
    const existing = usersRepo.findByTwitchId(input.twitchId);
    if (existing) {
      db.prepare(
        `UPDATE User SET username=@username, displayName=@displayName, profileImageUrl=@profileImageUrl,
         accessToken=@accessToken, refreshToken=@refreshToken, updatedAt=@updatedAt WHERE id=@id`,
      ).run({ ...input, id: existing.id, updatedAt: now() });
      return usersRepo.findById(existing.id)!;
    }
    return usersRepo.create({ ...input, isDemo: false });
  },
};

// ------------------------------------------------------------ sessions --
export const sessionsRepo = {
  create(userId: string, token: string, expiresAt: Date): SessionRow {
    const id = newId();
    db.prepare(
      `INSERT INTO Session (id, userId, token, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?)`,
    ).run(id, userId, token, expiresAt.toISOString(), now());
    return db.prepare("SELECT * FROM Session WHERE id = ?").get(id) as SessionRow;
  },
  findByToken(token: string): SessionRow | undefined {
    return db.prepare("SELECT * FROM Session WHERE token = ?").get(token) as SessionRow | undefined;
  },
  deleteByToken(token: string): void {
    db.prepare("DELETE FROM Session WHERE token = ?").run(token);
  },
};

// --------------------------------------------------------- predictions --
export const predictionsRepo = {
  create(input: {
    creatorId: string;
    title?: string;
    question: string;
    description?: string;
    durationSecs: number;
    minPoints: number;
    maxPoints?: number;
  }): PredictionRow {
    const id = newId();
    const ts = now();
    db.prepare(
      `INSERT INTO Prediction (id, creatorId, title, question, description, status, durationSecs, minPoints, maxPoints, createdAt, updatedAt)
       VALUES (@id, @creatorId, @title, @question, @description, 'DRAFT', @durationSecs, @minPoints, @maxPoints, @createdAt, @updatedAt)`,
    ).run({
      id,
      creatorId: input.creatorId,
      title: input.title ?? null,
      question: input.question,
      description: input.description ?? null,
      durationSecs: input.durationSecs,
      minPoints: input.minPoints,
      maxPoints: input.maxPoints ?? null,
      createdAt: ts,
      updatedAt: ts,
    });
    return predictionsRepo.findById(id)!;
  },
  findById(id: string): PredictionRow | undefined {
    return db.prepare("SELECT * FROM Prediction WHERE id = ?").get(id) as PredictionRow | undefined;
  },
  listByCreator(creatorId: string, status?: string): PredictionRow[] {
    if (status && status !== "ALL") {
      return db
        .prepare("SELECT * FROM Prediction WHERE creatorId = ? AND status = ? ORDER BY createdAt DESC")
        .all(creatorId, status) as PredictionRow[];
    }
    return db
      .prepare("SELECT * FROM Prediction WHERE creatorId = ? ORDER BY createdAt DESC")
      .all(creatorId) as PredictionRow[];
  },
  findActiveByCreator(creatorId: string): PredictionRow | undefined {
    return db
      .prepare(
        `SELECT * FROM Prediction WHERE creatorId = ? AND status IN ('ACTIVE','LOCKED','RESOLVING')
         ORDER BY createdAt DESC LIMIT 1`,
      )
      .get(creatorId) as PredictionRow | undefined;
  },
  findAllByStatus(status: string): PredictionRow[] {
    return db.prepare("SELECT * FROM Prediction WHERE status = ?").all(status) as PredictionRow[];
  },
  update(id: string, patch: Partial<PredictionRow>): void {
    const fields = Object.keys(patch);
    if (fields.length === 0) return;
    const setClause = fields.map((f) => `${f} = @${f}`).join(", ");
    db.prepare(`UPDATE Prediction SET ${setClause}, updatedAt = @updatedAt WHERE id = @id`).run({
      ...patch,
      id,
      updatedAt: now(),
    });
  },
};

export const outcomesRepo = {
  createMany(predictionId: string, outcomes: Array<{ label: string; color: string }>): OutcomeRow[] {
    const insert = db.prepare(
      `INSERT INTO PredictionOutcome (id, predictionId, label, color, "order") VALUES (?, ?, ?, ?, ?)`,
    );
    const tx = db.transaction((rows: Array<{ label: string; color: string }>) => {
      rows.forEach((o, i) => insert.run(newId(), predictionId, o.label, o.color, i));
    });
    tx(outcomes);
    return outcomesRepo.listByPrediction(predictionId);
  },
  deleteByPrediction(predictionId: string): void {
    db.prepare("DELETE FROM PredictionOutcome WHERE predictionId = ?").run(predictionId);
  },
  listByPrediction(predictionId: string): OutcomeRow[] {
    return db
      .prepare(`SELECT * FROM PredictionOutcome WHERE predictionId = ? ORDER BY "order" ASC`)
      .all(predictionId) as OutcomeRow[];
  },
  findById(id: string): OutcomeRow | undefined {
    return db.prepare("SELECT * FROM PredictionOutcome WHERE id = ?").get(id) as OutcomeRow | undefined;
  },
};

export const participantsRepo = {
  findByPredictionAndUser(predictionId: string, userId: string): ParticipantRow | undefined {
    return db
      .prepare("SELECT * FROM PredictionParticipant WHERE predictionId = ? AND userId = ?")
      .get(predictionId, userId) as ParticipantRow | undefined;
  },
  create(input: { predictionId: string; outcomeId: string; userId: string; points: number }): ParticipantRow {
    const id = newId();
    db.prepare(
      `INSERT INTO PredictionParticipant (id, predictionId, outcomeId, userId, points, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(id, input.predictionId, input.outcomeId, input.userId, input.points, now());
    return db.prepare("SELECT * FROM PredictionParticipant WHERE id = ?").get(id) as ParticipantRow;
  },
  createMany(rows: Array<{ predictionId: string; outcomeId: string; userId: string; points: number }>): void {
    const insert = db.prepare(
      `INSERT INTO PredictionParticipant (id, predictionId, outcomeId, userId, points, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
    );
    const tx = db.transaction((items: typeof rows) => {
      items.forEach((r) => insert.run(newId(), r.predictionId, r.outcomeId, r.userId, r.points, now()));
    });
    tx(rows);
  },
  listByPrediction(predictionId: string): ParticipantRow[] {
    return db
      .prepare("SELECT * FROM PredictionParticipant WHERE predictionId = ?")
      .all(predictionId) as ParticipantRow[];
  },
};

export const eventsRepo = {
  create(predictionId: string, type: string, payload: unknown): EventRow {
    const id = newId();
    const row = { id, predictionId, type, payload: JSON.stringify(payload), createdAt: now() };
    db.prepare(
      `INSERT INTO PredictionEvent (id, predictionId, type, payload, createdAt) VALUES (@id, @predictionId, @type, @payload, @createdAt)`,
    ).run(row);
    return row;
  },
  listByPrediction(predictionId: string): EventRow[] {
    return db
      .prepare("SELECT * FROM PredictionEvent WHERE predictionId = ? ORDER BY createdAt ASC")
      .all(predictionId) as EventRow[];
  },
};
