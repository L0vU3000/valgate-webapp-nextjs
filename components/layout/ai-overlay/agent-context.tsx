"use client";

import { createContext, useContext } from "react";

// Shared context so any child of the consumer ShellLayout can open the AI
// assistant — either the full overlay (openAI) or the docked floating panel
// (openFloating), optionally jumping straight to a specific session.
//
// This is the consumer-shell replacement for the old Pro ProAgentContext.
// It lives here (not under app/(pro)) so the AI overlay has no dependency on
// the cut Professional product.
type AgentOverlayCtx = {
  openAI: (sessionId?: string) => void;
  openFloating: (sessionId?: string) => void;
};

export const AgentOverlayContext = createContext<AgentOverlayCtx>({
  openAI: () => {},
  openFloating: () => {},
});

export function useAgentOverlay(): AgentOverlayCtx {
  return useContext(AgentOverlayContext);
}
