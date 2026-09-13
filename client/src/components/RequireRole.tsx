import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import type { UserRole } from "../types";
import { LoadingState } from "./ui/LoadingState";
import { Button } from "./ui/Button";

/**
 * Gates a page to specific roles. Unlike ProtectedRoute (which redirects
 * to /login), this renders an explanatory in-place message for a signed-in
 * user with the wrong role — "you're logged in, just not allowed here" is
 * a different situation from "you're not logged in at all", and deserves a
 * different message rather than bouncing them to the login screen they
 * already got past.
 */
export function RequireRole({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const { status, user } = useAuthStore();

  if (status === "idle" || status === "loading") {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingState label="Loading..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 px-6 text-center">
        <ShieldAlert className="h-6 w-6 text-text-muted" aria-hidden />
        <h3 className="font-display text-lg font-bold text-text-primary">Sign in required</h3>
        <p className="max-w-sm font-body text-sm text-text-secondary">
          You need to sign in to do that.
        </p>
        <Link to="/login">
          <Button className="mt-2">Sign in</Button>
        </Link>
      </div>
    );
  }

  if (!roles.includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 px-6 text-center">
        <ShieldAlert className="h-6 w-6 text-text-muted" aria-hidden />
        <h3 className="font-display text-lg font-bold text-text-primary">Admins only</h3>
        <p className="max-w-sm font-body text-sm text-text-secondary">
          Your account doesn't have permission to view this page.
        </p>
        <Link to="/predict">
          <Button variant="secondary" className="mt-2">Back to Predict</Button>
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
