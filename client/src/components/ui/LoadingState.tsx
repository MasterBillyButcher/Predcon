import { Loader2 } from "lucide-react";

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-text-secondary">
      <Loader2 className="h-6 w-6 animate-spin text-accent" aria-hidden />
      <p className="font-ui text-sm">{label}</p>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 animate-pulse">
      <div className="h-4 w-1/3 rounded bg-surface-2 mb-4" />
      <div className="h-6 w-2/3 rounded bg-surface-2 mb-6" />
      <div className="h-10 w-full rounded bg-surface-2 mb-2" />
      <div className="h-10 w-full rounded bg-surface-2" />
    </div>
  );
}
