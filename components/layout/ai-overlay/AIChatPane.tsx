"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { MapPin, Mic, Paperclip, Pin, Send, Slash, Sparkles } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { AIMessageBubble, AIThinkingIndicator } from "./AIMessageBubble";
import type { AiMessage } from "@/lib/data/types/ai-message";
import type { AiOverlayHeader, AiWorkspaceDocument } from "@/lib/data/derivations/ai-context";
import type { AiOverlayAgentMode } from "@/lib/actions/ai-overlay.actions";
import { glassToolbarButton } from "./glass-styles";
import {
  CATEGORY_LABELS,
  filterSlashCommands,
  GROUP_LABELS,
  parseSlashQuery,
  type SlashCommand,
} from "./slash-commands";

const AGENT_NAME = "Valgate Agent";

type AIChatPaneProps = {
  header: AiOverlayHeader;
  sessionTitle: string | null;
  messages: AiMessage[];
  userInitials: string;
  documents: AiWorkspaceDocument[];
  onOpenDocument: (doc: AiWorkspaceDocument) => void;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onRetryLoad?: () => void;
  isSending: boolean;
  isLoading: boolean;
  loadError: string | null;
  /** "full" when Anthropic key is present; "basic" when tools/actions are unavailable. */
  agentMode: AiOverlayAgentMode;
  latestAssistantMsgId?: string | null;
  /** True on /pro routes — controls which slash commands are offered. */
  isPro: boolean;
  /** What this session is anchored to, shown as a pinned-context chip. */
  pinnedContext?: { scope: string; route: string } | null;
  /** Proactive opening prompts shown as chips while the session is empty. */
  suggestions?: string[];
  /** Approval gate handlers — passed to each message bubble. */
  onApprove?: (messageId: string) => void;
  onReject?: (messageId: string) => void;
  onUndo?: (messageId: string) => void;
  approvePendingId?: string | null;
  /** Suppress the internal header row (title, pinned chip, subtitle). Used by
   *  FloatingAgentChat which provides its own compact header above this pane. */
  compact?: boolean;
};

