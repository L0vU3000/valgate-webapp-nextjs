"use client";

import { createContext, useContext } from "react";
import type { PropertyListItem } from "@/lib/data/types/property";

// Shell-level header context: properties for the command palette. Set once by
// the server layout.
type AppHeaderCtx = {
  properties: PropertyListItem[];
};

const Context = createContext<AppHeaderCtx>({ properties: [] });

export function AppHeaderProperties({
  properties,
  children,
}: {
  properties: PropertyListItem[];
  children: React.ReactNode;
}) {
  return <Context.Provider value={{ properties }}>{children}</Context.Provider>;
}

export function useAppHeaderProperties(): PropertyListItem[] {
  return useContext(Context).properties;
}
