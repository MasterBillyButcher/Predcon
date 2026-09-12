import { useState } from "react";
import { Info, X } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

/**
 * Surfaces a real operational fact rather than hiding it: on a
 * free-tier/ephemeral deployment, DEMO_MODE data (this account, its
 * predictions, its history) does not survive a redeploy of the API. This
 * is not a bug — it's the honest consequence of running SQLite on a
 * stateless free-tier host — but a person clicking around a live demo has
 * no way to know that unless it's told to them directly.
 */
export function DemoDataBanner() {
  const user = useAuthStore((s) => s.user);
  const [dismissed, setDismissed] = useState(false);

  if (!user?.isDemo || dismissed) return null;

  return (
    <div
      role="status"
      className="flex items-start gap-2.5 border-b border-accent/20 bg-accent-soft px-4 py-2.5 sm:px-6"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
      <p className="flex-1 font-ui text-xs text-text-secondary sm:text-sm">
        You're on a shared demo account. Anything created here — predictions, entries, history — can
        be reset the next time this deployment updates, so don't rely on it sticking around.
      </p>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="shrink-0 text-text-muted hover:text-text-primary"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
