"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  FileText,
  History,
  Library,
  Maximize2,
  MessageSquare,
  Minus,
  Plus,
  Send,
  Slash,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/components/ui/utils";
import { AIMessageBubble, AIThinkingIndicator } from "./AIMessageBubble";
import { useAgentChat } from "./useAgentChat";
import { createSession, refreshOverlayContext } from "@/lib/actions/ai-overlay.actions";
import { useProAgent } from "@/app/(pro)/pro/_components/ProAgentContext";
import {
  CATEGORY_LABELS,
  filterSlashCommands,
  GROUP_LABELS,
  parseSlashQuery,
  type SlashCommand,
} from "./slash-commands";
import type { AiWorkspaceDocument } from "@/lib/data/derivations/ai-context";

// Incrementing `count` is the trigger signal — avoids boolean-edge races.
export type FloatingOpenTrigger = { count: number; sessionId?: string };

interface FloatingAgentChatProps {
  pathname: string;
  openTrigger: FloatingOpenTrigger;
}

// Panel height when expanded (messages area + header). The bar adds 54px below.
const PANEL_HEIGHT = 420;

export function FloatingAgentChat({ pathname, openTrigger }: FloatingAgentChatProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [showArtifacts, setShowArtifacts] = useState(false);
  const bootstrappedRef = useRef(false);
  const { openAI } = useProAgent();
  const chat = useAgentChat(pathname);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const slashMenuRef = useRef<HTMLUListElement>(null);
  const reduceMotion = useReducedMotion();

  // ── Slash-command menu state ─────────────────────────────────────────────
  const [slashActiveIndex, setSlashActiveIndex] = useState(0);
  const [slashDismissed, setSlashDismissed] = useState(false);

  const isPro = pathname.startsWith("/pro");
  const slashQuery = parseSlashQuery(chat.inputValue);
  const slashMatches = slashQuery !== null ? filterSlashCommands(slashQuery, isPro) : [];
  const inputDisabled = chat.isSending || (chat.isLoading && !chat.loadError);
  const slashOpen =
    !inputDisabled && slashQuery !== null && !slashDismissed && slashMatches.length > 0;
  const activeIndex = Math.min(slashActiveIndex, Math.max(0, slashMatches.length - 1));

  const documentsById = new Map<string, AiWorkspaceDocument>(
    (chat.context?.documents ?? []).map((d) => [d.id, d]),
  );

  // Every document the agent has generated in this conversation so far,
  // newest first, deduped — the "artifact library" flyout on the right.
  const artifactDocs: AiWorkspaceDocument[] = [];
  const seenArtifactIds = new Set<string>();
  for (let i = chat.messages.length - 1; i >= 0; i--) {
    for (const id of chat.messages[i].artifactDocIds ?? []) {
      if (seenArtifactIds.has(id)) continue;
      const doc = documentsById.get(id);
      if (!doc) continue;
      seenArtifactIds.add(id);
      artifactDocs.push(doc);
    }
  }

  // Auto-scroll to newest message.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.messages, chat.isSending]);

  // Keep the highlighted slash-command row visible inside the scrollable menu.
  useEffect(() => {
    if (!slashOpen) return;
    const active = slashMenuRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    active?.scrollIntoView({ block: "nearest" });
  }, [slashActiveIndex, slashOpen]);

  // Bootstrap + expand, optionally switching to a specific session.
  async function openPanel(sessionId?: string) {
    setIsExpanded(true);
    if (!bootstrappedRef.current) {
      bootstrappedRef.current = true;
      await chat.loadBootstrap(sessionId);
    } else if (sessionId && sessionId !== chat.activeSessionId) {
      await chat.loadBootstrap(sessionId);
    }
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  // External trigger: "View thread" from AgentRunCard.
  useEffect(() => {
    if (openTrigger.count === 0) return;
    void openPanel(openTrigger.sessionId);
    // ponytail: only fire on count change; openPanel reads fresh state via closure
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openTrigger]);

  // Keep context in sync with route changes while panel is open.
  useEffect(() => {
    if (!isExpanded || !bootstrappedRef.current) return;
    void (async () => {
      const result = await refreshOverlayContext(pathname);
      if (result.ok) chat.setContext(result.data);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isExpanded]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function expandToFull() {
    openAI(chat.activeSessionId ?? undefined);
    setIsExpanded(false);
  }

  // Switch the docked panel to a different existing session.
  function selectSession(id: string) {
    setShowSessions(false);
    if (id !== chat.activeSessionId) void chat.loadBootstrap(id);
  }

  async function handleNewSession() {
    setShowSessions(false);
    const result = await createSession(pathname);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    chat.setSessions((prev) => [result.data.session, ...prev]);
    chat.setActiveSessionId(result.data.session.id);
    chat.setMessages(result.data.messages);
  }

  async function handleSend() {
    if (!chat.inputValue.trim() || chat.isSending) return;
    if (!isExpanded) {
      setIsExpanded(true);
      if (!bootstrappedRef.current) {
        bootstrappedRef.current = true;
        // Fire bootstrap in parallel; send() handles session creation itself
        void chat.loadBootstrap();
      }
    }
    await chat.send();
  }

  // Insert the command template and place cursor on the first [slot].
  function selectSlash(cmd: SlashCommand) {
    chat.setInputValue(cmd.template);
    setSlashDismissed(true);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      const open = cmd.template.indexOf("[");
      const close = cmd.template.indexOf("]", open);
      if (open >= 0 && close >= 0) {
        el.setSelectionRange(open, close + 1);
      } else {
        el.setSelectionRange(cmd.template.length, cmd.template.length);
      }
    });
  }

  // Seed "/" into the input and open the menu.
  function openSlashMenu() {
    chat.setInputValue("/");
    setSlashDismissed(false);
    setSlashActiveIndex(0);
    if (!isExpanded) void openPanel();
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(1, 1);
    });
  }

  function handleInputChange(value: string) {
    chat.setInputValue(value);
    // Any edit re-arms the slash menu and resets the highlight.
    setSlashDismissed(false);
    setSlashActiveIndex(0);
    // Auto-expand on first keystroke so the panel is ready when Enter is pressed.
    if (!isExpanded && value.length > 0) {
      void openPanel();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Slash-menu keyboard navigation takes priority.
    if (slashOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashActiveIndex((i) => (i + 1) % slashMatches.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashActiveIndex((i) => (i - 1 + slashMatches.length) % slashMatches.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectSlash(slashMatches[activeIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSlashDismissed(true);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
    if (e.key === "Escape" && isExpanded && !slashOpen) {
      e.preventDefault();
      setIsExpanded(false);
      setShowSessions(false);
      setShowArtifacts(false);
    }
  }

  const sessionTitle =
    chat.sessions.find((s) => s.id === chat.activeSessionId)?.title ?? null;

  const hasContent = chat.inputValue.trim().length > 0;

  return (
    <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 w-[600px] max-w-[calc(100vw-2rem)]">
      <div className="relative">
        {/* Session-select flyout — sits outside the chat box, to its left */}
        <AnimatePresence>
          {showSessions && isExpanded && (
            <motion.div
              key="sessions-drawer"
              initial={reduceMotion ? undefined : { opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, x: 16 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-full top-0 z-30 mr-3 flex w-56 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.13),0_4px_16px_rgba(0,0,0,0.07)]"
              style={{ height: `${PANEL_HEIGHT + 54}px` }}
              role="dialog"
              aria-label="Chat history"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
                <span className="text-[12px] font-semibold text-slate-600">Chats</span>
                <button
                  type="button"
                  onClick={() => setShowSessions(false)}
                  aria-label="Close chat history"
                  className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => void handleNewSession()}
                className="mx-2 mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <Plus className="size-3.5" />
                New chat
              </button>
              <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
                {chat.sessions.length === 0 ? (
                  <p className="px-2 py-4 text-center text-[11.5px] text-slate-400">
                    No chats yet.
                  </p>
                ) : (
                  chat.sessions.map((session) => {
                    const isActive = session.id === chat.activeSessionId;
                    return (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => selectSession(session.id)}
                        className={cn(
                          "mb-0.5 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px]",
                          isActive
                            ? "bg-blue-50 font-medium text-blue-700"
                            : "text-slate-600 hover:bg-slate-50",
                        )}
                      >
                        <MessageSquare className="size-3.5 shrink-0" />
                        <span className="truncate">{session.title}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Artifact library flyout — sits outside the chat box, to its right */}
        <AnimatePresence>
          {showArtifacts && isExpanded && (
            <motion.div
              key="artifacts-drawer"
              initial={reduceMotion ? undefined : { opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, x: -16 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-full top-0 z-30 ml-3 flex w-64 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.13),0_4px_16px_rgba(0,0,0,0.07)]"
              style={{ height: `${PANEL_HEIGHT + 54}px` }}
              role="dialog"
              aria-label="Artifact library"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
                <span className="text-[12px] font-semibold text-slate-600">Artifacts</span>
                <button
                  type="button"
                  onClick={() => setShowArtifacts(false)}
                  aria-label="Close artifact library"
                  className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
                {artifactDocs.length === 0 ? (
                  <p className="px-2 py-4 text-center text-[11.5px] text-slate-400">
                    Nothing generated in this chat yet.
                  </p>
                ) : (
                  artifactDocs.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => {
                        setShowArtifacts(false);
                        expandToFull();
                      }}
                      className="mb-0.5 flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      <FileText className="mt-0.5 size-3.5 shrink-0 text-[#0891b2]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-medium text-slate-800">
                          {doc.name}
                        </span>
                        <span className="block truncate text-[11px] text-slate-400">
                          {doc.propertyId}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/*
         * Single card that grows via `layout` animation.
         * Collapsed:  only the 54px bar row is visible.
         * Expanded:   the 420px panel section appears above the bar.
         * Solid white background — no glassmorphism. Chat content must be readable.
         */}
        <motion.div
        layout
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "w-full overflow-hidden rounded-2xl bg-white",
          "border border-slate-200",
          isExpanded
            ? "shadow-[0_20px_60px_rgba(0,0,0,0.13),0_4px_16px_rgba(0,0,0,0.07)]"
            : "shadow-[0_4px_20px_rgba(0,0,0,0.09),0_1px_4px_rgba(0,0,0,0.05)]",
        )}
        role={isExpanded ? "dialog" : undefined}
        aria-label={isExpanded ? "Valgate Agent — docked chat" : undefined}
        aria-modal={isExpanded ? "false" : undefined}
      >
        {/* ── Expanded panel: header + messages ─────────────────────────────── */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              key="panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.08, duration: 0.18 } }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              className="relative flex flex-col border-b border-slate-100"
              style={{ height: `${PANEL_HEIGHT}px` }}
            >
              {/* Compact header */}
              <div className="flex shrink-0 items-center gap-2.5 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => setShowSessions((v) => !v)}
                  aria-label="Show chat history"
                  aria-expanded={showSessions}
                  title="Chats"
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30",
                    showSessions
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700",
                  )}
                >
                  <History className="size-3.5" />
                </button>
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-800">
                  {sessionTitle ?? "Valgate Agent"}
                </span>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setShowArtifacts((v) => !v)}
                    aria-label="Show artifact library"
                    aria-expanded={showArtifacts}
                    title="Artifacts"
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30",
                      showArtifacts
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700",
                    )}
                  >
                    <Library className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={expandToFull}
                    aria-label="Open in full overlay"
                    title="Expand to full"
                    className="flex size-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                  >
                    <Maximize2 className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsExpanded(false);
                      setShowSessions(false);
                      setShowArtifacts(false);
                    }}
                    aria-label="Collapse chat bar"
                    title="Collapse"
                    className="flex size-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                  >
                    <Minus className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Message stream */}
              <div
                ref={scrollRef}
                className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
                role="log"
                aria-live="polite"
                aria-relevant="additions"
                aria-label="Conversation with Valgate Agent"
              >
                {/* Basic-mode notice */}
                {chat.agentMode === "basic" && !chat.loadError && (
                  <div className="mb-3 rounded-lg border border-amber-200/70 bg-amber-50 px-3 py-2">
                    <p className="text-[11.5px] leading-relaxed text-amber-800">
                      Running in basic mode — live data tools unavailable.
                    </p>
                  </div>
                )}

                {/* Load error */}
                {chat.loadError && (
                  <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                    <p className="text-[12px] leading-relaxed text-red-800">{chat.loadError}</p>
                    <button
                      type="button"
                      onClick={() => chat.loadBootstrap()}
                      className="mt-1.5 text-[12px] font-medium text-red-700 underline-offset-2 hover:underline"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* Loading skeleton */}
                {chat.isLoading && chat.messages.length === 0 && !chat.loadError && (
                  <div className="space-y-3" aria-busy="true">
                    <div className="h-11 animate-pulse rounded-xl bg-slate-100 motion-reduce:animate-none" />
                    <div className="h-16 animate-pulse rounded-xl bg-slate-100 motion-reduce:animate-none" />
                  </div>
                )}

                {/* Empty state */}
                {!chat.isLoading && !chat.loadError && chat.messages.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center pb-6 text-center">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                      <Sparkles className="size-5 text-blue-600" />
                    </div>
                    <p className="text-[13px] font-medium text-slate-700">
                      Ask anything about your portfolio
                    </p>
                    <p className="mt-1 max-w-[280px] text-[12px] leading-relaxed text-slate-400">
                      Rent, work orders, compliance — your agents are watching.
                    </p>
                  </div>
                )}

                {/* Messages */}
                {chat.messages.length > 0 && (
                  <div className="flex flex-col gap-4">
                    {chat.messages.map((message, index) => (
                      <AIMessageBubble
                        key={message.id}
                        message={message}
                        userInitials={chat.context?.userInitials ?? "U"}
                        documentsById={documentsById}
                        onOpenDocument={expandToFull}
                        index={index}
                        isNew={message.id === chat.latestAssistantMsgId}
                        onApprove={chat.approve}
                        onReject={chat.reject}
                        onUndo={chat.undo}
                        approvePendingId={chat.approvePendingId}
                      />
                    ))}
                    {chat.isSending && <AIThinkingIndicator />}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Input bar — always visible ────────────────────────────────────── */}
        {/*
         * `relative` so the slash menu can anchor `bottom-full` above the bar.
         * Collapsed: this IS the full visible card.
         * Expanded:  this is the footer of the panel.
         */}
        <div
          className={cn(
            "relative flex h-[54px] shrink-0 items-center gap-2 px-3",
            !isExpanded && "cursor-text",
          )}
          onClick={!isExpanded ? () => void openPanel() : undefined}
        >
          {/* ── Slash-command menu ─────────────────────────────────────────── */}
          <AnimatePresence>
            {slashOpen && (
              <motion.ul
                ref={slashMenuRef}
                id="floating-slash-menu"
                role="listbox"
                aria-label="Slash commands"
                initial={reduceMotion ? undefined : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: 6 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="absolute bottom-full left-0 right-0 z-10 mb-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
              >
                {slashMatches.map((cmd, i) => {
                  const prev = i > 0 ? slashMatches[i - 1] : null;
                  const isNewGroup = !prev || prev.group !== cmd.group;
                  const isNewCategory = isNewGroup || prev.category !== cmd.category;
                  return (
                  <li key={cmd.command} role="presentation">
                    {isNewGroup && (
                      <div
                        className="px-3 pb-0.5 pt-3 text-[12px] font-semibold text-slate-700 first:pt-1.5"
                        aria-hidden="true"
                      >
                        {GROUP_LABELS[cmd.group]}
                      </div>
                    )}
                    {isNewCategory && (
                      <div
                        className={cn(
                          "px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide",
                          cmd.category === "do" ? "text-amber-600/80" : "text-slate-400",
                        )}
                        aria-hidden="true"
                      >
                        {CATEGORY_LABELS[cmd.category]}
                      </div>
                    )}
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === activeIndex}
                      // onMouseDown keeps focus on the textarea while selecting
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectSlash(cmd);
                      }}
                      onMouseEnter={() => setSlashActiveIndex(i)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                        i === activeIndex
                          ? "bg-blue-50"
                          : "hover:bg-slate-50",
                      )}
                    >
                      <code
                        className={cn(
                          "mt-0.5 shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11.5px] font-medium",
                          i === activeIndex ? "text-blue-600" : "text-slate-500",
                        )}
                      >
                        {cmd.command}
                      </code>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] font-medium text-slate-800">
                          {cmd.title}
                        </span>
                        <span className="block truncate text-[11.5px] text-slate-400">
                          {cmd.description}
                        </span>
                      </span>
                    </button>
                  </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>

          {/* Identity mark — the Valgate mark itself, matching the avatar used in the message stream */}
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600/8">
            <Image src="/valgate-icon.svg" alt="" width={16} height={16} className="size-4" aria-hidden />
          </div>

          {/* Composer textarea */}
          <textarea
            ref={textareaRef}
            value={chat.inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (!isExpanded) void openPanel(); }}
            placeholder="Ask your agents…"
            rows={1}
            disabled={inputDisabled}
            role="combobox"
            aria-expanded={slashOpen}
            aria-controls="floating-slash-menu"
            aria-autocomplete="list"
            aria-label="Message Valgate Agent"
            className={cn(
              "min-w-0 flex-1 resize-none bg-transparent py-0",
              "text-[13.5px] leading-5 text-slate-800 placeholder:text-slate-400",
              "border-0 outline-none ring-0",
              "disabled:cursor-not-allowed disabled:opacity-60",
              "transition-none",
            )}
            style={{ height: "20px", lineHeight: "20px" }}
          />

          {/* Slash button — seeds "/" and opens the command menu */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openSlashMenu();
            }}
            aria-label="Slash commands"
            aria-expanded={slashOpen}
            title="Commands (/)"
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30",
              slashOpen
                ? "bg-blue-50 text-blue-600"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-600",
            )}
          >
            <Slash className="size-4" strokeWidth={2} />
          </button>

          {/* Send button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void handleSend();
            }}
            disabled={!hasContent || inputDisabled}
            aria-label="Send message"
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              "transition-[background-color,opacity,transform] duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
              hasContent && !inputDisabled
                ? "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.90] shadow-sm"
                : "bg-slate-100 text-slate-300 cursor-not-allowed",
            )}
          >
            <Send className="size-3.5" strokeWidth={2} />
          </button>
        </div>
        </motion.div>
      </div>
    </div>
  );
}
