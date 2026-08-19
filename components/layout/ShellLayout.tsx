"use client";

import { useState } from "react";
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

export function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDark, setIsDark] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

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

        <Toaster position="bottom-right" richColors />
      </div>
    </ShellContext.Provider>
  );
}
