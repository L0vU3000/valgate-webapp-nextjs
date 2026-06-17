"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Maximize2, Minus, Send, Slash, Sparkles } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { AIMessageBubble, AIThinkingIndicator } from "./AIMessageBubble";
import { useAgentChat } from "./useAgentChat";
import { refreshOverlayContext } from "@/lib/actions/ai-overlay.actions";
import { useProAgent } from "@/app/(pro)/pro/_components/ProAgentContext";
import {
  filterSlashCommands,
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
    }
  }

  const sessionTitle =
    chat.sessions.find((s) => s.id === chat.activeSessionId)?.title ?? null;

  const hasContent = chat.inputValue.trim().length > 0;

  return (
    <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 w-[600px] max-w-[calc(100vw-2rem)]">
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
              className="flex flex-col border-b border-slate-100"
              style={{ height: `${PANEL_HEIGHT}px` }}
            >
              {/* Compact header */}
              <div className="flex shrink-0 items-center gap-2.5 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-600/8">
                  <Sparkles
                    className="size-3.5 text-blue-600"
                    style={{ animation: "ai-breathe 3s ease-in-out infinite" }}
                    aria-hidden
                  />
                </div>
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-800">
                  {sessionTitle ?? "Valgate Agent"}
                </span>
                <div className="flex shrink-0 items-center gap-0.5">
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
                    onClick={() => setIsExpanded(false)}
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
                {slashMatches.map((cmd, i) => (
                  <li key={cmd.command} role="presentation">
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
                ))}
              </motion.ul>
            )}
          </AnimatePresence>

          {/* Identity mark */}
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600/8">
            <Sparkles
              className="size-3.5 text-blue-600"
              style={{ animation: "ai-breathe 3s ease-in-out infinite" }}
              aria-hidden
            />
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
  );
}
