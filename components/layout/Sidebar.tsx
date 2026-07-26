"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser, useOrganization, useClerk } from "@clerk/nextjs";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  LayoutGrid,
  BarChart2,
  Settings,
  Sun,
  Moon,
  Key,
  LogOut,
} from "lucide-react";
import { cn } from "../ui/utils";

// Maps a Clerk org role ("org:admin") to a friendly label ("Admin").
function roleLabel(role: string | null | undefined): string {
  if (!role) return "";
  const bare = role.replace(/^org:/, "");
  return bare.charAt(0).toUpperCase() + bare.slice(1);
}

const sidebarNavItems = [
  { label: "Home", path: "/", icon: Home },
  { label: "Portfolio", path: "/portfolio", icon: LayoutGrid },
  { label: "Rental", path: "/rental", icon: Key },
  { label: "Analytics", path: "/analytics", icon: BarChart2 },
  { label: "Settings", path: "/settings", icon: Settings },
] as const;

interface SidebarProps {
  isDark: boolean;
  onToggleDark: () => void;
  /**
   * Render mode:
   * - "rail" (default): the desktop sidebar (collapsible w-16 ↔ w-52)
   * - "drawer": always-expanded for use inside a Sheet on phone
   */
  variant?: "rail" | "drawer";
  /**
   * Fires when the user activates a nav item. Used by the drawer variant so
   * the parent can close the Sheet on navigation.
   */
  onNavigate?: () => void;
}

export function Sidebar({
  isDark,
  variant = "rail",
  onNavigate,
}: SidebarProps) {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const { membership } = useOrganization();
  const { signOut } = useClerk();

  const displayName =
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress ||
    "Account";
  const initials =
    ((user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "")).toUpperCase() ||
    displayName.charAt(0).toUpperCase();
  const roleText = roleLabel(membership?.role);

  const isDrawer = variant === "drawer";
  // Drawer is always fully expanded; rail keeps the collapse toggle.
  const isExpanded = isDrawer || expanded;

  const handleNavigate = (path: string) => {
    router.push(path);
    onNavigate?.();
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-surface-base border-r border-border-default z-20 shrink-0",
        // Drawer: full width of the parent Sheet (which already constrains to
        // 85% / max 320px). Rail: animates between collapsed and expanded.
        isDrawer
          ? "w-full pt-safe pb-safe"
          : cn(
              "transition-all duration-200",
              isExpanded ? "w-52" : "w-16",
            ),
      )}
    >
      {/* Toggle button — rail only. Drawer is always expanded. */}
      {!isDrawer && (
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
      )}

      {/* Logo */}
      <div
        className={cn(
          "flex items-center h-14 border-b border-border-default shrink-0 gap-3",
          isExpanded ? "px-3" : "justify-center px-0",
        )}
      >
        <svg
          viewBox="0 0 32.5889 25.0687"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-8 h-7 shrink-0"
          aria-hidden="true"
        >
          <path
            d="M24.126 17.654L32.5889 9.64172L26.4785 0H6.11034L5.87328 0.373885L24.126 17.654Z"
            fill="#2563EB"
          />
          <path
            d="M20.2452 21.328L22.2112 19.4666L4.43779 2.63914L2.9628 4.96601L20.2452 21.328Z"
            fill="#2563EB"
          />
          <path
            d="M1.52761 7.23137L3.07007e-07 9.6418L16.2945 25.0686L18.3313 23.1402L1.52761 7.23137Z"
            fill="#2563EB"
          />
        </svg>
        {isExpanded && (
          <span
            className="text-base text-foreground truncate"
            style={{
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontWeight: 700,
              letterSpacing: "0.05em",
            }}
          >
            Valgate
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-1 px-2 py-3 flex-1 overflow-y-auto">
        {sidebarNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.path === "/" ? pathname === "/" : pathname.startsWith(item.path);
          return (
            <button
              key={item.label}
              onClick={() => handleNavigate(item.path)}
              className={cn(
                "flex items-center gap-3 h-11 px-3 rounded-xl text-sm transition-colors",
                isActive
                  ? "bg-surface-tint text-foreground font-medium"
                  : "text-secondary hover:bg-surface-tint hover:text-foreground",
                !isExpanded && "justify-center px-0",
              )}
              title={!isExpanded ? item.label : undefined}
            >
              <Icon className="size-5 shrink-0" />
              {isExpanded && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Dark mode + user avatar */}
      <div className="border-t border-border-default px-2 py-3 flex flex-col gap-2">
        <button
          type="button"
          disabled
          aria-disabled="true"
          className={cn(
            "flex h-11 cursor-not-allowed items-center gap-3 rounded-xl px-3 text-sm text-secondary/45",
            !isExpanded && "justify-center px-0",
          )}
          title="Theme switching coming soon"
        >
          {isDark ? (
            <Sun className="size-5 shrink-0" />
          ) : (
            <Moon className="size-5 shrink-0" />
          )}
          {isExpanded && <span>{isDark ? "Light mode" : "Dark mode"}</span>}
        </button>
        <button
          onClick={() => handleNavigate("/settings?section=profile")}
          className={cn(
            "flex items-center gap-3 px-3 py-1 rounded-xl hover:bg-surface-tint transition-colors w-full",
            !isExpanded && "justify-center px-0",
          )}
          title={!isExpanded ? displayName : undefined}
        >
          <div className="w-8 h-8 rounded-full bg-interactive-primary flex items-center justify-center shrink-0">
            <span className="text-xs font-medium text-white">{initials}</span>
          </div>
          {isExpanded && (
            <div className="min-w-0 text-left">
              <p className="text-sm font-medium text-foreground truncate">
                {displayName}
              </p>
              {roleText && <p className="text-xs text-secondary truncate">{roleText}</p>}
            </div>
          )}
        </button>
        <button
          onClick={() => signOut({ redirectUrl: "/login" })}
          className={cn(
            "flex h-11 items-center gap-3 rounded-xl px-3 text-sm text-secondary hover:bg-surface-tint hover:text-foreground transition-colors",
            !isExpanded && "justify-center px-0",
          )}
          title={!isExpanded ? "Sign out" : undefined}
        >
          <LogOut className="size-5 shrink-0" />
          {isExpanded && <span>Sign out</span>}
        </button>
      </div>
    </div>
  );
}
