import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PlusCircle, Radio } from "lucide-react";
import { api } from "../lib/api";
import type { Prediction } from "../types";
import { PredictionCard } from "../components/prediction/PredictionCard";
import { SkeletonCard } from "../components/ui/LoadingState";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Button } from "../components/ui/Button";

/**
 * The main prediction console. Mirrors what a creator sees moment-to-moment
 * on the reference product's /predict route: the live prediction front and
 * center, with recent context below so nothing feels orphaned.
 */
export function Predict() {
  const [active, setActive] = useState<Prediction | null | undefined>(undefined);
  const [recent, setRecent] = useState<Prediction[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [activeRes, allRes] = await Promise.all([
        api.get<Prediction | null>("/predictions/active"),
        api.get<Prediction[]>("/predictions?status=ALL"),
      ]);
      setActive(activeRes);
      setRecent(allRes.filter((p) => p.id !== activeRes?.id).slice(0, 5));
    } catch {
      setError("Couldn't load your predictions right now.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-extrabold text-text-primary">Predict</h1>
        <Link to="/predict/create">
          <Button>
            <PlusCircle className="h-4 w-4" /> New prediction
          </Button>
        </Link>
      </div>

      {active === undefined ? (
        <SkeletonCard />
      ) : active ? (
        <PredictionCard prediction={active} onChanged={setActive} refetch={load} />
      ) : (
        <EmptyState
          icon={<Radio className="h-6 w-6" />}
          title="Nothing's live right now"
          description="Create a prediction to get chat voting — it'll appear here the moment it starts."
          actionLabel="Create a prediction"
          onAction={() => (window.location.href = "/predict/create")}
        />
      )}

      {recent.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-lg font-bold text-text-primary">Recently wrapped up</h2>
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
        </section>
      )}
    </div>
  );
}
