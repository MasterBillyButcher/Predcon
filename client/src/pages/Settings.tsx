import { useState } from "react";
import { User as UserIcon, ExternalLink, ShieldCheck } from "lucide-react";
import { TwitchIcon } from "../components/ui/TwitchIcon";
import { useAuthStore } from "../store/authStore";
import { Button } from "../components/ui/Button";
import { UserManagementPanel } from "../components/admin/UserManagementPanel";

export function Settings() {
  const { user, twitchConfigured } = useAuthStore();
  const [overlayId, setOverlayId] = useState("");

  return (
    <div className="max-w-xl space-y-8">
      <h1 className="font-display text-2xl font-extrabold text-text-primary">Settings</h1>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-text-primary">
          <UserIcon className="h-4 w-4 text-accent" /> Account
        </h2>
        <dl className="space-y-3 font-body text-sm">
          <Row label="Display name" value={user?.displayName ?? "—"} />
          <Row label="Username" value={user?.username ?? "—"} />
          <Row label="Account type" value={user?.isDemo ? "Demo account" : "Twitch account"} />
          <Row
            label="Role"
            value={user?.role === "SUPER_ADMIN" ? "Super Admin" : user?.role === "ADMIN" ? "Admin" : "User"}
          />
        </dl>
      </section>

      {user?.role === "SUPER_ADMIN" && (
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-text-primary">
            <ShieldCheck className="h-4 w-4 text-accent" /> User management
          </h2>
          <p className="mb-4 font-body text-sm text-text-secondary">
            Promote a signed-in user to Admin so they can create and manage predictions, or remove
            that access.
          </p>
          <UserManagementPanel />
        </section>
      )}

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-text-primary">
          <TwitchIcon className="h-4 w-4 text-accent" /> Twitch connection
        </h2>
        <p className="font-body text-sm text-text-secondary">
          {twitchConfigured
            ? "Twitch OAuth is configured on this server."
            : "Twitch OAuth isn't configured on this server yet. Set TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, and TWITCH_REDIRECT_URI in the server's .env, then connect from the login screen."}
        </p>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 font-display text-base font-bold text-text-primary">OBS overlay</h2>
        <p className="mb-3 font-body text-sm text-text-secondary">
          Paste a prediction ID to open its browser-source overlay. You can also open it from any
          prediction's detail page.
        </p>
        <div className="flex gap-2">
          <input
            value={overlayId}
            onChange={(e) => setOverlayId(e.target.value)}
            placeholder="Prediction ID"
            className="h-10 flex-1 rounded-lg border border-border bg-surface-2 px-3 font-body text-sm text-text-primary focus:border-accent"
          />
          <a href={overlayId ? `/overlay/${overlayId}` : undefined} target="_blank" rel="noreferrer">
            <Button variant="secondary" disabled={!overlayId}>
              <ExternalLink className="h-4 w-4" /> Open
            </Button>
          </a>
        </div>
        <p className="mt-3 font-ui text-xs text-text-muted">
          Query params: <code>?theme=dark|light</code>, <code>?transparent=true</code>,{" "}
          <code>?compact=true</code>
        </p>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="font-semibold text-text-primary">{value}</dd>
    </div>
  );
}
