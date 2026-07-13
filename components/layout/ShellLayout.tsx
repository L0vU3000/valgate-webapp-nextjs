"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { cn } from "../ui/utils";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "../ui/sheet";
import { Sidebar } from "./Sidebar";
import { PhoneTopBar } from "./PhoneTopBar";
import { ShellContext } from "./shell-context";
import { AgentOverlayContext } from "./ai-overlay/agent-context";
import {
  FloatingAgentChat,
  type FloatingOpenTrigger,
} from "./ai-overlay/FloatingAgentChat";

// The full AI overlay is a heavy client component (chat pane, doc viewer,
// session sidebar), so load it lazily — the docked FloatingAgentChat is the
// always-present entry point and is imported normally above.
const AIOverlay = dynamic(
  () => import("./AIOverlay").then((m) => m.AIOverlay),
  { ssr: false },
);

export function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDark, setIsDark] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  // AI assistant open-state, lifted here so any page in the shell can open it
  // via the AgentOverlayContext. Mirrors the old Pro wiring, minus Pro.
  const pathname = usePathname();
  const [aiOpen, setAiOpen] = useState(false);
  const [aiSessionId, setAiSessionId] = useState<string | undefined>(undefined);
  // The docked panel fires on each count increment (a signal, not a boolean edge).
  const [floatingTrigger, setFloatingTrigger] = useState<FloatingOpenTrigger>({
    count: 0,
  });

  // Open the full overlay, optionally deep-linked to a session.
  const openAI = useCallback((sessionId?: string) => {
    setAiSessionId(sessionId);
    setAiOpen(true);
  }, []);

  // Open the docked floating panel (increment the trigger count).
  const openFloating = useCallback((sessionId?: string) => {
    setFloatingTrigger((prev) => ({ count: prev.count + 1, sessionId }));
  }, []);

  return (
    <ShellContext.Provider value={{ isDark }}>
    <AgentOverlayContext.Provider value={{ openAI, openFloating }}>
      <div
        className={cn(
          "flex h-dvh w-full overflow-hidden bg-surface-page font-sans",
          isDark && "dark",
        )}
      >
        {/* Rail sidebar — desktop only */}
        <div className="hidden sm:flex h-full">
          <Sidebar
            isDark={isDark}
            onToggleDark={() => setIsDark((d) => !d)}
          />
        </div>

        {/* Drawer sidebar — phone only, lives inside a Sheet.
            iPhone 14 (390px) tuning: the Sheet primitive defaults to 85% /
            max 320px, which leaves ~70px peek on a 390px viewport — fine,
            but the drawer feels cramped with the avatar row + nav labels.
            We bump to 88% / max 340px, leaving ~50px peek as the dismissal
            affordance while giving labels more breathing room. */}
        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetContent
            side="left"
            hideClose
            className="p-0 sm:hidden w-[88%] max-w-[340px]"
            // Radix requires a Title for a11y; visually hidden so the visible
            // header (the Sidebar's own logo block) stays the design source.
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Sidebar
              isDark={isDark}
              onToggleDark={() => setIsDark((d) => !d)}
              variant="drawer"
              onNavigate={() => setNavOpen(false)}
            />
          </SheetContent>
        </Sheet>

        {/* Main content column. PhoneTopBar sits on top inside the column so
            its sticky positioning composes with the column's scroll. */}
        <main className="flex flex-col flex-1 overflow-hidden bg-surface-page h-full">
          <PhoneTopBar onMenu={() => setNavOpen(true)} />
          <div className="flex flex-1 flex-col overflow-hidden">
            {children}
          </div>
        </main>

        {/* Docked AI assistant — always present. Escalates to the full
            overlay via openAI() from the AgentOverlayContext. */}
        <FloatingAgentChat pathname={pathname} openTrigger={floatingTrigger} />

        <AIOverlay
          open={aiOpen}
          onClose={() => {
            setAiOpen(false);
            setAiSessionId(undefined);
          }}
          pathname={pathname}
          sessionId={aiSessionId}
        />

        <Toaster position="bottom-right" richColors />
      </div>
    </AgentOverlayContext.Provider>
    </ShellContext.Provider>
  );
}
