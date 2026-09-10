import { NavLink } from "react-router-dom";
import { Clock3, History, LayoutDashboard, PlusCircle, Radio, Settings } from "lucide-react";
import clsx from "clsx";
import { Logo } from "./Logo";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/predict", label: "Predict", icon: Radio, end: true },
  { to: "/predict/create", label: "Create", icon: PlusCircle, end: false },
  { to: "/predict/active", label: "Active", icon: Clock3, end: false },
  { to: "/predict/history", label: "History", icon: History, end: false },
  { to: "/settings", label: "Settings", icon: Settings, end: false },
];

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 md:flex">
      <div className="mb-8 flex items-center gap-2 px-2">
        <Logo />
        <span className="font-display text-lg font-extrabold tracking-tight text-text-primary">PredCon</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 font-ui text-sm font-semibold transition-colors",
                isActive
                  ? "bg-accent-soft text-accent"
                  : "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
              )
            }
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
