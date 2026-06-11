"use client";

import { Toaster } from "sonner";
import { ProAppHeader } from "./ProAppHeader";
import { WorkspaceTabBar } from "./WorkspaceTabBar";
import { ManagerSidebar } from "./ManagerSidebar";
import { WorkspaceTabProvider } from "./WorkspaceTabProvider";
import type { ProShellData } from "../queries";
import type { ShellClient } from "./pro-shell-types";

// Client shell around every /pro route: header, workspace tabs,
// sidebar, content area. Receives all real data via props from the
// server layout — nothing in the shell invents values.

export function ManagerProShell({
  shellData,
  children,
}: {
  shellData: ProShellData;
  children: React.ReactNode;
}) {
  // Map the server rows to the light client shape the shell renders.
  const shellClients: ShellClient[] = shellData.clients.map((c) => ({
    id: c.id,
    name: c.name,
    initials: c.initials,
    avatarColor: c.avatarBg,
    health: c.health,
  }));

  return (
    <WorkspaceTabProvider clients={shellClients}>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-surface-page font-sans">
        <ProAppHeader
          manager={shellData.manager}
          searchProperties={shellData.searchProperties}
        />
        <WorkspaceTabBar />
        <div className="flex min-h-0 flex-1">
          <ManagerSidebar
            clients={shellClients}
            openWorkOrders={shellData.openWorkOrders}
            manager={shellData.manager}
          />
          <div className="min-w-0 flex-1 overflow-hidden bg-surface-base">
            {children}
          </div>
        </div>
        <Toaster position="bottom-right" richColors />
      </div>
    </WorkspaceTabProvider>
  );
}
