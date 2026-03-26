import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  LayoutGrid,
  BarChart2,
  Users,
  Settings,
  Sun,
  Moon,
  Key,
  Sparkles,
} from "lucide-react";
import { cn } from "../ui/utils";

const sidebarNavItems = [
  { label: "Home", path: "/", icon: Home },
  { label: "Portfolio", path: "/portfolio", icon: LayoutGrid },
  { label: "Rental", path: "/rental", icon: Key },
  { label: "Analytics", path: "/analytics", icon: BarChart2 },
  { label: "Succession", path: "/succession", icon: Users },
  { label: "Settings", path: "/settings", icon: Settings },
] as const;

interface SidebarProps {
  isDark: boolean;
  onToggleDark: () => void;
  onOpenAI: () => void;
}

export function Sidebar({ isDark, onToggleDark, onOpenAI }: SidebarProps) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-surface-base border-r border-border-default z-20 shrink-0 transition-all duration-200",
        expanded ? "w-52" : "w-16",
      )}
    >
      {/* Toggle button */}
      <div className="flex items-center justify-center h-12 border-b border-border-default shrink-0">
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1.5 rounded-lg text-secondary hover:bg-surface-tint hover:text-foreground transition-colors"
        >
          {expanded ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </button>
      </div>

      {/* Logo */}
      <div className={cn(
        "flex items-center h-14 border-b border-border-default shrink-0 gap-3",
        expanded ? "px-3" : "justify-center px-0",
      )}>
        <svg
          viewBox="0 0 132.863 106.124"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-8 shrink-0"
          style={{ height: "calc(2rem * 106.124 / 132.863)" }}
          aria-hidden="true"
        >
          <path d="M98.3597 74.7352L132.863 40.8166L107.951 0H24.9114L23.9449 1.58278L98.3597 74.7352Z" fill="#006AFF" />
          <path d="M82.538 90.2886L90.5536 82.4087L18.0925 11.1724L12.0791 21.0228L82.538 90.2886Z" fill="#006AFF" />
          <path d="M6.22795 30.6128L2.61289e-07 40.817L66.4315 106.124L74.7354 97.9602L6.22795 30.6128Z" fill="#006AFF" />
        </svg>
        {expanded && (
          <span
            className="text-base text-foreground truncate"
            style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 700, letterSpacing: "0.05em" }}
          >
            Valgate
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-1 px-2 py-3 flex-1">
        {sidebarNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.path);
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex items-center gap-3 h-11 px-3 rounded-xl text-sm transition-colors",
                isActive
                  ? "bg-surface-tint text-foreground font-medium"
                  : "text-secondary hover:bg-surface-tint hover:text-foreground",
                !expanded && "justify-center px-0",
              )}
              title={!expanded ? item.label : undefined}
            >
              <Icon className="size-5 shrink-0" />
              {expanded && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}

        {/* AI Overlay button */}
        <div className="mt-auto pt-3">
          <button
            onClick={onOpenAI}
            className={cn(
              "ai-overlay-btn flex items-center gap-2.5 h-[52px] text-sm w-full",
              expanded ? "rounded-[50px] px-4" : "rounded-[50px] justify-center",
            )}
            title={!expanded ? "AI Overlay" : undefined}
          >
            <Sparkles className="ai-icon size-5 shrink-0" />
            {expanded && <span className="font-semibold tracking-wide">AI Overlay</span>}
          </button>
        </div>
      </nav>

      {/* Dark mode + user avatar */}
      <div className="border-t border-border-default px-2 py-3 flex flex-col gap-2">
        <button
          onClick={onToggleDark}
          className={cn(
            "flex items-center gap-3 h-11 px-3 rounded-xl text-sm text-secondary hover:bg-surface-tint hover:text-foreground transition-colors",
            !expanded && "justify-center px-0",
          )}
          title={!expanded ? (isDark ? "Light mode" : "Dark mode") : undefined}
        >
          {isDark ? (
            <Sun className="size-5 shrink-0" />
          ) : (
            <Moon className="size-5 shrink-0" />
          )}
          {expanded && <span>{isDark ? "Light mode" : "Dark mode"}</span>}
        </button>
        <button
          onClick={() => navigate("/profile")}
          className={cn(
            "flex items-center gap-3 px-3 py-1 rounded-xl hover:bg-surface-tint transition-colors w-full",
            !expanded && "justify-center px-0",
            location.pathname === "/profile" && "bg-surface-tint",
          )}
          title={!expanded ? "Profile" : undefined}
        >
          <div className="w-8 h-8 rounded-full bg-interactive-primary flex items-center justify-center shrink-0">
            <span className="text-xs font-medium text-white">JD</span>
          </div>
          {expanded && (
            <div className="min-w-0 text-left">
              <p className="text-sm font-medium text-foreground truncate">
                John Doe
              </p>
              <p className="text-xs text-secondary truncate">Owner</p>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
