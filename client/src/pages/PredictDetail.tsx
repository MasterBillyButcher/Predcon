import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { api, ApiRequestError } from "../lib/api";
import type { Prediction } from "../types";
import { PredictionCard } from "../components/prediction/PredictionCard";
import { LoadingState } from "../components/ui/LoadingState";
import { ErrorState } from "../components/ui/ErrorState";

export function PredictDetail() {
  const { id } = useParams<{ id: string }>();
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      setPrediction(await api.get<Prediction>(`/predictions/${id}`));
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) setNotFound(true);
      else setError("Couldn't load this prediction.");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (notFound) {
    return (
      <ErrorState message="This prediction doesn't exist, or you don't have access to it." />
    );
  }
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!prediction) return <LoadingState label="Loading prediction..." />;

  return (
    <div className="space-y-4">
      <Link to="/predict" className="inline-flex items-center gap-1.5 font-ui text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to predict
      </Link>
      <PredictionCard prediction={prediction} onChanged={setPrediction} refetch={load} />
      <a
        href={`/overlay/${prediction.id}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 font-ui text-sm font-semibold text-accent hover:underline"
      >
        <ExternalLink className="h-4 w-4" /> Open OBS overlay
      </a>
    </div>
  );
}
