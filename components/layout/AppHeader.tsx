"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell } from "lucide-react";
import { CommandPalette } from "@/components/home/CommandPalette";
import { NotificationsPanel, type NotificationsPanelHandle } from "@/components/layout/NotificationsPanel";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { useInitialNotifications } from "@/components/layout/NotificationsContext";
import type { PropertyListItem } from "@/lib/data/types/property";
import { useAppHeaderProperties } from "./AppHeaderPropertiesContext";

export function AppHeader({
  properties: propertiesProp,
}: {
  properties?: PropertyListItem[];
} = {}) {
  const propertiesFromContext = useAppHeaderProperties();
  const properties = propertiesProp ?? propertiesFromContext;
  const [commandOpen, setCommandOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<NotificationsPanelHandle>(null);
  const initialNotifications = useInitialNotifications();
  const { notifications, markAllRead, markAsRead } = useNotifications(initialNotifications);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <div
        role="banner"
        className="relative bg-white border-b border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)] px-6 flex items-center h-[56px] shrink-0"
      >
        {/* Left spacer */}
        <div className="flex-1" />

        {/* Search trigger — fixed to viewport center */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 h-[56px] flex items-center w-full max-w-[448px] px-6 z-10 pointer-events-none">
          <button
            onClick={() => setCommandOpen(true)}
            className="relative w-full flex items-center gap-2 pl-10 pr-3 py-2 text-[14px] bg-val-bg-tint rounded text-slate-400 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200 pointer-events-auto"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400 pointer-events-none" />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="hidden sm:flex items-center gap-0.5 text-[11px] font-medium text-slate-400 bg-white border border-slate-200 rounded px-1.5 py-0.5 shrink-0">
              <span className="text-[13px] leading-none">⌘</span>K
            </kbd>
          </button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 flex-1 justify-end">
          <div className="relative">
            <button
              ref={bellRef}
              aria-label="Notifications, unread"
              aria-expanded={notificationsOpen}
              onClick={() => {
                if (notificationsOpen) {
                  panelRef.current?.close();
                } else {
                  setNotificationsOpen(true);
                }
              }}
              className="p-2 rounded hover:bg-slate-100 transition-colors duration-150 relative"
            >
              <Bell className="w-5 h-5 text-slate-500" />
              {notifications.some((n) => !n.read) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
            {notificationsOpen && (
              <NotificationsPanel
                ref={panelRef}
                notifications={notifications}
                onMarkAllRead={markAllRead}
                onNotificationClick={(n) => {
                  markAsRead(n.id);
                  if (n.linkTo) router.push(n.linkTo);
                  panelRef.current?.close();
                }}
                onClose={() => setNotificationsOpen(false)}
                triggerRef={bellRef}
              />
            )}
          </div>
        </div>
      </div>

      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        properties={properties}
        navigate={(path) => router.push(path)}
      />
    </>
  );
}
