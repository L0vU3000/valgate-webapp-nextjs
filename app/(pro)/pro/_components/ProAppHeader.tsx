"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Bell,
  Plus,
  ChevronDown,
  Building2,
  UserPlus,
  ClipboardList,
  ArrowRight,
} from "lucide-react";
import { CommandPalette } from "@/components/home/CommandPalette";
import {
  NotificationsPanel,
  type NotificationsPanelHandle,
} from "@/components/layout/NotificationsPanel";
import { HelpMenu } from "@/components/layout/HelpMenu";
import { useNotifications } from "@/lib/hooks/use-notifications";
import type { PropertyListItem } from "@/lib/data/types/property";
import type { Notification } from "@/lib/data/types/notification";

// Top header of the Pro shell: brand, command palette search over the
// real property book, Create menu (routes to creation flows or opens
// onboard wizard via ?onboard=1), and notifications. The manager identity
// and account switching live in the sidebar footer (ManagerSidebar).
export function ProAppHeader({
  searchProperties,
  isManager,
  notifications: initialNotifications,
}: {
  searchProperties: PropertyListItem[];
  // When true, renders the "My portfolio" pill so managers can switch back to
  // the owner shell. Owners (is_manager=false) never see this pill.
  isManager: boolean;
  // Server-fetched notifications for the bell panel. Seeds useNotifications so the
  // panel shows real data instead of always rendering empty.
  notifications: Notification[];
}) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const createRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<NotificationsPanelHandle>(null);
  const { notifications, markAllRead } = useNotifications(initialNotifications);
  const router = useRouter();

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        createRef.current &&
        !createRef.current.contains(event.target as Node)
      ) {
        setCreateOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // The Create menu routes to the page where each creation flow lives.
  // "New Client" opens the onboard wizard via ?onboard=1 (handled on /pro/clients).
  const createMenuItems: Array<
    | { icon: typeof Building2; label: string; href: string }
    | { icon: typeof UserPlus; label: string; onboard: true }
  > = [
    { icon: Building2, label: "New Property", href: "/add-property" },
    { icon: UserPlus, label: "New Client", onboard: true },
    { icon: ClipboardList, label: "New Work Order", href: "/pro/work-orders" },
  ];

  return (
    <>
      <header
        role="banner"
        className="relative flex h-14 shrink-0 items-center border-b border-border-default bg-surface-base px-4"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <svg
            viewBox="0 0 32.5889 25.0687"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 shrink-0"
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
          <span className="truncate text-[15px] font-semibold text-foreground">
            Pro
          </span>
        </div>

        <div className="pointer-events-none absolute left-1/2 top-0 flex h-14 w-full max-w-md -translate-x-1/2 items-center px-4">
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="pointer-events-auto relative flex w-full items-center gap-2 rounded-md bg-val-bg-tint py-2 pl-10 pr-3 text-[13px] text-secondary transition-colors hover:bg-surface-tint focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-secondary" />
            <span className="flex-1 text-left">
              Search properties, clients, work orders…
            </span>
            <kbd className="hidden shrink-0 items-center gap-0.5 rounded border border-border-default bg-surface-base px-1.5 py-0.5 text-[11px] font-medium text-secondary sm:flex">
              <span className="text-[13px] leading-none">⌘</span>K
            </kbd>
          </button>
        </div>

        <div className="flex flex-1 items-center justify-end gap-1">
          {/* Manager-only pill: switch back to the owner portfolio shell. Owners never see this. */}
          {isManager && (
            <Link
              href="/"
              className="group mr-1 hidden h-8 items-center gap-1.5 rounded-full border border-border-default bg-surface-base pl-3 pr-2.5 text-[12.5px] font-medium text-secondary transition-colors duration-150 hover:bg-surface-tint hover:text-foreground active:scale-[0.97] sm:inline-flex"
            >
              My portfolio
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          )}
          <div ref={createRef} className="relative">
            <button
              type="button"
              aria-expanded={createOpen}
              onClick={() => setCreateOpen((open) => !open)}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-interactive-primary px-3 text-[13px] font-medium text-white transition-[background-color,transform] hover:bg-blue-700 active:scale-[0.97]"
            >
              <Plus className="h-4 w-4" />
              Create
              <ChevronDown className="h-3.5 w-3.5 opacity-80" />
            </button>
            {createOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-md border border-border-default bg-surface-base py-1 shadow-lg">
                {createMenuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        setCreateOpen(false);
                        if ("onboard" in item) {
                          router.push("/pro/clients?onboard=1");
                          return;
                        }
                        router.push(item.href);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-foreground hover:bg-surface-tint"
                    >
                      <Icon className="h-4 w-4 text-secondary" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <HelpMenu />

          <div className="relative">
            <button
              ref={bellRef}
              type="button"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
              onClick={() => {
                if (notificationsOpen) {
                  panelRef.current?.close();
                } else {
                  setNotificationsOpen(true);
                }
              }}
              className="relative rounded p-2 transition-colors hover:bg-surface-tint"
            >
              <Bell className="h-5 w-5 text-secondary" />
              {notifications.some((n) => !n.read) && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
              )}
            </button>
            {notificationsOpen && (
              <NotificationsPanel
                ref={panelRef}
                notifications={notifications}
                onMarkAllRead={markAllRead}
                onNotificationClick={(notification) => {
                  if (notification.linkTo) {
                    router.push(notification.linkTo);
                  }
                  panelRef.current?.close();
                }}
                onClose={() => setNotificationsOpen(false)}
                triggerRef={bellRef}
              />
            )}
          </div>
        </div>
      </header>

      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        properties={searchProperties}
        navigate={(path) => router.push(path)}
      />
    </>
  );
}
