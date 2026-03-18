import { NavLink } from "react-router";
import {
  Home,
  LayoutGrid,
  Map,
  BarChart3,
  Users,
  Settings,
  Bell,
  Phone,
  Sparkles,
} from "lucide-react";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/portfolio", icon: LayoutGrid, label: "Portfolio" },
  { to: "/map", icon: Map, label: "Map" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  {
    to: "/succession",
    icon: Users,
    label: "Succession",
    badge: "Soon",
  },
];

export function Sidebar() {
  return (
    <div className="w-[280px] h-full bg-card border-r border-border flex flex-col shrink-0 font-['Inter',sans-serif]">
      {/* Logo */}
      <div className="h-[80px] flex items-center gap-3 px-6 border-b border-border">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <span className="text-primary-foreground text-[16px]">V</span>
        </div>
        <span className="text-foreground text-[16px]">Valgate</span>
      </div>

      {/* User */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border">
        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shrink-0">
          <span className="text-primary-foreground text-[16px]">JD</span>
        </div>
        <div className="flex flex-col">
          <span className="text-foreground text-[16px]">Jon Doe</span>
          <span className="text-muted-foreground text-[16px]">3 Members</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 px-3 pt-4 pb-3">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 h-11 px-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50"
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="flex-1 text-[16px]">{item.label}</span>
            {item.badge && (
              <span className="bg-[#DBEAFE] text-primary text-[14px] px-2 py-1 rounded-full">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}

        <div className="flex-1" />

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 h-11 px-3 rounded-lg transition-colors ${
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50"
            }`
          }
        >
          <Settings className="w-5 h-5" />
          <span className="text-[16px]">Settings</span>
        </NavLink>
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border p-3 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-accent">
            <Settings className="w-[18px] h-[18px] text-muted-foreground" />
          </button>
          <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-accent relative">
            <Bell className="w-[18px] h-[18px] text-muted-foreground" />
            <div className="absolute w-2 h-2 bg-destructive rounded-full top-1 right-1.5" />
          </button>
          <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-accent relative">
            <Phone className="w-[18px] h-[18px] text-muted-foreground" />
            <div className="absolute w-2 h-2 bg-[#059669] rounded-full bottom-1 right-1.5" />
          </button>
        </div>

        <div className="border border-border rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-foreground text-[16px]">Valgate Intelligence</span>
          </div>
          <p className="text-muted-foreground text-[16px]">
            AI-powered insights for your portfolio
          </p>
        </div>
      </div>
    </div>
  );
}