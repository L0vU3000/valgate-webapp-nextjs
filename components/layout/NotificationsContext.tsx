"use client";

import { createContext, useContext } from "react";
import type { Notification } from "@/lib/data/types/notification";

const Context = createContext<Notification[]>([]);

export function NotificationsProvider({
  notifications,
  children,
}: {
  notifications: Notification[];
  children: React.ReactNode;
}) {
  return <Context.Provider value={notifications}>{children}</Context.Provider>;
}

export function useInitialNotifications(): Notification[] {
  return useContext(Context);
}
