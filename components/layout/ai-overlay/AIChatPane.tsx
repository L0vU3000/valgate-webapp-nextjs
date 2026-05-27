"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MapPin, Mic, Paperclip, Send } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { AIMessageBubble, AIThinkingIndicator } from "./AIMessageBubble";
import type { AiMessage } from "@/lib/data/types/ai-message";
import type { AiOverlayHeader, AiWorkspaceDocument } from "@/lib/data/derivations/ai-context";
import { glassToolbarButton } from "./glass-styles";

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
  latestAssistantMsgId?: string | null;
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
  latestAssistantMsgId,
}: AIChatPaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const documentsById = new Map(documents.map((d) => [d.id, d]));
  const inputDisabled = isSending || (isLoading && !loadError);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isSending]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
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
      <header className="shrink-0 px-6 py-4 sm:px-8">
        <div className="mx-auto flex w-full max-w-3xl min-w-0 items-center gap-3">
          <div className="min-w-0 flex-1">
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

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={`Conversation with ${AGENT_NAME}`}
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-6 sm:gap-8 sm:px-8 sm:py-8">
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
              />
            ))
          )}
          {isSending && <AIThinkingIndicator />}
        </div>
      </div>

      <footer className="shrink-0 border-t border-white/30 px-6 py-4 dark:border-white/10 sm:px-8 sm:py-5">
        <div className="mx-auto w-full max-w-3xl">
          <div className="ai-glass-input relative rounded-xl">
            <label htmlFor="ai-chat-input" className="sr-only">
              Message {AGENT_NAME}
            </label>
            <textarea
              id="ai-chat-input"
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a follow-up or command an action..."
              rows={2}
              disabled={inputDisabled}
              className="w-full resize-none rounded-xl border-0 bg-transparent px-4 pb-14 pt-4 text-base leading-relaxed text-foreground placeholder:text-secondary outline-none focus-visible:ring-2 focus-visible:ring-interactive-primary/40 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
            />
            <div className="absolute bottom-2 right-2 flex items-center gap-1 sm:bottom-3 sm:right-3 sm:gap-1.5">
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