export function AIChatPane({
  header,
  sessionTitle,
  messages,
  userInitials,
  documents,
  onOpenDocument,
  inputValue,
  onInputChange,
  onSend,
  onRetryLoad,
  isSending,
  isLoading,
  loadError,
  agentMode,
  latestAssistantMsgId,
  isPro,
  pinnedContext,
  suggestions = [],
  onApprove,
  onReject,
  onUndo,
  approvePendingId,
  compact = false,
}: AIChatPaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const reduceMotion = useReducedMotion();
  const documentsById = new Map(documents.map((d) => [d.id, d]));
  const inputDisabled = isSending || (isLoading && !loadError);

  // ── Slash-command menu state ───────────────────────────────────────────────
  // The menu is shown when the input is a slash command still being typed.
  // `slashDismissed` lets Escape hide it without clearing what was typed; any
  // further edit re-opens it (handled in handleChange).
  const [slashActiveIndex, setSlashActiveIndex] = useState(0);
  const [slashDismissed, setSlashDismissed] = useState(false);

  const slashQuery = parseSlashQuery(inputValue);
  const slashMatches =
    slashQuery !== null ? filterSlashCommands(slashQuery, isPro) : [];
  const slashOpen =
    !inputDisabled && slashQuery !== null && !slashDismissed && slashMatches.length > 0;
  const activeIndex = Math.min(slashActiveIndex, Math.max(0, slashMatches.length - 1));

  // Opening prompts only make sense on a fresh session: show them until the
  // first real exchange, and never while loading, erroring, or mid-command.
  const showSuggestions =
    suggestions.length > 0 &&
    !slashOpen &&
    !loadError &&
    !inputDisabled &&
    messages.length <= 1;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isSending]);

  function handleChange(value: string) {
    onInputChange(value);
    // Typing always re-arms the menu and resets the highlight to the top.
    setSlashDismissed(false);
    setSlashActiveIndex(0);
  }

  // Insert a command's template, then place the cursor on the first [slot] so
  // the user can immediately type the value (e.g. the client or property name).
  function selectSlash(cmd: SlashCommand) {
    onInputChange(cmd.template);
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

  // A suggestion chip pre-fills the composer (and focuses it) rather than
  // sending — the manager stays in control and can tweak before hitting Enter.
  function fillInput(text: string) {
    onInputChange(text);
    setSlashDismissed(true);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(text.length, text.length);
    });
  }

  // The "/" toolbar button: seed the input with a slash and open the menu.
  function openSlashMenu() {
    onInputChange("/");
    setSlashDismissed(false);
    setSlashActiveIndex(0);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(1, 1);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
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
      if (!inputDisabled && inputValue.trim()) onSend();
    }
  }

  return (
    <div
      className={cn(
        "ai-glass-chat flex h-full min-h-0 min-w-0 flex-1 flex-col",
        "motion-reduce:animate-none animate-[glass-panel-center_0.4s_cubic-bezier(0.16,1,0.3,1)_0.15s_both]",
      )}
    >
      {!compact && (
        <>
          <header className="shrink-0 px-6 py-4 sm:px-8">
            <div className="mx-auto flex w-full max-w-3xl min-w-0 items-center gap-3">
              <div className="min-w-0 flex-1">
                {pinnedContext && (
                  <div className="mb-1.5 inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/40 bg-white/30 px-2.5 py-1 text-[11px] font-medium text-secondary dark:border-white/10 dark:bg-white/5">
                    <Pin className="size-3 shrink-0 text-interactive-primary" aria-hidden />
                    <span className="truncate text-foreground">{pinnedContext.scope}</span>
                    <span aria-hidden className="text-secondary/60">·</span>
                    <span className="truncate">{pinnedContext.route}</span>
                  </div>
                )}
                <h3 className="overflow-hidden font-display text-lg font-bold leading-7 text-foreground sm:text-[18px]">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={sessionTitle ?? header.title}
                      initial={{ opacity: 0, y: 6, scaleX: 0.97 }}
                      animate={{ opacity: 1, y: 0, scaleX: 1 }}
                      exit={{ opacity: 0, y: -6, scaleX: 0.97 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="block truncate"
                      style={{ transformOrigin: "left center" }}
                    >
                      {sessionTitle ?? header.title}
                    </motion.span>
                  </AnimatePresence>
                </h3>

                {/* Valgate document accent line — draws left-to-right when a named session is active */}
                <AnimatePresence>
                  {sessionTitle && (
                    <motion.div
                      key="vg-doc-accent"
                      initial={{ scaleX: 0, opacity: 0 }}
                      animate={{ scaleX: 1, opacity: 1 }}
                      exit={{ scaleX: 0, opacity: 0 }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.22 }}
                      className="mt-1 h-[1.5px] origin-left rounded-full"
                      style={{
                        background:
                          "linear-gradient(90deg, rgba(37,99,235,0.65) 0%, rgba(37,99,235,0.25) 55%, transparent 100%)",
                      }}
                    />
                  )}
                </AnimatePresence>

                {header.subtitle && (
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <MapPin className="size-3.5 shrink-0 text-secondary" aria-hidden />
                    <p className="truncate text-xs leading-relaxed text-secondary">
                      {header.subtitle}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="ai-glass-divider-h shrink-0" aria-hidden />
        </>
      )}

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={`Conversation with ${AGENT_NAME}`}
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-6 sm:gap-8 sm:px-8 sm:py-8">
          {agentMode === "basic" && !loadError && (
            <div
              className="rounded-lg border border-amber-200/70 bg-amber-50/60 px-4 py-2.5 dark:border-amber-800/40 dark:bg-amber-950/20"
              role="status"
            >
              <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                Running in basic mode — live data tools and actions are unavailable.
              </p>
            </div>
          )}
          {loadError ? (
            <div
              className="flex flex-col items-start gap-3 rounded-xl border border-red-200/80 bg-red-50/80 p-4 dark:border-red-900/50 dark:bg-red-950/40"
              role="alert"
            >
              <p className="text-sm leading-relaxed text-red-800 dark:text-red-200">
                {loadError}
              </p>
              {onRetryLoad && (
                <button
                  type="button"
                  onClick={onRetryLoad}
                  className="ai-glass-cta min-h-11 rounded-lg px-4 py-2 text-sm font-semibold text-interactive-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive-primary focus-visible:ring-offset-2"
                >
                  Try again
                </button>
              )}
            </div>
          ) : isLoading ? (
            <div className="space-y-4" aria-busy="true" aria-label="Loading conversation">
              <div className="h-20 animate-pulse rounded-xl bg-white/30 motion-reduce:animate-none" />
              <div className="h-28 animate-pulse rounded-xl bg-white/30 motion-reduce:animate-none" />
            </div>
          ) : messages.length === 0 ? (
            <div className="rounded-xl border border-white/40 bg-white/20 px-4 py-5 dark:border-white/10 dark:bg-white/5">
              <p className="text-sm font-medium text-foreground">
                Start a conversation with {AGENT_NAME}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-secondary">
                Ask about your portfolio, a property, documents in scope, or what to
                complete next.
              </p>
            </div>
          ) : (
            messages.map((message, index) => (
              <AIMessageBubble
                key={message.id}
                message={message}
                userInitials={userInitials}
                documentsById={documentsById}
                onOpenDocument={onOpenDocument}
                index={index}
                isNew={message.id === latestAssistantMsgId}
                onApprove={onApprove}
                onReject={onReject}
                onUndo={onUndo}
                approvePendingId={approvePendingId}
              />
            ))
          )}
          {isSending && <AIThinkingIndicator />}
        </div>
      </div>

      <footer className="shrink-0 border-t border-white/30 px-6 py-4 dark:border-white/10 sm:px-8 sm:py-5">
        <div className="mx-auto w-full max-w-3xl">
          {showSuggestions && (
            <div className="mb-3 flex flex-wrap gap-2" aria-label="Suggested prompts">
              {suggestions.map((suggestion, i) => (
                <motion.button
                  key={suggestion}
                  type="button"
                  onClick={() => fillInput(suggestion)}
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.22,
                    delay: reduceMotion ? 0 : i * 0.04,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/30 px-3 py-2 text-left text-[12.5px] font-medium text-foreground transition-[background-color,transform] hover:bg-white/55 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive-primary/40 motion-reduce:transition-none dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  <Sparkles className="size-3.5 shrink-0 text-interactive-primary" aria-hidden />
                  {suggestion}
                </motion.button>
              ))}
            </div>
          )}
          <div className="ai-glass-input relative rounded-xl">
            <AnimatePresence>
              {slashOpen && (
                <motion.ul
                  id="ai-slash-menu"
                  role="listbox"
                  aria-label="Slash commands"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute bottom-full left-0 right-0 z-10 mb-2 max-h-72 overflow-y-auto rounded-xl border border-white/50 bg-white/85 p-1.5 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/85"
                >
                  {slashMatches.map((cmd, i) => {
                    const prev = i > 0 ? slashMatches[i - 1] : null;
                    const isNewGroup = !prev || prev.group !== cmd.group;
                    const isNewCategory = isNewGroup || prev.category !== cmd.category;
                    return (
                    <li key={cmd.command} role="presentation">
                      {isNewGroup && (
                        <div
                          className="px-3 pb-0.5 pt-3 text-[12.5px] font-semibold text-foreground first:pt-1.5"
                          aria-hidden="true"
                        >
                          {GROUP_LABELS[cmd.group]}
                        </div>
                      )}
                      {isNewCategory && (
                        <div
                          className={cn(
                            "px-3 pb-1 pt-1 text-[10.5px] font-semibold uppercase tracking-wide",
                            cmd.category === "do"
                              ? "text-amber-700/80 dark:text-amber-400/80"
                              : "text-secondary",
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
                        // onMouseDown (not onClick) so the textarea doesn't blur
                        // and swallow the selection before it registers.
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectSlash(cmd);
                        }}
                        onMouseEnter={() => setSlashActiveIndex(i)}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                          i === activeIndex ? "bg-interactive-primary/10" : "hover:bg-black/5 dark:hover:bg-white/5",
                        )}
                      >
                        <code className="mt-0.5 shrink-0 rounded bg-black/5 px-1.5 py-0.5 font-mono text-[12px] font-medium text-interactive-primary dark:bg-white/10">
                          {cmd.command}
                        </code>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-medium text-foreground">
                            {cmd.title}
                          </span>
                          <span className="block truncate text-[12px] text-secondary">
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
            <label htmlFor="ai-chat-input" className="sr-only">
              Message {AGENT_NAME}
            </label>
            <textarea
              ref={textareaRef}
              id="ai-chat-input"
              value={inputValue}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a follow-up, or type / for commands..."
              rows={2}
              disabled={inputDisabled}
              role="combobox"
              aria-expanded={slashOpen}
              aria-controls="ai-slash-menu"
              aria-autocomplete="list"
              className="w-full resize-none rounded-xl border-0 bg-transparent px-4 pb-14 pt-4 text-base leading-relaxed text-foreground placeholder:text-secondary outline-none focus-visible:ring-2 focus-visible:ring-interactive-primary/40 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
            />
            <div className="absolute bottom-2 right-2 flex items-center gap-1 sm:bottom-3 sm:right-3 sm:gap-1.5">
              <button
                type="button"
                onClick={openSlashMenu}
                className="flex size-11 items-center justify-center rounded-lg transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive-primary/40 dark:hover:bg-white/10"
                style={glassToolbarButton}
                aria-label="Slash commands"
                aria-expanded={slashOpen}
              >
                <Slash className="size-5 text-secondary" />
              </button>
              <button
                type="button"
                className="flex size-11 cursor-not-allowed items-center justify-center rounded-lg opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive-primary/40"
                style={glassToolbarButton}
                aria-label="Attach file (coming soon)"
                disabled
              >
                <Paperclip className="size-5 text-secondary" />
              </button>
              <button
                type="button"
                className="flex size-11 cursor-not-allowed items-center justify-center rounded-lg opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive-primary/40"
                style={glassToolbarButton}
                aria-label="Voice input (coming soon)"
                disabled
              >
                <Mic className="size-5 text-secondary" />
              </button>
              <button
                type="button"
                onClick={onSend}
                disabled={inputDisabled || !inputValue.trim()}
                className={cn(
                  "ai-glass-cta flex min-h-11 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-interactive-primary-text",
                  "transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive-primary focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  !inputDisabled && inputValue.trim() && "cursor-pointer",
                )}
              >
                Send
                <Send className="size-3.5" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
