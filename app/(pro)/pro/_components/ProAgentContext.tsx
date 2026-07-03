"use client";

import { createContext, useContext } from "react";

// Shared context so any child of ManagerProShell can open the AI overlay,
// optionally jumping straight to a specific session (e.g. from a board card).
type ProAgentCtx = {
  openAI: (sessionId?: string) => void;
  // Opens the floating docked panel — mounted on every /pro page.
  openFloating: (sessionId?: string) => void;
};

export const ProAgentContext = createContext<ProAgentCtx>({
  openAI: () => {},
  openFloating: () => {},
});

export function useProAgent(): ProAgentCtx {
  return useContext(ProAgentContext);
}
