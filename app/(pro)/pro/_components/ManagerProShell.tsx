"use client";

import { useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { ProAppHeader } from "./ProAppHeader";
import { WorkspaceTabBar } from "./WorkspaceTabBar";
import { ManagerSidebar } from "./ManagerSidebar";
import { WorkspaceTabProvider } from "./WorkspaceTabProvider";
import { ProAgentContext } from "./ProAgentContext";
import { AIOverlay } from "@/components/layout/AIOverlay";
import { MobileAIFab } from "@/components/layout/MobileAIFab";
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

  // Valgate Agent overlay state. The overlay reads `pathname` so its context
  // is page-aware (book-wide on /pro/*, client-scoped on /pro/clients/<id>).
  // `aiSessionId` lets callers (e.g. AgentRunCard) deep-link to a session.
  const [aiOpen, setAiOpen] = useState(false);
  const [aiSessionId, setAiSessionId] = useState<string | undefined>(undefined);
  const pathname = usePathname();

  const openAI = useCallback((sessionId?: string) => {
    setAiSessionId(sessionId);
    setAiOpen(true);
  }, []);

  return (
    <WorkspaceTabProvider clients={shellClients}>
      <ProAgentContext.Provider value={{ openAI }}>
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

        {/* Phone-only floating trigger; hidden while the overlay is open. */}
        <MobileAIFab onOpen={() => openAI()} aiOpen={aiOpen} />

        <AIOverlay
          open={aiOpen}
          onClose={() => { setAiOpen(false); setAiSessionId(undefined); }}
          pathname={pathname}
          sessionId={aiSessionId}
        />
        <Toaster position="bottom-right" richColors />
      </div>
      </ProAgentContext.Provider>
    </WorkspaceTabProvider>
  );
}
