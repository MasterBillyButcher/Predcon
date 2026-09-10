import { useEffect, useState } from "react";

/**
 * Computes remaining time against a server timestamp, not the browser's own
 * decrementing counter, per the spec: remaining = endTimestamp -
 * serverAdjustedNow. `serverNow` is a timestamp string from the API
 * response taken at the same moment as `locksAt`, so the offset between
 * the browser clock and the server clock is captured once and reused.
 */
export function useCountdown(locksAt: string | null, serverNow: string | null) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    if (!locksAt || !serverNow) {
      setRemainingMs(null);
      return;
    }
    const clockOffset = Date.now() - new Date(serverNow).getTime();
    const end = new Date(locksAt).getTime();

    const tick = () => {
      const serverAdjustedNow = Date.now() - clockOffset;
      setRemainingMs(Math.max(0, end - serverAdjustedNow));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [locksAt, serverNow]);

  return remainingMs;
}

export function formatCountdown(ms: number | null): string {
  if (ms === null) return "--:--";
  const totalSecs = Math.ceil(ms / 1000);
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
