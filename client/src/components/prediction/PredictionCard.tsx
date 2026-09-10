import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import type { Prediction } from "../../types";
import { StatusBadge } from "../ui/StatusBadge";
import { PredictionTimer } from "./PredictionTimer";
import { PredictionOption } from "./PredictionOption";
import { PredictionControls } from "./PredictionControls";
import { JoinPanel } from "./JoinPanel";
import { usePredictionSocket } from "../../lib/socket";
import { useCallback } from "react";

interface PredictionCardProps {
  prediction: Prediction;
  onChanged: (updated: Prediction) => void;
  refetch?: () => void;
  interactive?: boolean;
  linkToDetail?: boolean;
}

export function PredictionCard({
  prediction,
  onChanged,
  refetch,
  interactive = true,
  linkToDetail = false,
}: PredictionCardProps) {
  const handleRealtimeEvent = useCallback(() => refetch?.(), [refetch]);
  usePredictionSocket(prediction.id, handleRealtimeEvent);

  const question = (
    <h3 className="font-display text-lg font-bold leading-snug text-text-primary sm:text-xl">
      {prediction.question}
    </h3>
  );

  return (
    <article className="animate-fade-in rounded-xl border border-border bg-surface p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {prediction.title && (
            <p className="mb-1 font-ui text-xs font-semibold uppercase tracking-wide text-text-muted">
              {prediction.title}
            </p>
          )}
          {linkToDetail ? (
            <Link to={`/predict/${prediction.id}`} className="hover:text-accent">
              {question}
            </Link>
          ) : (
            question
          )}
          {prediction.description && (
            <p className="mt-1 font-body text-sm text-text-secondary">{prediction.description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={prediction.status} />
          <PredictionTimer prediction={prediction} />
        </div>
      </div>

      <div className="space-y-2">
        {prediction.outcomes.map((outcome) => (
          <PredictionOption
            key={outcome.id}
            outcome={outcome}
            status={prediction.status}
            winningOutcomeId={prediction.winningOutcomeId}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center gap-1.5 font-body text-xs text-text-muted">
        <Users className="h-3.5 w-3.5" aria-hidden />
        {prediction.totalParticipants} participant{prediction.totalParticipants === 1 ? "" : "s"} ·{" "}
        {prediction.totalPoints.toLocaleString()} points
      </div>

      {interactive && prediction.status === "ACTIVE" && (
        <div className="mt-4">
          <JoinPanel prediction={prediction} onChanged={onChanged} />
        </div>
      )}

      {interactive && (
        <div className="mt-4 border-t border-border pt-4">
          <PredictionControls prediction={prediction} onChanged={onChanged} />
        </div>
      )}
    </article>
  );
}
