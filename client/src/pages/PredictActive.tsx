import { useCallback, useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { api } from "../lib/api";
import type { Prediction } from "../types";
import { PredictionCard } from "../components/prediction/PredictionCard";
import { SkeletonCard } from "../components/ui/LoadingState";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";

export function PredictActive() {
  const [active, setActive] = useState<Prediction | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setActive(await api.get<Prediction | null>("/predictions/active"));
    } catch {
      setError("Couldn't load the active prediction.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold text-text-primary">Active prediction</h1>
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : active === undefined ? (
        <SkeletonCard />
      ) : active ? (
        <PredictionCard prediction={active} onChanged={setActive} refetch={load} />
      ) : (
        <EmptyState
          icon={<Clock3 className="h-6 w-6" />}
          title="No prediction is running"
          description="Once you start one from the Create page, manage it live here — lock it, resolve it, and watch entries roll in."
          actionLabel="Create a prediction"
          onAction={() => (window.location.href = "/predict/create")}
        />
      )}
    </div>
  );
}
