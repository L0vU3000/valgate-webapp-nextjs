"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import {
  Home,
  Users,
  Building2,
  Banknote,
  Bot,
  ClipboardList,
  ShieldCheck,
  Plus,
  Pin,
  Settings,
  LogOut,
  User,
  LayoutDashboard,
  Wrench,
  Activity,
  Eye,
  ArrowLeft,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/components/ui/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useWorkspaceTabs } from "./WorkspaceTabProvider";
import {
  HEALTH_DOT,
  type ShellClient,
  type ShellManager,
} from "./pro-shell-types";

// Manager-wide navigation: the top-level Pro pages. Every entry is a real route
// — no placeholder items.
// "Clients" is intentionally NOT here — it's rendered as the header button of
// the client book below (one "Clients" affordance, not two).
const PRIMARY_NAV = [
  { label: "Home", icon: Home, href: "/pro/dashboard" },
  { label: "Properties", icon: Building2, href: "/pro/properties" },
  { label: "Rent & Collections", icon: Banknote, href: "/pro/rent" },
  { label: "Work Orders", icon: ClipboardList, href: "/pro/work-orders" },
  { label: "Compliance", icon: ShieldCheck, href: "/pro/compliance" },
  { label: "Agent Hub", icon: Bot, href: "/pro/agents" },
] as const;

// Client-workspace navigation (Client context): the manager's per-client
// cockpit — the Dashboard cards scoped to one client (NOT the client's owner
// views, which live behind "View as client"). `path` is appended to the client
// base `/pro/clients/[id]`; Overview is the base itself (path "").
const CLIENT_SECTIONS = [
  { label: "Overview", icon: LayoutDashboard, path: "" },
  { label: "Properties", icon: Building2, path: "/properties" },
  { label: "Financials", icon: Banknote, path: "/financials" },
  { label: "Work Orders", icon: Wrench, path: "/work-orders" },
  { label: "Compliance", icon: ShieldCheck, path: "/compliance" },
  { label: "Activity", icon: Activity, path: "/activity" },
] as const;

// Left sidebar of the Pro shell. Contextual (multitasking model "A"): in the
// Portfolio context it shows the manager-wide nav + client book; in the Client
// context (a `/pro/clients/[id]` route is active) it swaps to that client's
// section nav. Context follows the active workspace tab / pathname. All data
// comes from props supplied by the server layout.
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
  const { signOut } = useClerk();
  const { activeTabId, openClientTab, activateTab, isTabOpen } =
    useWorkspaceTabs();

  const activeClientId = pathname.startsWith("/pro/clients/")
    ? pathname.split("/")[3] ?? null
    : null;
  const activeClient = activeClientId
    ? clients.find((c) => c.id === activeClientId) ?? null
    : null;
  const inClientContext = activeClientId !== null;

  // Collapse toggle for the client book. Lives here (not in PortfolioContextNav)
  // so the choice survives leaving for a client and coming back.
  // ponytail: session-only; persist to localStorage if managers want it sticky.
  const [clientsCollapsed, setClientsCollapsed] = useState(false);

  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col border-r border-border-default bg-surface-base">
      {inClientContext ? (
        <ClientContextNav
          clientId={activeClientId}
          client={activeClient}
          pathname={pathname}
          onNavigate={(href) => router.push(href)}
          onBackToDashboard={() => activateTab("dashboard")}
        />
      ) : (
        <PortfolioContextNav
          clients={clients}
          openWorkOrders={openWorkOrders}
          activeClientId={activeClientId}
          activeTabId={activeTabId}
          pathname={pathname}
          onNavigate={(href) => router.push(href)}
          onOpenClient={(id) => openClientTab(id)}
          isTabOpen={isTabOpen}
          clientsCollapsed={clientsCollapsed}
          onToggleClients={() => setClientsCollapsed((v) => !v)}
        />
      )}

      <div className="mt-auto border-t border-border-default px-2 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-surface-tint"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-teal-100 text-[10px] font-semibold text-teal-700">
                {manager.initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-medium text-foreground">
                  {manager.name}
                </div>
                <div className="text-[11px] text-secondary">Valgate Pro</div>
              </div>
              {/* Chevron signals this row opens a menu. */}
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-secondary" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-48">
            <DropdownMenuItem onSelect={() => router.push("/profile")}>
              <User className="mr-2 h-4 w-4" />
              Account
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => signOut({ redirectUrl: "/login" })}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

