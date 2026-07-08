"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
  hasActiveMember: boolean;
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
    hasActiveMember: client.hasActiveMember,
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

  // Keep open tabs in sync when the server refreshes client metadata (e.g.
  // presence dots after a portfolio member logs in).
  useEffect(() => {
    setOpenTabs((current) =>
      current.map((tab) => {
        if (tab.kind === "dashboard") return tab;
        const client = clients.find((c) => c.id === tab.id);
        if (!client) return tab;
        return clientToTab(client);
      }),
    );
  }, [clients]);

  // Per-tab route memory (multitasking model "A"): each tab remembers the last
  // path visited within it, so switching clients and returning restores the
  // section (e.g. Rental) instead of resetting to the client root.
  const [lastPathByTab, setLastPathByTab] = useState<Record<string, string>>({});

  const activeTabId = routeToActiveTabId(pathname);

  // Record the current path against whichever tab it belongs to.
  useEffect(() => {
    if (!activeTabId) {
      return;
    }
    setLastPathByTab((prev) => {
      if (prev[activeTabId] === pathname) {
        return prev;
      }
      return { ...prev, [activeTabId]: pathname };
    });
  }, [pathname, activeTabId]);

  // Falls back to the tab's root when no section has been visited yet.
  const rootPathForTab = useCallback(
    (tabId: string) =>
      tabId === "dashboard" ? "/pro/dashboard" : `/pro/clients/${tabId}`,
    [],
  );

  const activateTab = useCallback(
    (tabId: string) => {
      router.push(lastPathByTab[tabId] ?? rootPathForTab(tabId));
    },
    [router, lastPathByTab, rootPathForTab],
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

      // Restore the tab's last section if it was already open; else its root.
      router.push(lastPathByTab[clientId] ?? `/pro/clients/${clientId}`);
    },
    [clients, router, lastPathByTab],
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
