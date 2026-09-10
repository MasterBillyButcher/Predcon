import { useState } from "react";
import { Button } from "../ui/Button";
import { api, ApiRequestError } from "../../lib/api";
import { useToastStore } from "../../store/toastStore";
import type { Prediction } from "../../types";
import { outcomeBg, outcomeBorder } from "../../lib/colors";
import clsx from "clsx";

/**
 * The viewer-facing entry form. Shown while a prediction is ACTIVE. The
 * server is the final word on validity (min/max points, duplicate entry,
 * lock races) -- this form's own checks exist only to give immediate field
 * -level feedback before a round trip.
 */
export function JoinPanel({
  prediction,
  onChanged,
}: {
  prediction: Prediction;
  onChanged: (updated: Prediction) => void;
}) {
  const [outcomeId, setOutcomeId] = useState<string | null>(null);
  const [points, setPoints] = useState(String(prediction.minPoints));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [joined, setJoined] = useState(false);
  const push = useToastStore((s) => s.push);

  const pointsNum = Number(points);
  const localError =
    !points || Number.isNaN(pointsNum)
      ? "Enter a points amount"
      : pointsNum < prediction.minPoints
        ? `Minimum is ${prediction.minPoints}`
        : prediction.maxPoints && pointsNum > prediction.maxPoints
          ? `Maximum is ${prediction.maxPoints}`
          : null;

  async function submit() {
    if (!outcomeId || localError) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await api.post<Prediction>(`/predictions/${prediction.id}/join`, {
        outcomeId,
        points: pointsNum,
      });
      onChanged(updated);
      setJoined(true);
      push("You're in! Good luck.", "success");
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : "Couldn't join right now.";
      setError(message);
      push(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (joined) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/5 px-4 py-3 font-ui text-sm text-success">
        Entry locked in. Watch the bars update live as more people join.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface-2 p-4">
      <p className="font-ui text-sm font-semibold text-text-primary">Join this prediction</p>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {prediction.outcomes.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setOutcomeId(o.id)}
            className={clsx(
              "flex items-center gap-2 rounded-md border px-3 py-2 font-ui text-sm font-semibold transition-colors",
              outcomeId === o.id ? outcomeBorder[o.color] : "border-border hover:border-text-secondary",
            )}
          >
            <span className={clsx("h-2 w-2 rounded-full", outcomeBg[o.color])} aria-hidden />
            {o.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex-1 min-w-[140px]">
          <span className="mb-1 block font-ui text-xs font-medium text-text-secondary">Points</span>
          <input
            type="number"
            min={prediction.minPoints}
            max={prediction.maxPoints ?? undefined}
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            className="h-10 w-full rounded-md border border-border bg-bg px-3 font-body text-sm text-text-primary focus:border-accent"
          />
        </label>
        <Button onClick={submit} disabled={!outcomeId} loading={submitting}>
          Place entry
        </Button>
      </div>
      {(localError || error) && (
        <p className="font-ui text-xs text-danger" role="alert">
          {error ?? localError}
        </p>
      )}
    </div>
  );
}
