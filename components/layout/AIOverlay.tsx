"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Menu, PanelRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/components/ui/utils";
import {
  archiveSession,
  createSession,
  getOverlayBootstrap,
  loadSessionMessages,
  refreshOverlayContext,
  sendMessage,
  type AiOverlayBootstrap,
} from "@/lib/actions/ai-overlay.actions";
import type { AiMessage } from "@/lib/data/types/ai-message";
import type { AiSession } from "@/lib/data/types/ai-session";
import type { AiOverlayClientContext } from "@/lib/data/derivations/ai-context";
import { AISessionSidebar } from "./ai-overlay/AISessionSidebar";
import { AIChatPane } from "./ai-overlay/AIChatPane";
import { AIWorkspaceAssets } from "./ai-overlay/AIWorkspaceAssets";

interface AIOverlayProps {
  open: boolean;
  onClose: () => void;
  pathname: string;
}

type MobilePanel = "sessions" | "chat" | "assets";

export function AIOverlay({ open, onClose, pathname }: AIOverlayProps) {
  const [context, setContext] = useState<AiOverlayClientContext | null>(null);
  const [sessions, setSessions] = useState<AiSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("chat");
  const [bootstrapped, setBootstrapped] = useState(false);
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
    setLoadError(null);
  }, []);

  const loadBootstrap = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    const result = await getOverlayBootstrap(pathnameRef.current, activeSessionIdRef.current);
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
      return;
    }
    setMobilePanel("chat");
    void loadBootstrap();
  }, [open, loadBootstrap]);

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
          "animate-[glass-open_0.35s_cubic-bezier(0.16,1,0.3,1)_both]",
        )}
      >
        <div className="pointer-events-auto relative z-[2] flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-white/40 bg-white/20 px-3 py-2 lg:hidden">
            <button
              type="button"
              onClick={() => setMobilePanel("sessions")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium",
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
                "flex flex-1 items-center justify-center rounded-lg py-2 text-xs font-medium",
                mobilePanel === "chat" ? "bg-white/40 text-foreground" : "text-secondary",
              )}
            >
              Chat
            </button>
            <button
              type="button"
              onClick={() => setMobilePanel("assets")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium",
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
                messages={messages}
                userInitials={context?.userInitials ?? "U"}
                documents={context?.documents ?? []}
                inputValue={inputValue}
                onInputChange={setInputValue}
                onSend={handleSend}
                onRetryLoad={loadError ? loadBootstrap : undefined}
                isSending={isSending}
                isLoading={isLoading && messages.length === 0}
                loadError={loadError}
              />
            </div>

            {context && (
              <div
                className={cn(
                  "min-h-0",
                  mobilePanel === "assets" ? "flex w-full" : "hidden lg:flex",
                )}
              >
                <AIWorkspaceAssets
                  documents={context.documents}
                  portfolioBars={context.portfolioBars}
                  yieldHref={context.yieldHref}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
