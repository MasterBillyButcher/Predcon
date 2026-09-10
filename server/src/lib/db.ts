import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// DATABASE_URL follows the same "file:./dev.db" shape Prisma uses, resolved
// relative to the server package root (two levels up from this file, in
// either src/lib during development or dist/lib once built), so .env stays
// identical if this project is later swapped onto real Prisma + Postgres.
function resolveDbPath(): string {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const relative = url.replace(/^file:/, "");
  return path.resolve(__dirname, "..", "..", relative);
}

const dbPath = resolveDbPath();
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Table shapes mirror prisma/schema.prisma exactly (same model and field
// names) so that repository code here reads like a Prisma-generated client
// and swapping the data layer later is mechanical, not a redesign.
export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS User (
      id TEXT PRIMARY KEY,
      twitchId TEXT UNIQUE,
      username TEXT NOT NULL UNIQUE,
      displayName TEXT NOT NULL,
      profileImageUrl TEXT,
      isDemo INTEGER NOT NULL DEFAULT 0,
      accessToken TEXT,
      refreshToken TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Session (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES User(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expiresAt TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_session_userId ON Session(userId);

    CREATE TABLE IF NOT EXISTS Prediction (
      id TEXT PRIMARY KEY,
      creatorId TEXT NOT NULL REFERENCES User(id),
      title TEXT,
      question TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      durationSecs INTEGER NOT NULL,
      startedAt TEXT,
      locksAt TEXT,
      resolvedAt TEXT,
      cancelledAt TEXT,
      winningOutcomeId TEXT,
      minPoints INTEGER NOT NULL DEFAULT 1,
      maxPoints INTEGER,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_prediction_creatorId ON Prediction(creatorId);
    CREATE INDEX IF NOT EXISTS idx_prediction_status ON Prediction(status);

    CREATE TABLE IF NOT EXISTS PredictionOutcome (
      id TEXT PRIMARY KEY,
      predictionId TEXT NOT NULL REFERENCES Prediction(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      color TEXT NOT NULL,
      "order" INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_outcome_predictionId ON PredictionOutcome(predictionId);

    CREATE TABLE IF NOT EXISTS PredictionParticipant (
      id TEXT PRIMARY KEY,
      predictionId TEXT NOT NULL REFERENCES Prediction(id) ON DELETE CASCADE,
      outcomeId TEXT NOT NULL REFERENCES PredictionOutcome(id) ON DELETE CASCADE,
      userId TEXT NOT NULL REFERENCES User(id),
      points INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      UNIQUE(predictionId, userId)
    );
    CREATE INDEX IF NOT EXISTS idx_participant_predictionId ON PredictionParticipant(predictionId);
    CREATE INDEX IF NOT EXISTS idx_participant_outcomeId ON PredictionParticipant(outcomeId);

    CREATE TABLE IF NOT EXISTS PredictionEvent (
      id TEXT PRIMARY KEY,
      predictionId TEXT NOT NULL REFERENCES Prediction(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_event_predictionId ON PredictionEvent(predictionId);
    CREATE INDEX IF NOT EXISTS idx_event_type ON PredictionEvent(type);
  `);
}