// Portfolio context: manager-wide nav + the client book.
function PortfolioContextNav({
  clients,
  openWorkOrders,
  activeClientId,
  activeTabId,
  pathname,
  onNavigate,
  onOpenClient,
  isTabOpen,
  clientsCollapsed,
  onToggleClients,
}: {
  clients: ShellClient[];
  openWorkOrders: number;
  activeClientId: string | null;
  activeTabId: string;
  pathname: string;
  onNavigate: (href: string) => void;
  onOpenClient: (clientId: string) => void;
  isTabOpen: (tabId: string) => boolean;
  clientsCollapsed: boolean;
  onToggleClients: () => void;
}) {
  return (
    <>
      <nav className="flex flex-col gap-0.5 px-2 py-3">
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onNavigate(item.href)}
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
        {/* "Clients" is a nav-styled button that both routes to the index and
            heads the client list — one affordance, not a separate caption. A
            left chevron collapses the list (reclaims space when there are many
            clients); the "+" is a row action (add client). */}
        <div className="mb-0.5 flex items-center gap-0.5">
          <button
            type="button"
            aria-label={clientsCollapsed ? "Expand clients" : "Collapse clients"}
            aria-expanded={!clientsCollapsed}
            onClick={onToggleClients}
            className="flex h-9 w-5 shrink-0 items-center justify-center rounded-md text-secondary transition-colors hover:bg-surface-tint hover:text-foreground"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                clientsCollapsed && "-rotate-90",
              )}
            />
          </button>
          <button
            type="button"
            onClick={() => onNavigate("/pro/clients")}
            className={cn(
              "flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors",
              pathname === "/pro/clients"
                ? "bg-surface-tint text-foreground"
                : "text-secondary hover:bg-surface-tint hover:text-foreground",
            )}
          >
            <Users className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-left">Clients</span>
            <span className="text-[11px] font-medium text-secondary">
              {clients.length}
            </span>
          </button>
          <button
            type="button"
            aria-label="Add client"
            onClick={() => onNavigate("/pro/clients?onboard=1")}
            className="flex h-9 w-8 shrink-0 items-center justify-center rounded-md text-secondary transition-colors hover:bg-surface-tint hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div
          className={cn("flex flex-col gap-0.5", clientsCollapsed && "hidden")}
        >
          {clients.map((client) => {
            const isActive =
              activeClientId === client.id || activeTabId === client.id;
            const tabOpen = isTabOpen(client.id);

            return (
              <button
                key={client.id}
                type="button"
                onClick={() => onOpenClient(client.id)}
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
                  <Pin
                    aria-label="Open in workspace tab"
                    className="h-3.5 w-3.5 shrink-0 text-secondary"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

// Client context: back-to-Portfolio, the client's identity, and its section nav.
function ClientContextNav({
  clientId,
  client,
  pathname,
  onNavigate,
  onBackToDashboard,
}: {
  clientId: string;
  client: ShellClient | null;
  pathname: string;
  onNavigate: (href: string) => void;
  onBackToDashboard: () => void;
}) {
  const base = `/pro/clients/${clientId}`;
  const initials = client?.initials ?? clientId.slice(0, 2).toUpperCase();
  const name = client?.name ?? clientId;

  function isSectionActive(sectionPath: string) {
    if (sectionPath === "") {
      // Overview is the client root — exact match only, so it doesn't light up
      // for every nested section.
      return pathname === base;
    }
    const full = base + sectionPath;
    return pathname === full || pathname.startsWith(full + "/");
  }

  const viewAsClientActive = pathname.startsWith(base + "/as-client");

  return (
    <>
      <div className="px-2 pt-3">
        <button
          type="button"
          onClick={onBackToDashboard}
          className="flex h-8 w-full items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium text-secondary transition-colors hover:bg-surface-tint hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
          Back to Dashboard
        </button>
      </div>

      <div className="flex items-center gap-2 px-4 py-3">
        <span
          className={cn(
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
            client?.avatarColor ?? "bg-surface-tint text-secondary",
          )}
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-foreground">
            {name}
          </div>
          <div className="text-[11px] text-secondary">Client portfolio</div>
        </div>
        {client && (
          <span
            aria-hidden
            className={cn(
              "h-1.5 w-1.5 shrink-0 rounded-full",
              HEALTH_DOT[client.health],
            )}
          />
        )}
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-3">
        {CLIENT_SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = isSectionActive(section.path);

          return (
            <button
              key={section.label}
              type="button"
              onClick={() => onNavigate(base + section.path)}
              className={cn(
                "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors",
                isActive
                  ? "bg-surface-tint text-foreground"
                  : "text-secondary hover:bg-surface-tint hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-left">
                {section.label}
              </span>
            </button>
          );
        })}

        <div className="my-1.5 border-t border-border-default" />

        <button
          type="button"
          onClick={() => onNavigate(base + "/as-client")}
          className={cn(
            "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors",
            viewAsClientActive
              ? "bg-blue-50 text-blue-700"
              : "text-secondary hover:bg-surface-tint hover:text-foreground",
          )}
        >
          <Eye className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-left">
            View as client
          </span>
        </button>
      </nav>
    </>
  );
}
