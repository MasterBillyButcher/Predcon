import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { PlusCircle, Radio } from "lucide-react";
import { api } from "../lib/api";
import type { Prediction } from "../types";
import { PredictionCard } from "../components/prediction/PredictionCard";
import { SkeletonCard } from "../components/ui/LoadingState";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Button } from "../components/ui/Button";
import { useAuthStore } from "../store/authStore";

export function Landing() {
  const user = useAuthStore((s) => s.user);
  const [active, setActive] = useState<Prediction | null | undefined>(undefined);
  const [recent, setRecent] = useState<Prediction[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [activeRes, allRes] = await Promise.all([
        api.get<Prediction | null>("/predictions/active"),
        api.get<Prediction[]>("/predictions"),
      ]);
      setActive(activeRes);
      setRecent(allRes.slice(0, 4));
    } catch {
      setError("Couldn't load your dashboard right now.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalPredictions = recent.length; // full count shown via History page

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-text-primary sm:text-3xl">
            Welcome back, {user?.displayName}
          </h1>
          <p className="mt-1 font-body text-sm text-text-secondary">
            Here's what's happening with your predictions.
          </p>
        </div>
        <Link to="/predict/create">
          <Button>
            <PlusCircle className="h-4 w-4" /> New prediction
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Active now" value={active ? "1" : "0"} />
        <StatCard label="Recent" value={String(totalPredictions)} />
        <StatCard
          label="Total points (recent)"
          value={recent.reduce((s, p) => s + p.totalPoints, 0).toLocaleString()}
        />
        <StatCard
          label="Total entries (recent)"
          value={recent.reduce((s, p) => s + p.totalParticipants, 0).toLocaleString()}
        />
      </div>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-text-primary">Live prediction</h2>
        {active === undefined ? (
          <SkeletonCard />
        ) : active ? (
          <PredictionCard prediction={active} onChanged={setActive} refetch={load} />
        ) : (
          <EmptyState
            icon={<Radio className="h-6 w-6" />}
            title="No prediction is running"
            description="Start one and it'll show up here, updating live as your chat joins in."
            actionLabel="Create a prediction"
            onAction={() => (window.location.href = "/predict/create")}
          />
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-text-primary">Recent activity</h2>
          <Link to="/predict/history" className="font-ui text-sm font-semibold text-accent hover:underline">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="font-body text-sm text-text-muted">Nothing here yet — your history will build up over time.</p>
        ) : (
          <ul className="space-y-2">
            {recent.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/predict/${p.id}`}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 hover:border-accent"
                >
                  <span className="truncate font-ui text-sm font-semibold text-text-primary">{p.question}</span>
                  <span className="shrink-0 font-body text-xs text-text-muted">{p.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="font-display text-2xl font-extrabold text-text-primary">{value}</p>
      <p className="mt-1 font-ui text-xs font-medium text-text-secondary">{label}</p>
    </div>
  );
}
