import clsx from "clsx";
import type { PredictionStatus } from "../../types";

const STYLES: Record<PredictionStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-surface-2 text-text-secondary border-border" },
  ACTIVE: { label: "Live", className: "bg-success/10 text-success border-success/30" },
  LOCKED: { label: "Locked", className: "bg-warning/10 text-warning border-warning/30" },
  RESOLVING: { label: "Resolving", className: "bg-accent/10 text-accent border-accent/30" },
  RESOLVED: { label: "Resolved", className: "bg-accent/10 text-accent border-accent/30" },
  CANCELLED: { label: "Cancelled", className: "bg-danger/10 text-danger border-danger/30" },
  EXPIRED: { label: "Expired", className: "bg-surface-2 text-text-muted border-border" },
};

export function StatusBadge({ status }: { status: PredictionStatus }) {
  const style = STYLES[status];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-ui font-semibold",
        style.className,
      )}
    >
      {status === "ACTIVE" && <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />}
      {style.label}
    </span>
  );
}
