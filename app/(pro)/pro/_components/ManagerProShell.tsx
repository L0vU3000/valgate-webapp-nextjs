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
import { FloatingAgentChat, type FloatingOpenTrigger } from "@/components/layout/ai-overlay/FloatingAgentChat";
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

  // Floating docked panel — Agent Hub only (v1). Count increment is the trigger
  // signal; FloatingAgentChat fires on the change, not a boolean edge.
  const [floatingTrigger, setFloatingTrigger] = useState<FloatingOpenTrigger>({ count: 0 });

  const pathname = usePathname();
  const isHub = pathname === "/pro/agents";

  const openAI = useCallback((sessionId?: string) => {
    setAiSessionId(sessionId);
    setAiOpen(true);
  }, []);

  // On the Agent Hub, opens the floating panel; elsewhere falls through to openAI.
  const openFloating = useCallback((sessionId?: string) => {
    if (isHub) {
      setFloatingTrigger((prev) => ({ count: prev.count + 1, sessionId }));
    } else {
      setAiSessionId(sessionId);
      setAiOpen(true);
    }
  }, [isHub]);

  return (
    <WorkspaceTabProvider clients={shellClients}>
      <ProAgentContext.Provider value={{ openAI, openFloating }}>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-surface-page font-sans">
        <ProAppHeader
          manager={shellData.manager}
          searchProperties={shellData.searchProperties}
          managedAccounts={shellData.managedAccounts}
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

        {/* Phone-only floating trigger; hidden on Agent Hub (FloatingAgentChat
            provides its own FAB there) and while the overlay is open. */}
        {!isHub && <MobileAIFab onOpen={() => openAI()} aiOpen={aiOpen} />}

        {/* Docked floating panel — Agent Hub only (v1). */}
        {isHub && (
          <FloatingAgentChat pathname={pathname} openTrigger={floatingTrigger} />
        )}

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
