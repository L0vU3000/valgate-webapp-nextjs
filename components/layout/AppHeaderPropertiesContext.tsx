"use client";

import { createContext, useContext } from "react";
import type { PropertyListItem } from "@/lib/data/types/property";

// Shell-level header context: properties for the command palette + manager flag
// for the Pro ⇄ My portfolio pill. Both are set once by the server layout.
type AppHeaderCtx = {
  properties: PropertyListItem[];
  isManager: boolean;
};

const Context = createContext<AppHeaderCtx>({ properties: [], isManager: false });

export function AppHeaderProperties({
  properties,
  isManager = false,
  children,
}: {
  properties: PropertyListItem[];
  isManager?: boolean;
  children: React.ReactNode;
}) {
  return <Context.Provider value={{ properties, isManager }}>{children}</Context.Provider>;
}

export function useAppHeaderProperties(): PropertyListItem[] {
  return useContext(Context).properties;
}

// Returns whether the authenticated user has manager mode enabled.
// Used by AppHeader to conditionally render the Pro ⇄ My portfolio pill.
export function useIsManager(): boolean {
  return useContext(Context).isManager;
}
