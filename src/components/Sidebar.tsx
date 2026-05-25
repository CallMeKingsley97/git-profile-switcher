import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  History as HistoryIcon,
  Settings as SettingsIcon,
  GitBranch,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "仪表盘", icon: LayoutDashboard, end: true },
  { to: "/profiles", label: "Profiles", icon: Users },
  { to: "/ssh", label: "SSH Keys", icon: KeyRound },
  { to: "/history", label: "历史", icon: HistoryIcon },
  { to: "/settings", label: "设置", icon: SettingsIcon },
];

export default function Sidebar() {
  return (
    <aside className="relative flex w-60 shrink-0 flex-col border-r border-border/60 bg-sidebar/80 backdrop-blur-xl">
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 shadow-soft">
          <GitBranch className="h-[18px] w-[18px] text-white" strokeWidth={2.5} />
          <span className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-t from-transparent to-white/20" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[13px] font-semibold tracking-tight">
            Git Profile
          </span>
          <span className="text-[11px] text-muted-foreground">Switcher</span>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 pt-2">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200",
                isActive
                  ? "bg-card text-foreground shadow-soft-sm"
                  : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                    isActive
                      ? "bg-gradient-to-br from-primary to-blue-600 text-white shadow-[0_2px_6px_-1px_hsl(var(--primary)/0.4)]"
                      : "bg-muted/60 text-muted-foreground group-hover:bg-muted",
                  )}
                >
                  <l.icon className="h-[15px] w-[15px]" strokeWidth={2.2} />
                </span>
                <span>{l.label}</span>
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 pb-4 pt-3">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground/80">
          <span>v0.0.1</span>
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-pulse-ring" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Connected
          </span>
        </div>
      </div>
    </aside>
  );
}
