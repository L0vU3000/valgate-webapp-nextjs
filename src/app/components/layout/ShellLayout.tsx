import { useState } from "react";
import { Outlet } from "react-router";
import { cn } from "../ui/utils";
import { Sidebar } from "./Sidebar";
import { AIOverlay } from "./AIOverlay";

export function ShellLayout() {
  const [isDark, setIsDark] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  return (
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
        <Outlet context={{ isDark }} />
      </main>
      <AIOverlay open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}
