import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { LoadingState } from "./ui/LoadingState";
import type { ReactNode } from "react";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status);

  if (status === "idle" || status === "loading") {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingState label="Loading PredCon..." />
      </div>
    );
  }
  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
