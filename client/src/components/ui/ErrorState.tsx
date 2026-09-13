import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-danger/30 bg-danger/5 py-16 px-6 text-center">
      <AlertTriangle className="h-6 w-6 text-danger" aria-hidden />
      <p className="max-w-sm font-body text-sm text-text-secondary">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
