"use client";

import { createContext, useContext } from "react";
import type { PropertyListItem } from "@/lib/data/types/property";

const Context = createContext<PropertyListItem[]>([]);

export function AppHeaderProperties({
  properties,
  children,
}: {
  properties: PropertyListItem[];
  children: React.ReactNode;
}) {
  return <Context.Provider value={properties}>{children}</Context.Provider>;
}

export function useAppHeaderProperties(): PropertyListItem[] {
  return useContext(Context);
}
