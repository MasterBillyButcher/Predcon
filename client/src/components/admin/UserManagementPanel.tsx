import { useEffect, useState } from "react";
import { ShieldCheck, ShieldOff, Users as UsersIcon } from "lucide-react";
import clsx from "clsx";
import { api, ApiRequestError } from "../../lib/api";
import { Button } from "../ui/Button";
import { LoadingState } from "../ui/LoadingState";
import { ErrorState } from "../ui/ErrorState";
import { useToastStore } from "../../store/toastStore";
import type { User } from "../../types";

const ROLE_STYLE: Record<string, string> = {
  USER: "bg-surface-2 text-text-secondary",
  ADMIN: "bg-accent-soft text-accent",
  SUPER_ADMIN: "bg-accent-soft text-accent",
};

/**
 * Super Admin-only: promote a regular (Twitch or demo) account to Admin —
 * giving it prediction-management powers — or demote it back. The Super
 * Admin account itself never appears as actionable here; the server
 * rejects attempts to change its role regardless, but hiding the buttons
 * for it keeps the UI honest about what's actually possible.
 */
export function UserManagementPanel() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const push = useToastStore((s) => s.push);

  function load() {
    setError(null);
    api
      .get<User[]>("/admin/users")
      .then(setUsers)
      .catch(() => setError("Couldn't load users."));
  }

  useEffect(load, []);

  async function setRole(userId: string, action: "promote" | "demote") {
    setPendingId(userId);
    try {
      const updated = await api.post<User>(`/admin/users/${userId}/${action}`);
      setUsers((prev) => (prev ? prev.map((u) => (u.id === userId ? updated : u)) : prev));
      push(action === "promote" ? "User promoted to Admin." : "User demoted to regular user.", "success");
    } catch (err) {
      push(err instanceof ApiRequestError ? err.message : "That didn't work.", "error");
    } finally {
      setPendingId(null);
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!users) return <LoadingState label="Loading users..." />;

  return (
    <div className="space-y-2">
      {users.map((u) => (
        <div
          key={u.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate font-ui text-sm font-semibold text-text-primary">{u.displayName}</p>
            <p className="truncate font-body text-xs text-text-muted">@{u.username}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={clsx("rounded-full px-2 py-0.5 font-ui text-xs font-semibold", ROLE_STYLE[u.role])}>
              {u.role === "SUPER_ADMIN" ? "Super Admin" : u.role === "ADMIN" ? "Admin" : "User"}
            </span>
            {u.role === "USER" && (
              <Button size="sm" variant="secondary" loading={pendingId === u.id} onClick={() => setRole(u.id, "promote")}>
                <ShieldCheck className="h-3.5 w-3.5" /> Make Admin
              </Button>
            )}
            {u.role === "ADMIN" && (
              <Button size="sm" variant="ghost" loading={pendingId === u.id} onClick={() => setRole(u.id, "demote")}>
                <ShieldOff className="h-3.5 w-3.5" /> Remove Admin
              </Button>
            )}
          </div>
        </div>
      ))}
      {users.length === 0 && (
        <p className="flex items-center gap-2 font-body text-sm text-text-muted">
          <UsersIcon className="h-4 w-4" /> No users yet.
        </p>
      )}
    </div>
  );
}
