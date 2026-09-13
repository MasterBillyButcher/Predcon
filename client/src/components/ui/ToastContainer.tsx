import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useToastStore } from "../../store/toastStore";
import clsx from "clsx";

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const STYLES = {
  success: "border-success/30 text-success",
  error: "border-danger/30 text-danger",
  info: "border-accent/30 text-accent",
};

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6">
      {toasts.map((t) => {
        const Icon = ICONS[t.variant];
        return (
          <div
            key={t.id}
            role="status"
            className={clsx(
              "flex items-start gap-3 rounded-lg border bg-surface px-4 py-3 shadow-lg animate-fade-in",
              STYLES[t.variant],
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p className="flex-1 font-ui text-sm text-text-primary">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="text-text-muted hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
