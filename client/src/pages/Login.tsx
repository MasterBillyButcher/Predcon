import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { TwitchIcon } from "../components/ui/TwitchIcon";
import { useAuthStore } from "../store/authStore";
import { Button } from "../components/ui/Button";
import { Logo } from "../components/layout/Logo";
import { useToastStore } from "../store/toastStore";
import { ApiRequestError } from "../lib/api";

export function Login() {
  const { status, twitchConfigured, loginDemo, loginSuperAdmin } = useAuthStore();
  const push = useToastStore((s) => s.push);
  const [submitting, setSubmitting] = useState(false);

  const [showSuperAdmin, setShowSuperAdmin] = useState(false);
  const [password, setPassword] = useState("");
  const [superAdminError, setSuperAdminError] = useState<string | null>(null);
  const [superAdminSubmitting, setSuperAdminSubmitting] = useState(false);

  if (status === "authenticated") return <Navigate to="/" replace />;

  async function handleDemoLogin() {
    setSubmitting(true);
    try {
      await loginDemo();
    } catch {
      push("Couldn't start the demo session. Try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSuperAdminLogin(e: FormEvent) {
    e.preventDefault();
    setSuperAdminError(null);
    setSuperAdminSubmitting(true);
    try {
      await loginSuperAdmin(password);
    } catch (err) {
      setSuperAdminError(err instanceof ApiRequestError ? err.message : "Couldn't sign in.");
    } finally {
      setSuperAdminSubmitting(false);
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 text-center animate-fade-in">
        <div className="mb-6 flex justify-center">
          <Logo className="h-12 w-12" />
        </div>
        <h1 className="font-display text-2xl font-extrabold text-text-primary">PredCon</h1>
        <p className="mt-2 font-body text-sm text-text-secondary">
          Create and manage interactive predictions for your stream.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Button
            size="lg"
            className="bg-[#9146FF] hover:bg-[#7c3aed]"
            disabled={!twitchConfigured}
            onClick={() => (window.location.href = "/api/auth/twitch")}
          >
            <TwitchIcon className="h-4 w-4" /> Continue with Twitch
          </Button>
          {!twitchConfigured && (
            <p className="font-ui text-xs text-text-muted">
              Twitch sign-in needs TWITCH_CLIENT_ID/SECRET configured on the server.
            </p>
          )}
          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-border" />
            <span className="font-ui text-xs text-text-muted">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <Button size="lg" variant="secondary" onClick={handleDemoLogin} loading={submitting}>
            Try the demo
          </Button>
        </div>

        <div className="mt-6 border-t border-border pt-4 text-left">
          <button
            type="button"
            onClick={() => setShowSuperAdmin((v) => !v)}
            className="mx-auto flex items-center gap-1.5 font-ui text-xs font-medium text-text-muted hover:text-text-secondary"
          >
            <Lock className="h-3 w-3" /> Super Admin sign-in
          </button>
          {showSuperAdmin && (
            <form onSubmit={handleSuperAdminLogin} className="mt-3 space-y-2 animate-fade-in">
              <label className="block">
                <span className="sr-only">Super Admin password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 font-body text-sm text-text-primary focus:border-accent"
                />
              </label>
              {superAdminError && (
                <p className="font-ui text-xs text-danger" role="alert">
                  {superAdminError}
                </p>
              )}
              <Button type="submit" variant="secondary" size="sm" className="w-full" loading={superAdminSubmitting}>
                Sign in
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
