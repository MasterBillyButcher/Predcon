import "dotenv/config";
import { migrate } from "../src/lib/db.js";
import { usersRepo, predictionsRepo, outcomesRepo, participantsRepo } from "../src/lib/repositories.js";

migrate();

function upsertUser(username: string, displayName: string) {
  return usersRepo.findByUsername(username) ?? usersRepo.create({ username, displayName, isDemo: true });
}

async function main() {
  const demo = upsertUser("demo_streamer", "Demo Streamer");
  const viewers = ["viewer_ash", "viewer_bo", "viewer_cru", "viewer_dez", "viewer_eli"].map((u) =>
    upsertUser(u, u),
  );

  // A resolved prediction so /predict/history and the dashboard aren't empty.
  const resolved = predictionsRepo.create({
    creatorId: demo.id,
    question: "Do we clear the final boss on this attempt?",
    durationSecs: 60,
    minPoints: 1,
  });
  const resolvedOutcomes = outcomesRepo.createMany(resolved.id, [
    { label: "Yes, first try", color: "blue" },
    { label: "No, we're wiping", color: "pink" },
  ]);
  const [yesOutcome, noOutcome] = resolvedOutcomes;
  participantsRepo.createMany([
    { predictionId: resolved.id, userId: viewers[0].id, outcomeId: yesOutcome.id, points: 240 },
    { predictionId: resolved.id, userId: viewers[1].id, outcomeId: yesOutcome.id, points: 90 },
    { predictionId: resolved.id, userId: viewers[2].id, outcomeId: noOutcome.id, points: 150 },
    { predictionId: resolved.id, userId: viewers[3].id, outcomeId: noOutcome.id, points: 60 },
  ]);
  predictionsRepo.update(resolved.id, {
    status: "ACTIVE",
  });
  predictionsRepo.update(resolved.id, {
    status: "LOCKED",
  });
  predictionsRepo.update(resolved.id, {
    status: "RESOLVING",
  });
  predictionsRepo.update(resolved.id, {
    status: "RESOLVED",
    winningOutcomeId: yesOutcome.id,
    resolvedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    startedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    locksAt: new Date(Date.now() - 1000 * 60 * 29).toISOString(),
  });

  // A cancelled one for history filter variety.
  const cancelled = predictionsRepo.create({
    creatorId: demo.id,
    question: "Will chat pick the speedrun route or the exploration route?",
    durationSecs: 120,
    minPoints: 1,
  });
  outcomesRepo.createMany(cancelled.id, [
    { label: "Speedrun route", color: "teal" },
    { label: "Exploration route", color: "amber" },
  ]);
  predictionsRepo.update(cancelled.id, {
    status: "CANCELLED",
    cancelledAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  });

  // An active prediction so the dashboard and /predict/active have
  // something live to demo immediately.
  const active = predictionsRepo.create({
    creatorId: demo.id,
    question: "What will chat vote for the next stream game?",
    durationSecs: 300,
    minPoints: 1,
  });
  const activeOutcomes = outcomesRepo.createMany(active.id, [
    { label: "Roguelike run", color: "blue" },
    { label: "Horror co-op", color: "pink" },
    { label: "Chill sim game", color: "teal" },
  ]);
  participantsRepo.createMany([
    { predictionId: active.id, userId: viewers[0].id, outcomeId: activeOutcomes[0].id, points: 120 },
    { predictionId: active.id, userId: viewers[1].id, outcomeId: activeOutcomes[1].id, points: 80 },
    { predictionId: active.id, userId: viewers[2].id, outcomeId: activeOutcomes[0].id, points: 45 },
    { predictionId: active.id, userId: viewers[3].id, outcomeId: activeOutcomes[2].id, points: 30 },
  ]);
  predictionsRepo.update(active.id, {
    status: "ACTIVE",
    startedAt: new Date().toISOString(),
    locksAt: new Date(Date.now() + 1000 * 300).toISOString(),
  });

   
  console.log("Seed complete:", { demo: demo.username, active: active.id, resolved: resolved.id });
}

main().catch((e) => {
   
  console.error(e);
  process.exit(1);
});
