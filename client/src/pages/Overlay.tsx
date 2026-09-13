import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import clsx from "clsx";
import type { Prediction } from "../types";
import { outcomeBg } from "../lib/colors";
import { usePredictionSocket } from "../lib/socket";
import { useCountdown, formatCountdown } from "../lib/time";

/**
 * Read-only browser-source view for OBS. No auth UI, no chrome, and every
 * visual is driven by query params so a streamer can tune it once in OBS
 * and forget about it: ?theme=dark|light  ?transparent=true  ?compact=true
 */
export function Overlay() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [connected, setConnected] = useState(true);

  const theme = searchParams.get("theme") === "light" ? "light" : "dark";
  const transparent = searchParams.get("transparent") === "true";
  const compact = searchParams.get("compact") === "true";

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/overlay/${id}`);
      const json = await res.json();
      if (json.success) {
        setPrediction(json.data);
        setConnected(true);
      } else {
        setConnected(false);
      }
    } catch {
      setConnected(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000); // fallback poll alongside realtime, for resilience
    return () => clearInterval(interval);
  }, [load]);

  usePredictionSocket(id, load);

  const remainingMs = useCountdown(
    prediction?.status === "ACTIVE" ? prediction.locksAt : null,
    prediction?.serverNow ?? null,
  );

  if (!prediction) {
    return (
      <div className={clsx("flex h-screen items-center justify-center", transparent ? "bg-transparent" : "bg-bg")}>
        {!connected && (
          <p className="font-ui text-sm text-text-muted">Reconnecting to PredCon...</p>
        )}
      </div>
    );
  }

  const dark = theme === "dark";

  return (
    <div
      className={clsx(
        "flex h-screen items-start justify-center p-4",
        transparent ? "bg-transparent" : dark ? "bg-bg" : "bg-white",
      )}
    >
      <div
        className={clsx(
          "w-full overflow-hidden rounded-2xl border shadow-2xl",
          compact ? "max-w-md" : "max-w-xl",
          dark ? "border-border bg-surface/95" : "border-gray-200 bg-white/95",
        )}
        style={{ backdropFilter: transparent ? "blur(6px)" : undefined }}
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-4">
          <h2
            className={clsx(
              "font-display font-bold leading-snug",
              compact ? "text-base" : "text-xl",
              dark ? "text-text-primary" : "text-gray-900",
            )}
          >
            {prediction.question}
          </h2>
          {prediction.status === "ACTIVE" && (
            <span className={clsx("shrink-0 font-display font-bold tabular-nums", dark ? "text-text-primary" : "text-gray-900")}>
              {formatCountdown(remainingMs)}
            </span>
          )}
        </div>

        <div className={clsx("space-y-2 px-5 pb-5", compact ? "pt-3" : "pt-4")}>
          {prediction.outcomes.map((o) => (
            <div
              key={o.id}
              className={clsx(
                "relative overflow-hidden rounded-lg border",
                dark ? "border-border" : "border-gray-200",
                prediction.status === "RESOLVED" && o.id !== prediction.winningOutcomeId && "opacity-50",
              )}
            >
              <div
                className={clsx("absolute inset-y-0 left-0 opacity-25 transition-all duration-500", outcomeBg[o.color])}
                style={{ width: `${o.percentage}%` }}
              />
              <div className="relative flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className={clsx("h-2.5 w-2.5 rounded-full", outcomeBg[o.color])} />
                  <span
                    className={clsx(
                      "font-ui font-semibold",
                      compact ? "text-xs" : "text-sm",
                      dark ? "text-text-primary" : "text-gray-900",
                    )}
                  >
                    {o.label}
                  </span>
                </div>
                <span className={clsx("font-display font-bold", compact ? "text-xs" : "text-sm", dark ? "text-text-primary" : "text-gray-900")}>
                  {o.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
