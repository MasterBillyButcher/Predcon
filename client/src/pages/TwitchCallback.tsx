import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LoadingState } from "../components/ui/LoadingState";
import { useAuthStore } from "../store/authStore";

// The server completes the actual token exchange and redirects here with a
// session cookie already set (see /api/auth/twitch/callback). This page
// just needs to refresh client auth state and continue into the app.
export function TwitchCallback() {
  const navigate = useNavigate();
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    bootstrap().finally(() => navigate("/", { replace: true }));
  }, [bootstrap, navigate]);

  return (
    <div className="flex h-full items-center justify-center">
      <LoadingState label="Completing sign-in..." />
    </div>
  );
}
