"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  MessageSquare,
  Plus,
  Search,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/components/ui/utils";
import type { AiSession } from "@/lib/data/types/ai-session";
import { glassCloseButton, glassIconBox } from "./glass-styles";

type AISessionSidebarProps = {
  sessions: AiSession[];
  activeSessionId: string | null;
  isOnline: boolean;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onArchiveSession: (id: string) => void;
  onClose: () => void;
  onSystemStatus: () => void;
  isCreating: boolean;
};

export function AISessionSidebar({
  sessions,
  activeSessionId,
  isOnline,
  onSelectSession,
  onNewSession,
  onArchiveSession,
  onClose,
  onSystemStatus,
  isCreating,
}: AISessionSidebarProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => s.title.toLowerCase().includes(q));
  }, [query, sessions]);

  return (
    <aside
      className={cn(
        "ai-glass-sidebar flex h-full w-full shrink-0 flex-col lg:w-[288px]",
        "animate-[glass-panel-left_0.4s_cubic-bezier(0.16,1,0.3,1)_0.1s_both]",
      )}
    >
      <div className="flex flex-col gap-3 px-4 pb-4 pt-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex size-7 items-center justify-center rounded-lg"
              style={glassIconBox}
            >
              <Sparkles className="size-3.5 text-interactive-primary" />
            </div>
            <h2 className="font-display text-[18px] font-bold leading-7 text-foreground">
              Valgate Agent
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-secondary transition-all hover:text-foreground"
            style={glassCloseButton}
            aria-label="Close assistant"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex items-center gap-2" role="status" aria-live="polite">
          <div
            className={cn(
              "size-2 rounded-full",
              isOnline
                ? "bg-status-success shadow-[0_0_6px_rgba(5,150,105,0.4)]"
                : "bg-secondary/60",
            )}
          />
          <span className="text-xs font-medium text-secondary">
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>

        <button
          type="button"
          onClick={onNewSession}
          disabled={isCreating}
          className="ai-glass-cta flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-interactive-primary-text disabled:opacity-50"
        >
          <Plus className="size-4" />
          {isCreating ? "Creating…" : "New Session"}
        </button>
      </div>

      <div className="ai-glass-divider-h mx-4" />

      <div className="px-4 py-3">
        <div className="ai-glass-input relative rounded-lg">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-secondary" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search history..."
            className="w-full rounded-lg border-0 bg-transparent py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-secondary outline-none"
            aria-label="Search sessions"
          />
        </div>
      </div>

      <div className="ai-glass-divider-h mx-4" />

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 py-2">
        {filtered.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-secondary">
            No sessions match your search.
          </p>
        ) : (
          filtered.map((session, i) => {
            const isActive = session.id === activeSessionId;
            return (
              <div key={session.id} className="group flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onSelectSession(session.id)}
                  className={cn(
                    "ai-glass-session flex w-full min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-3 text-left",
                    "animate-[glass-card-in_0.3s_ease-out_both]",
                    isActive && "active",
                  )}
                  style={{ animationDelay: `${0.15 + i * 0.05}s` }}
                >
                  <MessageSquare
                    className={cn(
                      "size-4.5 shrink-0",
                      isActive ? "text-interactive-primary" : "text-secondary",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-sm font-medium",
                        isActive ? "text-interactive-primary" : "text-foreground",
                      )}
                    >
                      {session.title}
                    </p>
                    {isActive && (
                      <p className="mt-px text-[10px] text-interactive-primary/70">
                        Active Now
                      </p>
                    )}
                  </div>
                </button>
                {isActive && sessions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onArchiveSession(session.id)}
                    className="rounded-lg p-2 text-secondary opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
                    aria-label={`Archive ${session.title}`}
                  >
                    <Archive className="size-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="ai-glass-divider-h mx-4" />

      <div className="flex flex-col gap-0.5 px-2 py-3">
        <button
          type="button"
          onClick={onSystemStatus}
          className="ai-glass-session flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left"
        >
          <Settings className="size-4.5 shrink-0 text-secondary" />
          <span className="text-sm text-secondary">Agent Settings</span>
        </button>
      </div>
    </aside>
  );
}
