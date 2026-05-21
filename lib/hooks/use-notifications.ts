"use client";

import { useState } from "react";
import type { Notification } from "@/lib/data/types/notification";
import { markRead, markAllRead as markAllReadAction } from "@/lib/actions/notifications.actions";

export function useNotifications(initial: Notification[] = []) {
  const [notifications, setNotifications] = useState<Notification[]>(initial);

  async function markAsRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await markRead(id);
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllReadAction();
  }

  return { notifications, markAllRead, markAsRead };
}
