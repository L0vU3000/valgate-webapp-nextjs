"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ShellClient } from "./pro-shell-types";

// Workspace tab state for the Pro shell. Clients come in via props
// from the server layout (real Client records) — no mock data.

export type DashboardTab = {
  kind: "dashboard";
  id: "dashboard";
};

export type ClientTab = {
  kind: "client";
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  health: ShellClient["health"];
};

export type WorkspaceTab = DashboardTab | ClientTab;

type WorkspaceTabContextValue = {
  openTabs: WorkspaceTab[];
  activeTabId: string;
  availableClients: ShellClient[];
  openClientTab: (clientId: string) => void;
  closeTab: (tabId: string) => void;
  activateTab: (tabId: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  isTabOpen: (tabId: string) => boolean;
};

const WorkspaceTabContext = createContext<WorkspaceTabContextValue | null>(null);

function clientToTab(client: ShellClient): ClientTab {
  return {
    kind: "client",
    id: client.id,
    name: client.name,
    initials: client.initials,
    avatarColor: client.avatarColor,
    health: client.health,
  };
}

// Default workspace: the dashboard plus the manager's top three clients
// (the list arrives sorted by portfolio value from the server).
function buildDefaultTabs(clients: ShellClient[]): WorkspaceTab[] {
  const dashboard: DashboardTab = { kind: "dashboard", id: "dashboard" };
  const clientTabs = clients.slice(0, 3).map(clientToTab);
  return [dashboard, ...clientTabs];
}

// Maps the current route to the tab that should appear active.
// Non-client pro pages (rent, work orders, clients index) highlight
// no workspace tab.
function routeToActiveTabId(pathname: string): string {
  const clientMatch = pathname.match(/\/pro\/clients\/([^/]+)/);
  if (clientMatch) {
    return clientMatch[1];
  }
  if (pathname === "/pro/dashboard") {
    return "dashboard";
  }
  return "";
}

export function WorkspaceTabProvider({
  clients,
  children,
}: {
  clients: ShellClient[];
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [openTabs, setOpenTabs] = useState<WorkspaceTab[]>(() =>
    buildDefaultTabs(clients),
  );

  const activeTabId = routeToActiveTabId(pathname);

  const activateTab = useCallback(
    (tabId: string) => {
      if (tabId === "dashboard") {
        router.push("/pro/dashboard");
        return;
      }
      router.push(`/pro/clients/${tabId}`);
    },
    [router],
  );

  const openClientTab = useCallback(
    (clientId: string) => {
      const client = clients.find((c) => c.id === clientId);
      if (!client) {
        return;
      }

      setOpenTabs((current) => {
        const exists = current.some(
          (tab) => tab.kind === "client" && tab.id === clientId,
        );
        if (exists) {
          return current;
        }
        return [...current, clientToTab(client)];
      });

      router.push(`/pro/clients/${clientId}`);
    },
    [clients, router],
  );

  const closeTab = useCallback(
    (tabId: string) => {
      if (tabId === "dashboard") {
        return;
      }

      setOpenTabs((current) => {
        const next = current.filter((tab) => tab.id !== tabId);
        if (activeTabId === tabId) {
          const fallback =
            next.find((tab) => tab.kind === "client") ?? next[0];
          if (fallback) {
            activateTab(fallback.id);
          }
        }
        return next;
      });
    },
    [activeTabId, activateTab],
  );

  const reorderTabs = useCallback((fromIndex: number, toIndex: number) => {
    setOpenTabs((current) => {
      if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
        return current;
      }
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) {
        return current;
      }
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const isTabOpen = useCallback(
    (tabId: string) => openTabs.some((tab) => tab.id === tabId),
    [openTabs],
  );

  const value = useMemo(
    () => ({
      openTabs,
      activeTabId,
      availableClients: clients,
      openClientTab,
      closeTab,
      activateTab,
      reorderTabs,
      isTabOpen,
    }),
    [
      openTabs,
      activeTabId,
      clients,
      openClientTab,
      closeTab,
      activateTab,
      reorderTabs,
      isTabOpen,
    ],
  );

  return (
    <WorkspaceTabContext.Provider value={value}>
      {children}
    </WorkspaceTabContext.Provider>
  );
}

export function useWorkspaceTabs() {
  const context = useContext(WorkspaceTabContext);
  if (!context) {
    throw new Error("useWorkspaceTabs must be used within WorkspaceTabProvider");
  }
  return context;
}
