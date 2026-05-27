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
import {
  getClientById,
  mockClients,
  type Client,
  type ClientHealth,
} from "@/app/(pro)/pro/_data/mock";

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
  health: ClientHealth;
};

export type WorkspaceTab = DashboardTab | ClientTab;

type WorkspaceTabContextValue = {
  openTabs: WorkspaceTab[];
  activeTabId: string;
  openClientTab: (clientId: string) => void;
  closeTab: (tabId: string) => void;
  activateTab: (tabId: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  isTabOpen: (tabId: string) => boolean;
};

const WorkspaceTabContext = createContext<WorkspaceTabContextValue | null>(null);

function clientToTab(client: Client): ClientTab {
  return {
    kind: "client",
    id: client.id,
    name: client.name,
    initials: client.initials,
    avatarColor: client.avatarColor,
    health: client.health,
  };
}

function buildDefaultTabs(): WorkspaceTab[] {
  const dashboard: DashboardTab = { kind: "dashboard", id: "dashboard" };
  const clientIds = ["c1", "c2", "c3"];
  const clientTabs = clientIds
    .map((id) => getClientById(id))
    .filter((client): client is Client => client !== undefined)
    .map(clientToTab);

  return [dashboard, ...clientTabs];
}

function routeToActiveTabId(pathname: string): string {
  const clientMatch = pathname.match(/\/manager\/clients\/([^/]+)/);
  if (clientMatch) {
    return clientMatch[1];
  }
  return "dashboard";
}

export function WorkspaceTabProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [openTabs, setOpenTabs] = useState<WorkspaceTab[]>(buildDefaultTabs);

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
      const client = getClientById(clientId);
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
    [router],
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
      openClientTab,
      closeTab,
      activateTab,
      reorderTabs,
      isTabOpen,
    }),
    [
      openTabs,
      activeTabId,
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

export function getAvailableClientsForPicker() {
  return mockClients;
}
