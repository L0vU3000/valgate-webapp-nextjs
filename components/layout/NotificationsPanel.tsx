"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { X, Settings } from "lucide-react";
import { type Notification, type NotificationCategory } from "@/lib/data/notifications";
import { formatRelativeTime } from "@/lib/format";

const CATEGORY_STYLES: Record<
  NotificationCategory,
  { badgeBg: string; badgeText: string; iconBg: string; iconText: string }
> = {
  MAINTENANCE: {
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-700",
    iconBg: "bg-blue-50",
    iconText: "text-blue-600",
  },
  LEASING: {
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    iconBg: "bg-amber-50",
    iconText: "text-amber-600",
  },
  COMPLIANCE: {
    badgeBg: "bg-red-50",
    badgeText: "text-red-700",
    iconBg: "bg-red-50",
    iconText: "text-red-600",
  },
  PAYMENT: {
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700",
    iconBg: "bg-emerald-50",
    iconText: "text-emerald-600",
  },
  APPLICATIONS: {
    badgeBg: "bg-purple-50",
    badgeText: "text-purple-700",
    iconBg: "bg-purple-50",
    iconText: "text-purple-600",
  },
};

const CATEGORY_ICONS: Record<NotificationCategory, React.ReactNode> = {
  MAINTENANCE: (
    <svg width="16" height="14" viewBox="0 0 16 14" fill="none" aria-hidden>
      <path
        d="M8 0C5.243 0 3 2.243 3 5c0 1.294.497 2.47 1.308 3.347L.293 12.293a1 1 0 101.414 1.414L5.653 9.692A4.97 4.97 0 008 10c2.757 0 5-2.243 5-5S10.757 0 8 0z"
        fill="currentColor"
      />
    </svg>
  ),
  LEASING: (
    <svg width="12" height="15" viewBox="0 0 12 15" fill="none" aria-hidden>
      <path
        d="M10 0H2C.897 0 0 .897 0 2v11c0 1.103.897 2 2 2h8c1.103 0 2-.897 2-2V2c0-1.103-.897-2-2-2zM3 4h6v1H3V4zm0 3h6v1H3V7zm0 3h4v1H3v-1z"
        fill="currentColor"
      />
    </svg>
  ),
  COMPLIANCE: (
    <svg width="12" height="15" viewBox="0 0 12 15" fill="none" aria-hidden>
      <path
        d="M6 0L0 2.5V7c0 3.866 2.557 7.197 6 8 3.443-.803 6-4.134 6-8V2.5L6 0zm-.5 10.5l-2.5-2.5 1-1 1.5 1.5 3-3 1 1-3.5 3.5h.5z"
        fill="currentColor"
      />
    </svg>
  ),
  PAYMENT: (
    <svg width="17" height="12" viewBox="0 0 17 12" fill="none" aria-hidden>
      <rect x="0" y="0" width="17" height="12" rx="2" fill="currentColor" opacity=".15" />
      <rect x="0" y="3" width="17" height="3" fill="currentColor" />
      <rect x="2" y="8" width="4" height="2" rx="1" fill="currentColor" />
    </svg>
  ),
  APPLICATIONS: (
    <svg width="17" height="12" viewBox="0 0 17 12" fill="none" aria-hidden>
      <circle cx="6" cy="4" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M0 11c0-3 2.686-4 6-4s6 1 6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 3l1.5 1.5L16 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

export interface NotificationsPanelHandle {
  close: () => void;
}

interface NotificationsPanelProps {
  notifications: Notification[];
  onMarkAllRead: () => void;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

const CLOSE_DURATION = 140;

export const NotificationsPanel = forwardRef<NotificationsPanelHandle, NotificationsPanelProps>(
  function NotificationsPanel({ notifications, onMarkAllRead, onClose, triggerRef }, ref) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  function handleClose() {
    setIsClosing(true);
    setTimeout(onClose, CLOSE_DURATION);
  }

  useImperativeHandle(ref, () => ({ close: handleClose }));

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        !(triggerRef?.current && triggerRef.current.contains(target))
      ) {
        handleClose();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-labelledby="notifications-heading"
      className={`absolute right-[-14px] top-[calc(100%+20px)] z-50 w-[420px] bg-white border border-slate-300 rounded-lg shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.3)] overflow-hidden motion-reduce:animate-none ${
        isClosing
          ? "animate-[fade-slide-up-out_0.14s_cubic-bezier(0.5,0,0.75,0)_both]"
          : "animate-[fade-slide-down_0.18s_cubic-bezier(0.25,1,0.5,1)_both]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-3">
          <h2 id="notifications-heading" className="text-[1.125rem] font-extrabold text-[#121c28] tracking-[-0.035em] font-display leading-7">
            Notifications
          </h2>
          <span
            className={`bg-[#004ac6] text-white text-[0.625rem] font-semibold leading-[1.5] px-1.5 py-0.5 rounded-full tabular-nums transition-all duration-300 ${
              unreadCount === 0 ? "opacity-0 scale-75 pointer-events-none" : "opacity-100 scale-100"
            }`}
          >
            {unreadCount} NEW
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onMarkAllRead}
            disabled={unreadCount === 0}
            className="text-[0.75rem] font-semibold text-[#004ac6] hover:underline leading-[1] whitespace-nowrap disabled:text-slate-300 disabled:no-underline disabled:cursor-default transition-colors duration-200"
          >
            Mark all as read
          </button>
          <button
            onClick={handleClose}
            aria-label="Close notifications"
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors duration-150 group"
          >
            <X className="w-3 h-3 transition-transform duration-200 group-hover:rotate-90" />
          </button>
        </div>
      </div>

      {/* Notification list */}
      <div className="flex flex-col bg-slate-50/30 overflow-y-auto max-h-[540px]">
        {notifications.map((notification, index) => {
          const style = CATEGORY_STYLES[notification.category];
          return (
            <div
              key={notification.id}
              className={`flex gap-4 px-6 border-b border-slate-100 transition-colors duration-300 cursor-pointer motion-reduce:animate-none animate-[fade-slide-up_0.22s_cubic-bezier(0.25,1,0.5,1)_both] ${
                notification.read
                  ? "bg-slate-50/60 py-3 hover:bg-slate-100/60"
                  : "bg-[#f5f8ff] py-4 hover:bg-[#edf2ff]"
              }`}
              style={{ animationDelay: `${index * 55}ms` }}
            >
              {/* Unread dot */}
              <div className="shrink-0 w-3 pt-3" aria-hidden="true">
                <div
                  className={`relative w-3 h-3 transition-all duration-300 origin-center motion-reduce:transition-none ${
                    notification.read ? "opacity-0 scale-50" : "opacity-100 scale-100"
                  }`}
                >
                  <div className="absolute inset-0 bg-[#004ac6] rounded-full" />
                  <div className="absolute inset-0 rounded-full animate-[pin-beacon_2.5s_ease_infinite] motion-reduce:animate-none" />
                </div>
              </div>

              {/* Content */}
              <div
                className={`flex-1 min-w-0 transition-opacity duration-300 motion-reduce:transition-none ${notification.read ? "opacity-75" : "opacity-100"}`}
                aria-label={notification.read ? undefined : "Unread"}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`flex items-center justify-center rounded shrink-0 w-8 h-8 ${style.iconBg} ${style.iconText}`}
                  >
                    {CATEGORY_ICONS[notification.category]}
                  </div>
                  <span
                    className={`text-[0.625rem] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-[2px] ${style.badgeBg} ${style.badgeText}`}
                  >
                    {notification.category}
                  </span>
                  <span className="ml-auto text-[0.6875rem] text-slate-400 whitespace-nowrap shrink-0 tabular-nums">
                    {formatRelativeTime(notification.createdAt)}
                  </span>
                </div>

                <p
                  className={`mt-1 text-[0.875rem] text-[#121c28] leading-[1.375] font-display ${
                    notification.read ? "font-medium" : "font-semibold"
                  }`}
                >
                  {notification.title}
                </p>

                <p className="text-[0.875rem] text-slate-500 leading-[1.43] truncate">
                  {notification.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center px-6 py-4 border-t border-slate-100 bg-white">
        <button className="flex items-center gap-2 text-[0.875rem] font-semibold text-[#004ac6] hover:underline transition-[gap] duration-200 hover:gap-3 group">
          <span>Manage notifications</span>
          <Settings className="w-3 h-3 transition-transform duration-300 group-hover:rotate-45" />
        </button>
      </div>
    </div>
  );
});
