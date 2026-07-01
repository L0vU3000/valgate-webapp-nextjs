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
  Landmark,
  Settings,
  Sun,
  Moon,
  Key,
  Sparkles,
  BookUser,
  LogOut,
  Briefcase,
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
  { label: "Directory", path: "/directory", icon: BookUser },
  { label: "Rental", path: "/rental", icon: Key },
  { label: "Analytics", path: "/analytics", icon: BarChart2 },
  { label: "Estate Planning", path: "/estate-planning", icon: Landmark },
  { label: "Pro", path: "/pro/dashboard", icon: Briefcase },
  { label: "Settings", path: "/settings", icon: Settings },
] as const;

interface SidebarProps {
  isDark: boolean;
  onToggleDark: () => void;
  onOpenAI: () => void;
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
  /**
   * Preview mode for the manager's "View as client" route. When set, the
   * sidebar shows the *client's* identity (not the signed-in manager), hides
   * the manager-only "Pro" item and the sign-out control, forces "Home" active,
   * and makes nav items inert (the preview only renders the client's home).
   */
  isPreview?: boolean;
  /**
   * Identity to show in preview mode instead of the Clerk user. Lets the
   * sidebar read as the client being previewed.
   */
  identity?: { displayName: string; initials: string; roleText: string };
}

export function Sidebar({
  isDark,
  onOpenAI,
  variant = "rail",
  onNavigate,
  isPreview = false,
  identity,
}: SidebarProps) {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const { membership } = useOrganization();
  const { signOut } = useClerk();

  // In preview mode use the supplied client identity; otherwise the Clerk user.
  const displayName =
    identity?.displayName ||
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress ||
    "Account";
  const initials =
    identity?.initials ||
    ((user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "")).toUpperCase() ||
    displayName.charAt(0).toUpperCase();
  const roleText = identity ? identity.roleText : roleLabel(membership?.role);

  // Managers see "Pro"; an owner-client never does, so drop it in the preview.
  const navItems = isPreview
    ? sidebarNavItems.filter((item) => item.label !== "Pro")
    : sidebarNavItems;

  const isDrawer = variant === "drawer";
  // Drawer is always fully expanded; rail keeps the collapse toggle.
  const isExpanded = isDrawer || expanded;

  const handleNavigate = (path: string) => {
    // ponytail: preview only renders the client's Home, so nav is inert here.
    // Full client-scoped navigation across owner routes is future work.
    if (isPreview) return;
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
        {navItems.map((item) => {
          const Icon = item.icon;
          const isPro = item.label === "Pro";
          // Preview always sits on the client's Home, so highlight that.
          const isActive = isPreview
            ? item.path === "/"
            : item.path === "/"
              ? pathname === "/"
              : pathname.startsWith(item.path);
          return (
            <button
              key={item.label}
              onClick={() => handleNavigate(item.path)}
              className={cn(
                "flex items-center gap-3 h-11 px-3 rounded-xl text-sm transition-colors",
                isPro
                  ? isExpanded
                    ? cn(
                        "border font-medium text-[#2563eb]",
                        isActive
                          ? "border-[#2563eb] bg-[#e4efff]"
                          : "border-[#c3c6d7] bg-surface-base hover:bg-[#e4efff] hover:border-[#2563eb]",
                      )
                    : cn(
                        "font-medium text-[#2563eb]",
                        isActive ? "bg-[#e4efff]" : "hover:bg-[#e4efff]",
                      )
                  : cn(
                      isActive
                        ? "bg-surface-tint text-foreground font-medium"
                        : "text-secondary hover:bg-surface-tint hover:text-foreground",
                    ),
                !isExpanded && "justify-center px-0",
              )}
              title={!isExpanded ? item.label : undefined}
            >
              <Icon className="size-5 shrink-0" />
              {isExpanded && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}

        {/* AI Overlay button */}
        <div className="mt-auto pt-3">
          <button
            type="button"
            onClick={() => {
              onOpenAI();
              onNavigate?.();
            }}
            className={cn(
              "group flex w-full items-center gap-2.5 rounded-xl border border-border-default bg-surface-base text-sm font-medium text-foreground transition-[background-color,border-color,box-shadow] duration-200",
              "hover:border-interactive-primary/35 hover:bg-surface-tint",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base",
              "active:scale-[0.98]",
              isExpanded ? "h-11 px-3" : "mx-auto size-11 justify-center",
            )}
            title={!isExpanded ? "Valgate Agent" : undefined}
          >
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-lg bg-interactive-primary/[0.08] text-interactive-primary transition-colors duration-200 group-hover:bg-interactive-primary/[0.12]",
                isExpanded ? "size-7" : "size-8",
              )}
            >
              <Sparkles className="size-3.5" strokeWidth={2} />
            </span>
            {isExpanded && <span className="truncate">Valgate Agent</span>}
          </button>
        </div>
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
          title={
            !isExpanded
              ? "Theme switching coming soon"
              : "Theme switching coming soon"
          }
        >
          {isDark ? (
            <Sun className="size-5 shrink-0" />
          ) : (
            <Moon className="size-5 shrink-0" />
          )}
          {isExpanded && <span>{isDark ? "Light mode" : "Dark mode"}</span>}
        </button>
        <button
          onClick={() => handleNavigate("/profile")}
          className={cn(
            "flex items-center gap-3 px-3 py-1 rounded-xl hover:bg-surface-tint transition-colors w-full",
            !isExpanded && "justify-center px-0",
            pathname === "/profile" && "bg-surface-tint",
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
        {/* No sign-out in preview — it would log the *manager* out. */}
        {!isPreview && (
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
        )}
      </div>
    </div>
  );
}
