"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Menu, PanelRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/components/ui/utils";
import {
  archiveSession,
  createSession,
  loadSessionMessages,
  refreshOverlayContext,
} from "@/lib/actions/ai-overlay.actions";
import type { AiWorkspaceDocument } from "@/lib/data/derivations/ai-context";
import { AIDocumentModal } from "./ai-overlay/AIDocumentModal";
import { AISessionSidebar } from "./ai-overlay/AISessionSidebar";
import { AIChatPane } from "./ai-overlay/AIChatPane";
import { AIWorkspaceAssets } from "./ai-overlay/AIWorkspaceAssets";
import { useAgentChat } from "./ai-overlay/useAgentChat";

interface AIOverlayProps {
  open: boolean;
  onClose: () => void;
  pathname: string;
  // When set, the overlay opens directly on this session (e.g. from Agent Hub).
  sessionId?: string;
}

type MobilePanel = "sessions" | "chat" | "assets";

// Human label for the pinned-context chip — turns a raw pathname into the
// page name the manager recognizes from the cockpit nav.
function routeLabel(pathname: string): string {
  if (pathname.startsWith("/pro/clients/")) return "Client portfolio";
  const labels: Record<string, string> = {
    "/pro/dashboard": "Dashboard",
    "/pro/clients": "Clients",
    "/pro/properties": "Properties",
    "/pro/rent": "Rent & Collections",
    "/pro/work-orders": "Work Orders",
    "/pro/compliance": "Compliance",
    "/portfolio": "Portfolio",
    "/analytics": "Analytics",
  };
  if (labels[pathname]) return labels[pathname];
  if (pathname.startsWith("/property/")) return "Property";
  return pathname;
}

// Proactive opening prompts (spec P1) shown as clickable chips on an empty
// session — tailored to the route the agent was opened from. These are plain
// prompts, never invented figures, so nothing here can show a fake number.
function suggestedPrompts(ctx: ReturnType<typeof useAgentChat>["context"]): string[] {
  if (!ctx) return [];

  if (ctx.client) {
    const name = ctx.client.name;
    return [
      `Generate ${name}'s owner statement for last month`,
      `Who is overdue on rent for ${name}?`,
      `Show open work orders for ${name}`,
      `What's expiring in compliance for ${name}?`,
    ];
  }

  if (ctx.pathname.startsWith("/pro")) {
    const prompts: Record<string, string> = {
      overdue: "Who is overdue on rent this month?",
      workOrders: "Show open work orders by priority",
      expiring: "Which certificates expire in the next 90 days?",
      reports: "Draft this month's owner reports",
    };
    const order = ctx.pathname.startsWith("/pro/rent")
      ? ["overdue", "expiring", "workOrders", "reports"]
      : ctx.pathname.startsWith("/pro/work-orders")
        ? ["workOrders", "overdue", "expiring", "reports"]
        : ctx.pathname.startsWith("/pro/compliance")
          ? ["expiring", "workOrders", "overdue", "reports"]
          : ctx.pathname.startsWith("/pro/clients")
            ? ["reports", "overdue", "workOrders", "expiring"]
            : ["overdue", "workOrders", "expiring", "reports"];
    return order.map((key) => prompts[key]);
  }

  if (ctx.property) {
    const name = ctx.property.name;
    return [
      `What is ${name} worth now?`,
      `What's the equity and LTV for ${name}?`,
      `Show the documents for ${name}`,
    ];
  }

  if (ctx.portfolio) {
    return [
      "What's my occupancy rate?",
      "How much rent have I collected this month?",
      "Which properties need attention?",
    ];
  }

  return [];
}

