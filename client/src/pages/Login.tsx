import { useState } from "react";
import { Navigate } from "react-router-dom";
import { TwitchIcon } from "../components/ui/TwitchIcon";
import { useAuthStore } from "../store/authStore";
import { Button } from "../components/ui/Button";
import { Logo } from "../components/layout/Logo";
import { useToastStore } from "../store/toastStore";

export function Login() {
  const { status, twitchConfigured, loginDemo } = useAuthStore();
  const push = useToastStore((s) => s.push);
  const [submitting, setSubmitting] = useState(false);

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
      </div>
    </div>
  );
}
