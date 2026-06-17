"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Menu, PanelRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/components/ui/utils";
import {
  archiveSession,
  approveProposedAction,
  rejectProposedAction,
  undoApprovedAction,
  createSession,
  getOverlayBootstrap,
  loadSessionMessages,
  refreshOverlayContext,
  sendMessage,
  type AiOverlayBootstrap,
  type AiOverlayAgentMode,
} from "@/lib/actions/ai-overlay.actions";
import type { AiMessage } from "@/lib/data/types/ai-message";
import type { AiSession } from "@/lib/data/types/ai-session";
import type { AiOverlayClientContext } from "@/lib/data/derivations/ai-context";
import type { AiWorkspaceDocument } from "@/lib/data/derivations/ai-context";
import { AIDocumentModal } from "./ai-overlay/AIDocumentModal";
import { AISessionSidebar } from "./ai-overlay/AISessionSidebar";
import { AIChatPane } from "./ai-overlay/AIChatPane";
import { AIWorkspaceAssets } from "./ai-overlay/AIWorkspaceAssets";

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
function suggestedPrompts(ctx: AiOverlayClientContext): string[] {
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
  const [context, setContext] = useState<AiOverlayClientContext | null>(null);
  const [sessions, setSessions] = useState<AiSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [agentMode, setAgentMode] = useState<AiOverlayAgentMode>("basic");
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("chat");
  const [bootstrapped, setBootstrapped] = useState(false);
  const [latestAssistantMsgId, setLatestAssistantMsgId] = useState<string | null>(null);
  const [approvePendingId, setApprovePendingId] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<AiWorkspaceDocument | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  const pathnameRef = useRef(pathname);

  activeSessionIdRef.current = activeSessionId;
  pathnameRef.current = pathname;

  const applyBootstrap = useCallback((data: AiOverlayBootstrap) => {
    setContext(data.context);
    setSessions(data.sessions);
    setActiveSessionId(data.activeSessionId);
    setMessages(data.messages);
    setAgentMode(data.agentMode);
    setLoadError(null);
  }, []);

  const loadBootstrap = useCallback(async (overrideSessionId?: string) => {
    setIsLoading(true);
    setLoadError(null);
    const sid = overrideSessionId ?? activeSessionIdRef.current;
    const result = await getOverlayBootstrap(pathnameRef.current, sid);
    setIsLoading(false);
    if (!result.ok) {
      setLoadError(result.error);
      toast.error(result.error);
      return;
    }
    applyBootstrap(result.data);
    setBootstrapped(true);
  }, [applyBootstrap]);

  useEffect(() => {
    if (!open) {
      setBootstrapped(false);
      setSelectedDoc(null);
      return;
    }
    setMobilePanel("chat");
    // Pass sessionId prop so Agent Hub deep-links land on the right thread.
    void loadBootstrap(sessionId);
  }, [open, sessionId]);

  useEffect(() => {
    if (!open || !bootstrapped) return;
    void (async () => {
      const result = await refreshOverlayContext(pathname);
      if (result.ok) setContext(result.data);
    })();
  }, [pathname, open, bootstrapped]);

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

  async function handleSelectSession(sessionId: string) {
    if (sessionId === activeSessionId) {
      setMobilePanel("chat");
      return;
    }
    setIsLoading(true);
    const result = await loadSessionMessages(sessionId);
    setIsLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setActiveSessionId(sessionId);
    setMessages(result.data);
    setMobilePanel("chat");
  }

  async function handleNewSession() {
    setIsCreating(true);
    const result = await createSession(pathname);
    setIsCreating(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setSessions((prev) => [result.data.session, ...prev]);
    setActiveSessionId(result.data.session.id);
    setMessages(result.data.messages);
    setMobilePanel("chat");
  }

  async function handleArchiveSession(sessionId: string) {
    const result = await archiveSession(sessionId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const remaining = sessions.filter((s) => s.id !== sessionId);
    setSessions(remaining);
    if (activeSessionId === sessionId) {
      const nextId = remaining[0]?.id ?? null;
      setActiveSessionId(nextId);
      if (nextId) {
        const msgResult = await loadSessionMessages(nextId);
        if (msgResult.ok) setMessages(msgResult.data);
      } else {
        setMessages([]);
      }
    }
  }

  async function handleSend() {
    const content = inputValue.trim();
    if (!content || isSending) return;

    let sessionId = activeSessionId;
    if (!sessionId) {
      setIsCreating(true);
      const created = await createSession(pathname);
      setIsCreating(false);
      if (!created.ok) {
        toast.error(created.error);
        return;
      }
      sessionId = created.data.session.id;
      setSessions((prev) => [created.data.session, ...prev]);
      setActiveSessionId(sessionId);
      setMessages(created.data.messages);
    }

    setInputValue("");
    setIsSending(true);

    const optimisticUser: AiMessage = {
      id: `temp-${Date.now()}`,
      sessionId,
      role: "user",
      content,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, optimisticUser]);

    const result = await sendMessage({
      sessionId,
      content,
      pathname,
    });

    setIsSending(false);

    if (!result.ok) {
      toast.error(result.error);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
      setInputValue(content);
      return;
    }

    if (result.data.updatedSessionTitle) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, title: result.data.updatedSessionTitle! } : s,
        ),
      );
    }

    const lastAssistant = [...result.data.messages].reverse().find((m) => m.role === "assistant");
    setLatestAssistantMsgId(lastAssistant?.id ?? null);
    setMessages(result.data.messages);
  }

  async function handleApprove(messageId: string) {
    setApprovePendingId(messageId);
    const result = await approveProposedAction(messageId);
    setApprovePendingId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setMessages(result.data.messages);
  }

  async function handleReject(messageId: string) {
    const result = await rejectProposedAction(messageId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setMessages(result.data.messages);
  }

  async function handleUndo(messageId: string) {
    const result = await undoApprovedAction(messageId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setMessages(result.data.messages);
  }

  function handleSystemStatus() {
    const docCount = context?.documents.length ?? 0;
    const sessionCount = sessions.length;
    toast.info(
      `Valgate Agent online · ${sessionCount} session${sessionCount === 1 ? "" : "s"} · ${docCount} document${docCount === 1 ? "" : "s"} in scope`,
    );
  }

  if (!open) return null;

  const header = context?.header ?? {
    title: "Valgate Agent",
    subtitle: null,
    badge: null,
  };

  const activeSessionTitle =
    sessions.find((s) => s.id === activeSessionId)?.title ?? null;

  const isPro = pathname.startsWith("/pro");

  // Steps from the most recent assistant message — drive the Activity pane.
  const latestAssistantSteps = [...messages]
    .reverse()
    .find((m) => m.role === "assistant" && m.steps && m.steps.length > 0)?.steps;

  // What the session is anchored to — the trust-relevant scope (a client, a
  // property, the whole book) plus the page it was opened on.
  const pinned = context
    ? {
        scope:
          context.client?.name ??
          context.property?.name ??
          (context.pathname.startsWith("/pro")
            ? "Book-wide"
            : context.portfolio
              ? "Portfolio"
              : "General"),
        route: routeLabel(context.pathname),
      }
    : null;

  const suggestions = context ? suggestedPrompts(context) : [];

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
                sessions={sessions}
                activeSessionId={activeSessionId}
                isOnline={bootstrapped && !loadError}
                onSelectSession={handleSelectSession}
                onNewSession={handleNewSession}
                onArchiveSession={handleArchiveSession}
                onClose={onClose}
                onSystemStatus={handleSystemStatus}
                isCreating={isCreating}
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
                latestAssistantMsgId={latestAssistantMsgId}
                messages={messages}
                userInitials={context?.userInitials ?? "U"}
                documents={context?.documents ?? []}
                onOpenDocument={setSelectedDoc}
                inputValue={inputValue}
                onInputChange={setInputValue}
                onSend={handleSend}
                onRetryLoad={loadError ? loadBootstrap : undefined}
                isSending={isSending}
                isLoading={isLoading && messages.length === 0}
                loadError={loadError}
                agentMode={agentMode}
                isPro={isPro}
                pinnedContext={pinned}
                suggestions={suggestions}
                onApprove={handleApprove}
                onReject={handleReject}
                onUndo={handleUndo}
                approvePendingId={approvePendingId}
              />
            </div>

            {(context || isLoading) && (
              <div
                className={cn(
                  "min-h-0",
                  mobilePanel === "assets" ? "flex w-full" : "hidden lg:flex",
                )}
              >
                <AIWorkspaceAssets
                  documents={context?.documents ?? []}
                  portfolioBars={context?.portfolioBars ?? []}
                  yieldHref={context?.yieldHref ?? "/portfolio"}
                  portfolio={context?.portfolio ?? null}
                  onOpenDocument={setSelectedDoc}
                  activitySteps={latestAssistantSteps}
                  isLoading={isLoading}
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