export function AIOverlay({ open, onClose, pathname, sessionId }: AIOverlayProps) {
  // ── Chat-core state (extracted to hook, shared with FloatingAgentChat) ─────
  const chat = useAgentChat(pathname);

  // ── Overlay-local state ───────────────────────────────────────────────────
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("chat");
  const [bootstrapped, setBootstrapped] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<AiWorkspaceDocument | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // ── Bootstrap on open ────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setBootstrapped(false);
      setSelectedDoc(null);
      return;
    }
    setMobilePanel("chat");
    // Pass sessionId prop so Agent Hub deep-links land on the right thread.
    void chat.loadBootstrap(sessionId).then(() => setBootstrapped(true));
  }, [open, sessionId]);

  // ── Refresh context when pathname changes while open ─────────────────────
  useEffect(() => {
    if (!open || !bootstrapped) return;
    void (async () => {
      const result = await refreshOverlayContext(pathname);
      if (result.ok) chat.setContext(result.data);
    })();
  }, [pathname, open, bootstrapped]);

  // ── Keyboard + body-scroll lock ──────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
  }, [open]);

  // ── Session sidebar handlers (AIOverlay-specific, not in the hook) ───────
  async function handleSelectSession(sid: string) {
    if (sid === chat.activeSessionId) {
      setMobilePanel("chat");
      return;
    }
    chat.setIsLoading(true);
    const result = await loadSessionMessages(sid);
    chat.setIsLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    chat.setActiveSessionId(sid);
    chat.setMessages(result.data);
    setMobilePanel("chat");
  }

  async function handleNewSession() {
    chat.setIsCreating(true);
    const result = await createSession(pathname);
    chat.setIsCreating(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    chat.setSessions((prev) => [result.data.session, ...prev]);
    chat.setActiveSessionId(result.data.session.id);
    chat.setMessages(result.data.messages);
    setMobilePanel("chat");
  }

  async function handleArchiveSession(sid: string) {
    const result = await archiveSession(sid);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const remaining = chat.sessions.filter((s) => s.id !== sid);
    chat.setSessions(remaining);
    if (chat.activeSessionId === sid) {
      const nextId = remaining[0]?.id ?? null;
      chat.setActiveSessionId(nextId);
      if (nextId) {
        const msgResult = await loadSessionMessages(nextId);
        if (msgResult.ok) chat.setMessages(msgResult.data);
      } else {
        chat.setMessages([]);
      }
    }
  }

  function handleSystemStatus() {
    const docCount = chat.context?.documents.length ?? 0;
    const sessionCount = chat.sessions.length;
    toast.info(
      `Valgate Agent online · ${sessionCount} session${sessionCount === 1 ? "" : "s"} · ${docCount} document${docCount === 1 ? "" : "s"} in scope`,
    );
  }

  if (!open) return null;

  const header = chat.context?.header ?? {
    title: "Valgate Agent",
    subtitle: null,
    badge: null,
  };

  const activeSessionTitle =
    chat.sessions.find((s) => s.id === chat.activeSessionId)?.title ?? null;

  const isPro = pathname.startsWith("/pro");

  // Steps from the most recent assistant message — drive the Activity pane.
  const latestAssistantSteps = [...chat.messages]
    .reverse()
    .find((m) => m.role === "assistant" && m.steps && m.steps.length > 0)?.steps;

  // What the session is anchored to — the trust-relevant scope (a client, a
  // property, the whole book) plus the page it was opened on.
  const pinned = chat.context
    ? {
        scope:
          chat.context.client?.name ??
          chat.context.property?.name ??
          (chat.context.pathname.startsWith("/pro")
            ? "Book-wide"
            : chat.context.portfolio
              ? "Portfolio"
              : "General"),
        route: routeLabel(chat.context.pathname),
      }
    : null;

  const suggestions = suggestedPrompts(chat.context);

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Valgate Agent assistant"
    >
      <div
        className="ai-overlay-frost absolute inset-0"
        onClick={onClose}
        aria-hidden
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "ai-glass-shell ai-glass-shell--fullscreen pointer-events-none relative z-[1] flex h-full w-full flex-col overflow-hidden outline-none",
          "pt-safe pb-safe",
          "animate-[glass-open_0.35s_cubic-bezier(0.16,1,0.3,1)_both]",
        )}
      >
        <div className="pointer-events-auto relative z-[2] flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-white/40 bg-white/20 px-3 py-2 lg:hidden">
            <button
              type="button"
              onClick={() => setMobilePanel("sessions")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 min-h-11 text-[13px] font-medium",
                mobilePanel === "sessions"
                  ? "bg-white/40 text-foreground"
                  : "text-secondary",
              )}
            >
              <Menu className="size-3.5" />
              Sessions
            </button>
            <button
              type="button"
              onClick={() => setMobilePanel("chat")}
              className={cn(
                "flex flex-1 items-center justify-center rounded-lg py-2.5 min-h-11 text-[13px] font-medium",
                mobilePanel === "chat" ? "bg-white/40 text-foreground" : "text-secondary",
              )}
            >
              Chat
            </button>
            <button
              type="button"
              onClick={() => setMobilePanel("assets")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 min-h-11 text-[13px] font-medium",
                mobilePanel === "assets" ? "bg-white/40 text-foreground" : "text-secondary",
              )}
            >
              <PanelRight className="size-3.5" />
              Assets
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <div
              className={cn(
                "min-h-0",
                mobilePanel === "sessions" ? "flex w-full" : "hidden lg:flex",
              )}
            >
              <AISessionSidebar
                sessions={chat.sessions}
                activeSessionId={chat.activeSessionId}
                isOnline={bootstrapped && !chat.loadError}
                onSelectSession={handleSelectSession}
                onNewSession={handleNewSession}
                onArchiveSession={handleArchiveSession}
                onClose={onClose}
                onSystemStatus={handleSystemStatus}
                isCreating={chat.isCreating}
              />
            </div>

            <div
              className={cn(
                "min-h-0 min-w-0 flex-1",
                mobilePanel === "chat" ? "flex flex-col" : "hidden lg:flex lg:flex-col",
              )}
            >
              <AIChatPane
                header={header}
                sessionTitle={activeSessionTitle}
                latestAssistantMsgId={chat.latestAssistantMsgId}
                messages={chat.messages}
                userInitials={chat.context?.userInitials ?? "U"}
                documents={chat.context?.documents ?? []}
                onOpenDocument={setSelectedDoc}
                inputValue={chat.inputValue}
                onInputChange={chat.setInputValue}
                onSend={chat.send}
                onRetryLoad={chat.loadError ? chat.loadBootstrap : undefined}
                isSending={chat.isSending}
                isLoading={chat.isLoading && chat.messages.length === 0}
                loadError={chat.loadError}
                agentMode={chat.agentMode}
                isPro={isPro}
                pinnedContext={pinned}
                suggestions={suggestions}
                onApprove={chat.approve}
                onReject={chat.reject}
                onUndo={chat.undo}
                approvePendingId={chat.approvePendingId}
              />
            </div>

            {(chat.context || chat.isLoading) && (
              <div
                className={cn(
                  "min-h-0",
                  mobilePanel === "assets" ? "flex w-full" : "hidden lg:flex",
                )}
              >
                <AIWorkspaceAssets
                  documents={chat.context?.documents ?? []}
                  portfolioBars={chat.context?.portfolioBars ?? []}
                  yieldHref={chat.context?.yieldHref ?? "/portfolio"}
                  portfolio={chat.context?.portfolio ?? null}
                  onOpenDocument={setSelectedDoc}
                  activitySteps={latestAssistantSteps}
                  isLoading={chat.isLoading}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <AIDocumentModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
    </div>
  );
}
