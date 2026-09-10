import { useCountdown, formatCountdown } from "../../lib/time";
import type { Prediction } from "../../types";
import clsx from "clsx";

export function PredictionTimer({ prediction }: { prediction: Prediction }) {
  const remainingMs = useCountdown(
    prediction.status === "ACTIVE" ? prediction.locksAt : null,
    prediction.serverNow,
  );

  if (prediction.status !== "ACTIVE") return null;

  const urgent = remainingMs !== null && remainingMs < 10_000;

  return (
    <div
      className={clsx(
        "flex items-center gap-2 rounded-lg border px-3 py-1.5 font-display text-lg font-bold tabular-nums tracking-wide",
        urgent ? "border-danger/40 text-danger" : "border-border text-text-primary",
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      {formatCountdown(remainingMs)}
    </div>
  );
}
