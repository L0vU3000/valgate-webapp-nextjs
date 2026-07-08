"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { ProAppHeader } from "./ProAppHeader";
import { WorkspaceTabBar } from "./WorkspaceTabBar";
import { ManagerSidebar } from "./ManagerSidebar";
import { WorkspaceTabProvider } from "./WorkspaceTabProvider";
import { ProAgentContext } from "./ProAgentContext";
// The AI overlay (chat panes + motion + a react-pdf viewer) is closed on load and opened on
// demand. This shell wraps every /pro route, so loading the overlay lazily keeps its heavy
// deps out of the shared First Load bundle. It renders nothing until opened — no fallback needed.
const AIOverlay = dynamic(
  () => import("@/components/layout/AIOverlay").then((m) => m.AIOverlay),
  { ssr: false },
);
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
    hasActiveMember: c.hasActiveMember,
  }));

  // Valgate Agent overlay state. The overlay reads `pathname` so its context
  // is page-aware (book-wide on /pro/*, client-scoped on /pro/clients/<id>).
  // `aiSessionId` lets callers (e.g. AgentRunCard) deep-link to a session.
  const [aiOpen, setAiOpen] = useState(false);
  const [aiSessionId, setAiSessionId] = useState<string | undefined>(undefined);

  // Floating docked panel — present on every /pro page. Count increment is the
  // trigger signal; FloatingAgentChat fires on the change, not a boolean edge.
  const [floatingTrigger, setFloatingTrigger] = useState<FloatingOpenTrigger>({ count: 0 });

  const pathname = usePathname();

  const openAI = useCallback((sessionId?: string) => {
    setAiSessionId(sessionId);
    setAiOpen(true);
  }, []);

  // Opens the floating docked panel — it's mounted on every /pro page, so
  // callers never need to fall back to the full overlay.
  const openFloating = useCallback((sessionId?: string) => {
    setFloatingTrigger((prev) => ({ count: prev.count + 1, sessionId }));
  }, []);

  return (
    <WorkspaceTabProvider clients={shellClients}>
      <ProAgentContext.Provider value={{ openAI, openFloating }}>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-surface-page font-sans">
        <ProAppHeader
          searchProperties={shellData.searchProperties}
          isManager={shellData.isManager}
          notifications={shellData.notifications}
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

        {/* Docked floating panel — present on every /pro page (replaces the
            phone-only FAB used on the owner side; this bar already adapts
            to mobile widths via its own max-width). */}
        <FloatingAgentChat pathname={pathname} openTrigger={floatingTrigger} />

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
