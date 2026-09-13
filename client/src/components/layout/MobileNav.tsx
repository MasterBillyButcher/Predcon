import { NavLink } from "react-router-dom";
import { Clock3, History, LayoutDashboard, PlusCircle, Radio } from "lucide-react";
import clsx from "clsx";
import { useAuthStore } from "../../store/authStore";

const ITEMS = [
  { to: "/", label: "Home", icon: LayoutDashboard, end: true, roles: null },
  { to: "/predict", label: "Predict", icon: Radio, end: true, roles: null },
  { to: "/predict/create", label: "Create", icon: PlusCircle, end: false, roles: ["ADMIN", "SUPER_ADMIN"] },
  { to: "/predict/active", label: "Active", icon: Clock3, end: false, roles: null },
  { to: "/predict/history", label: "History", icon: History, end: false, roles: null },
] as const;

export function MobileNav() {
  const role = useAuthStore((s) => s.user?.role);

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {ITEMS.filter((item) => !item.roles || (role && (item.roles as readonly string[]).includes(role))).map(
        ({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                "flex flex-1 flex-col items-center gap-1 py-2.5 font-ui text-[11px] font-semibold",
                isActive ? "text-accent" : "text-text-muted",
              )
            }
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </NavLink>
        ),
      )}
    </nav>
  );
}
