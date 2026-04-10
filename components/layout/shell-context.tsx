"use client";

import { createContext, useContext } from "react";

export const ShellContext = createContext<{ isDark: boolean }>({ isDark: false });

export function useShellContext() {
  return useContext(ShellContext);
}
