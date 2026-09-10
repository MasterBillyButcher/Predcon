import type { ReactNode } from "react";

export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="block">
        <span className="mb-1.5 block font-ui text-sm font-semibold text-text-primary">
          {label}
          {required && <span className="text-danger"> *</span>}
        </span>
        {children}
      </label>
      {hint && !error && <p className="mt-1 font-ui text-xs text-text-muted">{hint}</p>}
      {error && (
        <p className="mt-1 font-ui text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
