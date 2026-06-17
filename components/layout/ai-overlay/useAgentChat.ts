"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  approveProposedAction,
  createSession,
  getOverlayBootstrap,
  rejectProposedAction,
  sendMessage,
  undoApprovedAction,
  type AiOverlayAgentMode,
  type AiOverlayBootstrap,
} from "@/lib/actions/ai-overlay.actions";
import type { AiMessage } from "@/lib/data/types/ai-message";
import type { AiSession } from "@/lib/data/types/ai-session";
import type { AiOverlayClientContext } from "@/lib/data/derivations/ai-context";

// Core chat state + server-action handlers, shared between AIOverlay (full-screen)
// and FloatingAgentChat (docked panel). Session sidebar / assets / mobile-tabs
// logic stays in the consumers — this hook only owns the send/approve money-path.
export function useAgentChat(pathname: string) {
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
  const [latestAssistantMsgId, setLatestAssistantMsgId] = useState<string | null>(null);
  const [approvePendingId, setApprovePendingId] = useState<string | null>(null);

  // Refs for stable reads inside async callbacks — avoids stale closure issues.
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

  const loadBootstrap = useCallback(
    async (overrideSessionId?: string | null) => {
      setIsLoading(true);
      setLoadError(null);
      const sid = overrideSessionId ?? activeSessionIdRef.current;
      const result = await getOverlayBootstrap(pathnameRef.current, sid ?? undefined);
      setIsLoading(false);
      if (!result.ok) {
        setLoadError(result.error);
        toast.error(result.error);
        return;
      }
      applyBootstrap(result.data);
    },
    [applyBootstrap],
  );

  async function send() {
    const content = inputValue.trim();
    if (!content || isSending) return;

    let sessionId = activeSessionIdRef.current;
    if (!sessionId) {
      setIsCreating(true);
      const created = await createSession(pathnameRef.current);
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
      pathname: pathnameRef.current,
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

    const lastAssistant = [...result.data.messages]
      .reverse()
      .find((m) => m.role === "assistant");
    setLatestAssistantMsgId(lastAssistant?.id ?? null);
    setMessages(result.data.messages);
  }

  async function approve(messageId: string) {
    setApprovePendingId(messageId);
    const result = await approveProposedAction(messageId);
    setApprovePendingId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setMessages(result.data.messages);
  }

  async function reject(messageId: string) {
    const result = await rejectProposedAction(messageId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setMessages(result.data.messages);
  }

  async function undo(messageId: string) {
    const result = await undoApprovedAction(messageId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setMessages(result.data.messages);
  }

  return {
    // State values
    context,
    setContext,
    sessions,
    setSessions,
    activeSessionId,
    setActiveSessionId,
    messages,
    setMessages,
    inputValue,
    setInputValue,
    isLoading,
    setIsLoading,
    isSending,
    isCreating,
    setIsCreating,
    loadError,
    agentMode,
    latestAssistantMsgId,
    approvePendingId,
    // Handlers
    loadBootstrap,
    send,
    approve,
    reject,
    undo,
  };
}
