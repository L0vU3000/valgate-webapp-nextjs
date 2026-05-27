"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Menu } from "lucide-react";

import {
  NotificationsPanel,
  type NotificationsPanelHandle,
} from "@/components/layout/NotificationsPanel";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { useInitialNotifications } from "@/components/layout/NotificationsContext";

/**
 * PhoneTopBar
 *
 * Phone-only (`sm:hidden`) top app bar. Pattern:
 *
 *   [hamburger]      Valgate wordmark      [bell]
 *
 * Layout uses `grid-cols-3` so the wordmark is visually centered regardless
 * of how many items sit on either side. Hamburger triggers the drawer
 * (Sidebar in `variant="drawer"`) via `onMenu`. Bell opens the
 * NotificationsPanel. The AI entry point lives in a separate floating action
 * button (`MobileAIFab`) at the bottom of the screen — see ShellLayout.
 *
 * `pt-safe` keeps the bar below the Dynamic Island; `sticky top-0 z-30`
 * keeps it pinned without competing with the drawer Sheet (z-50).
 */
interface PhoneTopBarProps {
  onMenu: () => void;
}

export function PhoneTopBar({ onMenu }: PhoneTopBarProps) {
  const router = useRouter();
  const initialNotifications = useInitialNotifications();
  const { notifications, markAllRead, markAsRead } =
    useNotifications(initialNotifications);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<NotificationsPanelHandle>(null);

  const hasUnread = notifications.some((n) => !n.read);

  return (
    <header
      role="banner"
      className="sm:hidden sticky top-0 z-30 grid grid-cols-3 items-center bg-white border-b border-slate-200 pt-safe px-2 shrink-0"
    >
      {/* Left slot — hamburger */}
      <div className="flex h-14 items-center justify-start">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open navigation menu"
          className="flex size-11 items-center justify-center rounded-lg text-secondary hover:bg-surface-tint hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
        >
          <Menu className="size-5" />
        </button>
      </div>

      {/* Center slot — wordmark */}
      <div className="flex h-14 items-center justify-center">
        <button
          type="button"
          onClick={() => router.push("/")}
          aria-label="Go to home"
          className="flex items-center gap-2 px-2 py-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <svg
            viewBox="0 0 32.5889 25.0687"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-5"
            aria-hidden="true"
          >
            <path
              d="M24.126 17.654L32.5889 9.64172L26.4785 0H6.11034L5.87328 0.373885L24.126 17.654Z"
              fill="#2563EB"
            />
            <path
              d="M20.2452 21.328L22.2112 19.4666L4.43779 2.63914L2.9628 4.96601L20.2452 21.328Z"
              fill="#2563EB"
            />
            <path
              d="M1.52761 7.23137L3.07007e-07 9.6418L16.2945 25.0686L18.3313 23.1402L1.52761 7.23137Z"
              fill="#2563EB"
            />
          </svg>
          <span
            className="text-[15px] text-foreground"
            style={{
              fontFamily:
                "'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontWeight: 700,
              letterSpacing: "0.05em",
            }}
          >
            Valgate
          </span>
        </button>
      </div>

      {/* Right slot — bell */}
      <div className="flex h-14 items-center justify-end">
        <div className="relative">
          <button
            type="button"
            ref={bellRef}
            onClick={() => {
              if (notificationsOpen) {
                panelRef.current?.close();
              } else {
                setNotificationsOpen(true);
              }
            }}
            aria-label={hasUnread ? "Notifications, unread" : "Notifications"}
            aria-expanded={notificationsOpen}
            className="relative flex size-11 items-center justify-center rounded-lg text-secondary hover:bg-surface-tint hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
          >
            <Bell className="size-5" />
            {hasUnread && (
              <span
                aria-hidden="true"
                className="absolute top-2 right-2 w-2 h-2 bg-status-danger rounded-full"
              />
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
    </header>
  );
}
