"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Bell,
  Plus,
  ChevronDown,
  Building2,
  UserPlus,
  ClipboardList,
} from "lucide-react";
import { CommandPalette } from "@/components/home/CommandPalette";
import {
  NotificationsPanel,
  type NotificationsPanelHandle,
} from "@/components/layout/NotificationsPanel";
import { useNotifications } from "@/lib/hooks/use-notifications";
import type { PropertyListItem } from "@/lib/data/types/property";
import type { ShellManager } from "./pro-shell-types";

// Top header of the Pro shell: brand, command palette search over the
// real property book, Create menu (links to the real pages where each
// flow lives), notifications, and the manager identity from the
// user profile.
export function ProAppHeader({
  manager,
  searchProperties,
}: {
  manager: ShellManager;
  searchProperties: PropertyListItem[];
}) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const createRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<NotificationsPanelHandle>(null);
  const { notifications, markAllRead } = useNotifications();
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
  const createMenuItems = [
    { icon: Building2, label: "New Property", href: "/add-property" },
    { icon: UserPlus, label: "New Client", href: "/pro/clients" },
    { icon: ClipboardList, label: "New Work Order", href: "/pro/work-orders" },
  ];

  return (
    <>
      <header
        role="banner"
        className="relative flex h-14 shrink-0 items-center border-b border-border-default bg-surface-base px-4"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="truncate text-[15px] font-semibold text-foreground">
            Valgate Professional
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

          <div className="ml-1 inline-flex items-center gap-2 rounded-md py-1 pl-1 pr-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-[11px] font-semibold text-teal-700">
              {manager.initials}
            </span>
            <span className="hidden text-[13px] font-medium text-foreground sm:inline">
              {manager.name}
            </span>
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
