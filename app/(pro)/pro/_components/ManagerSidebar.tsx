"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Users,
  Building2,
  Banknote,
  Bot,
  ClipboardList,
  ShieldCheck,
  Plus,
} from "lucide-react";
import { cn } from "@/components/ui/utils";
import { useWorkspaceTabs } from "./WorkspaceTabProvider";
import {
  HEALTH_DOT,
  type ShellClient,
  type ShellManager,
} from "./pro-shell-types";

// Primary navigation: the four main Pro pages. Every entry is a real
// route — no placeholder items.
const PRIMARY_NAV = [
  { label: "Home", icon: Home, href: "/pro/dashboard" },
  { label: "Clients", icon: Users, href: "/pro/clients" },
  { label: "Properties", icon: Building2, href: "/pro/properties" },
  { label: "Rent & Collections", icon: Banknote, href: "/pro/rent" },
  { label: "Work Orders", icon: ClipboardList, href: "/pro/work-orders" },
  { label: "Compliance", icon: ShieldCheck, href: "/pro/compliance" },
  { label: "Agent Hub", icon: Bot, href: "/pro/agents" },
] as const;

// Left sidebar of the Pro shell: navigation, the manager's client book
// (with derived health dots), and the manager identity. All data comes
// from props supplied by the server layout.
export function ManagerSidebar({
  clients,
  openWorkOrders,
  manager,
}: {
  clients: ShellClient[];
  openWorkOrders: number;
  manager: ShellManager;
}) {
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
          VP
        </span>
        <div className="min-w-0 flex-1">
          <span className="block truncate text-left text-[13px] font-semibold text-foreground">
            Valgate Professional
          </span>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 px-2 py-3">
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/pro/clients"
              ? pathname === "/pro/clients"
              : pathname.startsWith(item.href);

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => router.push(item.href)}
              className={cn(
                "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors",
                isActive
                  ? "bg-surface-tint text-foreground"
                  : "text-secondary hover:bg-surface-tint hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-left">
                {item.label}
              </span>
              {item.href === "/pro/work-orders" && openWorkOrders > 0 && (
                <span className="ml-auto inline-flex items-center rounded-full bg-surface-tint px-2 py-0.5 text-[11px] font-medium text-secondary">
                  {openWorkOrders} open
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-2 min-h-0 flex-1 overflow-y-auto px-2">
        <div className="mb-1 flex items-center justify-between px-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-secondary">
            Clients
          </span>
          <button
            type="button"
            aria-label="Add client"
            onClick={() => router.push("/pro/clients")}
            className="rounded p-0.5 text-secondary hover:bg-surface-tint"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex flex-col gap-0.5">
          {clients.map((client) => {
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

      <div className="mt-auto border-t border-border-default px-2 py-3">
        <div className="flex items-center gap-2 px-2.5 py-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-teal-100 text-[10px] font-semibold text-teal-700">
            {manager.initials}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[12px] font-medium text-foreground">
              {manager.name}
            </div>
            <div className="text-[11px] text-secondary">Valgate Pro</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
