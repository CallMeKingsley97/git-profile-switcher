import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  History as HistoryIcon,
  Settings as SettingsIcon,
  GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "仪表盘", icon: LayoutDashboard, end: true },
  { to: "/profiles", label: "Profiles", icon: Users },
  { to: "/history", label: "历史", icon: HistoryIcon },
  { to: "/settings", label: "设置", icon: SettingsIcon },
];

export default function Sidebar() {
  return (
    <aside className="flex w-56 flex-col border-r bg-muted/30">
      <div className="flex items-center gap-2 border-b px-4 py-4">
        <GitBranch className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold">Git Profile Switcher</span>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground",
              )
            }
          >
            <l.icon className="h-4 w-4" />
            <span>{l.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="border-t px-4 py-3 text-xs text-muted-foreground">
        v0.0.1
      </div>
    </aside>
  );
}
