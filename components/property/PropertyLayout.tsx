"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, MoreVertical, LayoutGrid, Eye, DollarSign, Key, Globe, Archive, Pencil, Bell } from "lucide-react";
import type { Property } from "@/lib/data/types/property";
import { usePropertyShell } from "@/components/property/PropertyShellContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { archivePropertyAction, restorePropertyAction } from "@/app/(shell)/property/actions";
import { toast } from "sonner";
import { NotificationsPanel, type NotificationsPanelHandle } from "@/components/layout/NotificationsPanel";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { useInitialNotifications } from "@/components/layout/NotificationsContext";

const tabs = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "documents", label: "Documents", icon: Eye },
  { key: "ownership", label: "Ownership", icon: Key },
  { key: "rental", label: "Rental", icon: DollarSign },
  { key: "location", label: "Location", icon: Globe },
];

interface PropertyLayoutProps {
  activeTab: string;
  children: React.ReactNode;
  property: Property;
  progress?: number;
  onProgressClick?: () => void;
  headerSlot?: React.ReactNode;
}

export function PropertyLayout({ activeTab, children, property, progress, onProgressClick, headerSlot }: PropertyLayoutProps) {
  const router = useRouter();
  const { id } = useParams();
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId");
  const orgQuery = orgId ? `?orgId=${encodeURIComponent(orgId)}` : "";
  const shell = usePropertyShell();
  const displayProgress = progress ?? shell?.progress;
  const handleProgressClick = onProgressClick ?? shell?.openProgressModal;
  const openPropertyWizard = shell?.openPropertyWizard;
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<NotificationsPanelHandle>(null);
  const initialNotifications = useInitialNotifications();
  const { notifications, markAllRead, markAsRead } = useNotifications(initialNotifications);

  useEffect(() => {
    const activeIndex = tabs.findIndex((t) => t.key === activeTab);
    const el = tabRefs.current[activeIndex];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth, ready: true });
  }, [activeTab]);

  const propertyId = Array.isArray(id) ? id[0] : id ?? "";

  return (
    <div className="h-full flex flex-col font-['Inter',sans-serif]">
      {/* Header */}
      {/*
        Mobile-tuned chrome header. At 484px the original `px-6` + breadcrumb
        text + progress badge + action cluster all together overflow, so we:
        - Drop side padding to `px-3` on mobile.
        - Hide the literal "Property /" breadcrumb prefix below `sm:` so only
          the property code + type remain (back chevron handles navigation).
        - Hide the trailing word "progress" from the badge on mobile — the
          colored dot + percent communicate the same thing.
        - Tighten the right cluster `gap-3` to `gap-1` so the bell + dropdown
          + headerSlot still fit.
        `pt-safe` keeps the bar below the iOS Dynamic Island.
      */}
      <div className="bg-card border-b border-border px-3 sm:px-6 py-3 flex items-center justify-between shrink-0 pt-safe">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => router.push("/portfolio")}
            aria-label="Back to portfolio"
            className="text-muted-foreground hover:text-foreground rounded-md p-1.5 hover:bg-accent/50 active:scale-90 transition-[color,background-color,transform] duration-150 shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          {/* Breadcrumb prefix — desktop only. */}
          <span className="hidden sm:inline text-muted-foreground text-[14px]">Property</span>
          <span className="hidden sm:inline text-muted-foreground text-[14px]">/</span>
          <span className="text-foreground text-[15px] sm:text-[16px] truncate" style={{ fontWeight: 600 }}>
            {property.code} {property.type}
          </span>
        </div>
        {/*
          Right cluster. All children share `h-9` so their visual baselines
          line up — the progress badge previously used `py-1` (no fixed
          height) which made it sit slightly above the icon buttons.

          Mobile (below `sm:`): the bell + "Property options" menu are
          replaced by a single consolidated `MoreVertical` dropdown that
          contains Notifications, Edit property, and Archive property.
          This keeps the mobile header clean (just progress badge + one
          icon) while preserving every action.

          Desktop (`sm:` and above): keep the original two-control layout
          (bell + more menu) since horizontal space isn't a problem.
        */}
        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          {/* Progress badge — visible on both mobile and desktop. */}
          <button
            onClick={handleProgressClick}
            disabled={!handleProgressClick}
            className="bg-[#ECFDF5] text-[#059669] inline-flex items-center gap-1.5 h-7 px-2 sm:px-3 rounded-full text-[12px] hover:bg-emerald-100 active:scale-[0.97] transition-[background-color,transform] duration-150 disabled:pointer-events-none"
            aria-label={`${displayProgress ?? "—"}% progress — view details`}
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>{displayProgress !== undefined ? `${displayProgress}%` : "—"}</span>
            <span className="hidden sm:inline">progress</span>
          </button>
          {headerSlot}

          {/* Desktop bell + standalone NotificationsPanel — visible at sm+. */}
          <div className="relative hidden sm:block">
            <button
              ref={bellRef}
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
              onClick={() => {
                if (notificationsOpen) {
                  panelRef.current?.close();
                } else {
                  setNotificationsOpen(true);
                }
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded hover:bg-slate-100 transition-colors duration-150 relative"
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

          {/* Desktop "Property options" menu — Edit + Archive only. */}
          <div className="hidden sm:block">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Property options"
                  className="inline-flex h-9 w-9 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-slate-100 transition-colors duration-150"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={() => openPropertyWizard?.()}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit property
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-amber-600 focus:text-amber-600 focus:bg-amber-50 cursor-pointer"
                  onSelect={() => setArchiveOpen(true)}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Archive property
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile consolidated menu — Notifications + Edit + Archive in
              one dropdown so the header stays uncluttered at 484px. */}
          <div className="block sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Property options"
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-slate-100 transition-colors duration-150"
                >
                  <MoreVertical className="w-5 h-5" />
                  {/* Unread indicator carries over from the bell so users
                      know to open the menu to see notifications. */}
                  {notifications.some((n) => !n.read) && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={() => setNotificationsOpen(true)}
                >
                  <Bell className="w-4 h-4 mr-2" />
                  <span className="flex-1">Notifications</span>
                  {notifications.some((n) => !n.read) && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-red-500" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={() => openPropertyWizard?.()}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit property
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-amber-600 focus:text-amber-600 focus:bg-amber-50 cursor-pointer"
                  onSelect={() => setArchiveOpen(true)}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Archive property
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Notifications panel — also mounted on mobile, opens when the
                consolidated menu's Notifications item is selected. */}
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

      {/* Tab bar */}
      <div className="bg-card border-b border-border px-4 sm:px-6 flex gap-0 shrink-0 overflow-x-auto snap-x snap-mandatory sm:snap-none relative">
        {tabs.map((tab, i) => (
          <button
            key={tab.key}
            ref={(el) => { tabRefs.current[i] = el; }}
            onClick={() => router.push(`/property/${id}/${tab.key}${orgQuery}`)}
            className={`group px-4 py-3 min-h-11 text-[14px] transition-colors duration-200 whitespace-nowrap flex items-center gap-1.5 snap-start sm:snap-align-none ${
              activeTab === tab.key
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className={`w-4 h-4 transition-transform duration-200 ${
              activeTab === tab.key ? "" : "group-hover:scale-110"
            }`} />
            {tab.label}
          </button>
        ))}
        {/* Sliding active indicator */}
        {indicator.ready && (
          <div
            className="absolute bottom-0 h-0.5 bg-primary pointer-events-none"
            style={{
              left: indicator.left,
              width: indicator.width,
              transition: "left 300ms cubic-bezier(0.22,1,0.36,1), width 300ms cubic-bezier(0.22,1,0.36,1)",
            }}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>

      {/* Archive confirmation dialog — mount only when open to avoid Radix id drift on hydrate */}
      {archiveOpen && (
      <Dialog open onOpenChange={setArchiveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mb-1">
              <Archive className="w-5 h-5 text-amber-500" />
            </div>
            <DialogTitle>Archive this property?</DialogTitle>
            <DialogDescription>
              It will no longer appear in your portfolio or KPIs. You can restore it at any time from the archived properties list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setArchiveOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-val-heading border border-slate-200 rounded hover:bg-slate-50 transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                setArchiving(true);
                const result = await archivePropertyAction(propertyId);
                setArchiving(false);
                setArchiveOpen(false);
                if (result.ok) {
                  toast.success("Property archived", {
                    action: {
                      label: "Undo",
                      onClick: () => restorePropertyAction(propertyId),
                    },
                    duration: 5000,
                  });
                  router.push("/portfolio");
                }
              }}
              disabled={archiving}
              className="px-4 py-2 text-sm font-semibold text-white rounded bg-amber-500 hover:bg-amber-600 disabled:opacity-50 transition-colors duration-150"
            >
              {archiving ? "Archiving…" : "Archive"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}
