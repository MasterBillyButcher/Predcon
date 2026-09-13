import type { OutcomeColor } from "../types";

// Tailwind's build-time scanner needs full class strings, not
// interpolated ones, so every combination is spelled out here rather than
// built with template literals at each call site.
export const outcomeBg: Record<OutcomeColor, string> = {
  blue: "bg-outcome-blue",
  pink: "bg-outcome-pink",
  teal: "bg-outcome-teal",
  amber: "bg-outcome-amber",
};

export const outcomeText: Record<OutcomeColor, string> = {
  blue: "text-outcome-blue",
  pink: "text-outcome-pink",
  teal: "text-outcome-teal",
  amber: "text-outcome-amber",
};

export const outcomeBorder: Record<OutcomeColor, string> = {
  blue: "border-outcome-blue",
  pink: "border-outcome-pink",
  teal: "border-outcome-teal",
  amber: "border-outcome-amber",
};

export const OUTCOME_COLOR_ORDER: OutcomeColor[] = ["blue", "pink", "teal", "amber"];
