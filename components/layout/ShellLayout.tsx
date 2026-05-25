"use client";

import { useState } from "react";
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
import { MobileAIFab } from "./MobileAIFab";
import { AIOverlay } from "./AIOverlay";
import { ShellContext } from "./shell-context";

export function ShellLayout({
  children,
  defaultDark = false,
}: {
  children: React.ReactNode;
  defaultDark?: boolean;
}) {
  const [isDark, setIsDark] = useState(defaultDark);
  const [aiOpen, setAiOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();

  // Mutual exclusion on phone: only one full-screen surface at a time. If the
  // user opens AI while the nav drawer is open, the drawer closes and vice
  // versa. Prevents z-index collisions and an unmanageable stack of overlays.
  const openAi = () => {
    setNavOpen(false);
    setAiOpen(true);
  };
  const openNav = () => {
    setAiOpen(false);
    setNavOpen(true);
  };

  return (
    <ShellContext.Provider value={{ isDark }}>
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
            onOpenAI={openAi}
          />
        </div>

        {/* Drawer sidebar — phone only, lives inside a Sheet */}
        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetContent
            side="left"
            hideClose
            className="p-0 sm:hidden"
            // Radix requires a Title for a11y; visually hidden so the visible
            // header (the Sidebar's own logo block) stays the design source.
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Sidebar
              isDark={isDark}
              onToggleDark={() => setIsDark((d) => !d)}
              onOpenAI={openAi}
              variant="drawer"
              onNavigate={() => setNavOpen(false)}
            />
          </SheetContent>
        </Sheet>

        {/* Main content column. PhoneTopBar sits on top inside the column so
            its sticky positioning composes with the column's scroll. */}
        <main className="flex flex-col flex-1 overflow-hidden bg-surface-page h-full">
          <PhoneTopBar onMenu={openNav} />
          <div className="flex flex-1 flex-col overflow-hidden">
            {children}
          </div>
        </main>

        {/* Phone-only floating action button for the AI overlay. Lives at the
            shell root so it floats over every page, with safe-area-aware
            positioning. Hidden when the overlay is already open. */}
        <MobileAIFab onOpen={openAi} aiOpen={aiOpen} />

        <AIOverlay
          open={aiOpen}
          onClose={() => setAiOpen(false)}
          pathname={pathname}
        />
        <Toaster position="bottom-right" richColors />
      </div>
    </ShellContext.Provider>
  );
}
