"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { cn } from "../ui/utils";
import { Sidebar } from "./Sidebar";
import { AIOverlay } from "./AIOverlay";
import { ShellContext } from "./shell-context";

export function ShellLayout({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const pathname = usePathname();

  return (
    <ShellContext.Provider value={{ isDark }}>
      <div
        className={cn(
          "flex h-screen w-full overflow-hidden bg-surface-page font-sans",
          isDark && "dark",
        )}
      >
        <Sidebar
          isDark={isDark}
          onToggleDark={() => setIsDark((d) => !d)}
          onOpenAI={() => setAiOpen(true)}
        />
        <main className="flex flex-col flex-1 overflow-hidden bg-surface-page h-full">
          {children}
        </main>
        <AIOverlay open={aiOpen} onClose={() => setAiOpen(false)} pathname={pathname} />
        <Toaster position="bottom-right" richColors />
      </div>
    </ShellContext.Provider>
  );
}
