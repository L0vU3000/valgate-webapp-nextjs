"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Inbox,
  LayoutDashboard,
  BarChart3,
  MoreHorizontal,
  Plus,
  ClipboardList,
  HelpCircle,
  Settings,
  ChevronDown,
  PanelLeftClose,
} from "lucide-react";
import { cn } from "@/components/ui/utils";
import { useWorkspaceTabs } from "./WorkspaceTabProvider";
import {
  HEALTH_DOT,
  sidebarClients,
} from "@/app/(pro)/pro/_data/mock";

const PRIMARY_NAV = [
  { label: "Home", icon: Home, href: "/pro/dashboard" },
  { label: "Inbox", icon: Inbox, href: "#" },
  { label: "Dashboards", icon: LayoutDashboard, href: "/pro/dashboard" },
  { label: "Reports", icon: BarChart3, href: "#" },
  { label: "More", icon: MoreHorizontal, href: "#" },
] as const;

export function ManagerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { activeTabId, openClientTab, isTabOpen } = useWorkspaceTabs();

  const activeClientId = pathname.startsWith("/pro/clients/")
    ? pathname.split("/")[3]
    : null;

  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col border-r border-border-default bg-surface-base">
      <div className="flex items-center gap-2 border-b border-border-default px-3 py-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-interactive-primary text-[11px] font-bold text-white">
          MP
        </span>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            className="flex w-full items-center gap-1 text-left text-[13px] font-semibold text-foreground"
          >
            <span className="truncate">My Portfolio</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-secondary" />
          </button>
        </div>
        <button
          type="button"
          aria-label="Collapse sidebar"
          className="rounded p-1 text-secondary hover:bg-surface-tint"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex flex-col gap-0.5 px-2 py-3">
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.label === "Dashboards"
              ? pathname === "/pro/dashboard"
              : false;

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => item.href !== "#" && router.push(item.href)}
              className={cn(
                "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors",
                isActive
                  ? "bg-surface-tint text-foreground"
                  : "text-secondary hover:bg-surface-tint hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-2 px-2">
        <div className="mb-1 flex items-center justify-between px-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-secondary">
            Clients
          </span>
          <button
            type="button"
            aria-label="Add client"
            className="rounded p-0.5 text-secondary hover:bg-surface-tint"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex flex-col gap-0.5">
          {sidebarClients.map((client) => {
            const isActive =
              activeClientId === client.id || activeTabId === client.id;
            const tabOpen = isTabOpen(client.id);

            return (
              <button
                key={client.id}
                type="button"
                onClick={() => openClientTab(client.id)}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-md px-2.5 text-left transition-colors",
                  isActive
                    ? "bg-surface-tint text-foreground"
                    : "text-secondary hover:bg-surface-tint hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                    client.avatarColor,
                  )}
                >
                  {client.initials}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                  {client.name}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    HEALTH_DOT[client.health],
                  )}
                />
                {tabOpen && (
                  <span
                    aria-label="Open in workspace tab"
                    className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border-default bg-surface-base"
                  >
                    <span className="h-2 w-2 rounded-sm bg-secondary/40" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 px-2">
        <button
          type="button"
          className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium text-secondary hover:bg-surface-tint hover:text-foreground"
        >
          <ClipboardList className="h-4 w-4" />
          Work Orders
          <span className="ml-auto inline-flex items-center rounded-full bg-surface-tint px-2 py-0.5 text-[11px] font-medium text-secondary">
            12 open
          </span>
        </button>
      </div>

      <div className="mt-auto border-t border-border-default px-2 py-3">
        <button
          type="button"
          className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] text-secondary hover:bg-surface-tint"
        >
          <HelpCircle className="h-4 w-4" />
          Help & Support
        </button>
        <button
          type="button"
          className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] text-secondary hover:bg-surface-tint"
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>
        <div className="mt-2 flex items-center gap-2 px-2.5 py-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-teal-100 text-[10px] font-semibold text-teal-700">
            AM
          </span>
          <div className="min-w-0">
            <div className="truncate text-[12px] font-medium text-foreground">
              Alex Morgan
            </div>
            <div className="text-[11px] text-secondary">Pro Plan</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
