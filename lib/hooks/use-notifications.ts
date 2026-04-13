"use client";

import { useState } from "react";
import { MOCK_NOTIFICATIONS, type Notification } from "@/lib/data/notifications";

// TODO(backend): Replace useState + MOCK_NOTIFICATIONS with:
//   const notifications = useQuery(api.notifications.list);
//   const markAllReadMutation = useMutation(api.notifications.markAllRead);
//   const markAsReadMutation  = useMutation(api.notifications.markAsRead);

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);

  function markAllRead() {
    // TODO(backend): markAllReadMutation()
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function markAsRead(id: string) {
    // TODO(backend): markAsReadMutation({ id })
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  return { notifications, markAllRead, markAsRead };
}
