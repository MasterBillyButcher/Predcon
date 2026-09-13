import clsx from "clsx";
import { Check } from "lucide-react";
import type { Outcome, PredictionStatus } from "../../types";
import { outcomeBg, outcomeBorder } from "../../lib/colors";

interface PredictionOptionProps {
  outcome: Outcome;
  status: PredictionStatus;
  winningOutcomeId: string | null;
  selected?: boolean;
  selectable?: boolean;
  onSelect?: () => void;
}

export function PredictionOption({
  outcome,
  status,
  winningOutcomeId,
  selected,
  selectable,
  onSelect,
}: PredictionOptionProps) {
  const isWinner = winningOutcomeId === outcome.id;
  const isResolved = status === "RESOLVED";
  const dimmed = isResolved && !isWinner;

  return (
    <button
      type="button"
      disabled={!selectable}
      onClick={onSelect}
      className={clsx(
        "group relative w-full overflow-hidden rounded-lg border text-left transition-all",
        selectable ? "cursor-pointer hover:border-text-secondary" : "cursor-default",
        selected ? outcomeBorder[outcome.color] : "border-border",
        dimmed && "opacity-50",
      )}
    >
      {/* Fill bar represents this outcome's share of total points */}
      <div
        className={clsx("absolute inset-y-0 left-0 animate-bar-grow opacity-20", outcomeBg[outcome.color])}
        style={{ width: `${outcome.percentage}%` }}
        aria-hidden
      />
      <div className="relative flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={clsx("h-2.5 w-2.5 shrink-0 rounded-full", outcomeBg[outcome.color])} aria-hidden />
          <span className="truncate font-ui text-sm font-semibold text-text-primary">{outcome.label}</span>
          {isWinner && (
            <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
              <Check className="h-3 w-3" /> Winner
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3 font-body text-xs text-text-secondary">
          <span>{outcome.participants} in</span>
          <span className="font-display font-bold text-text-primary">{outcome.percentage}%</span>
        </div>
      </div>
    </button>
  );
}
