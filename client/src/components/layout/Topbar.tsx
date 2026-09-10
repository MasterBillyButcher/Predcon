import { LogOut } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { Button } from "../ui/Button";

export function Topbar() {
  const { user, logout } = useAuthStore();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-4 sm:px-6">
      <p className="font-body text-sm text-text-secondary">
        Signed in as <span className="font-semibold text-text-primary">{user?.displayName}</span>
        {user?.isDemo && (
          <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-ui font-semibold text-accent">
            Demo mode
          </span>
        )}
      </p>
      <Button variant="ghost" size="sm" onClick={() => logout()}>
        <LogOut className="h-4 w-4" /> Log out
      </Button>
    </header>
  );
}
