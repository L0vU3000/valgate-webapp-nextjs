"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronRight, FileText } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/components/ui/utils";
import { AIMarkdown } from "./AIMarkdown";
import { ApprovalGate } from "./ApprovalGate";
import type { AiMessage } from "@/lib/data/types/ai-message";
import type { AiWorkspaceDocument } from "@/lib/data/derivations/ai-context";
import {
  glassArtifactIcon,
  glassIconBox,
  glassUserAvatar,
  glassUserBubble,
} from "./glass-styles";

function AIAvatar() {
  return (
    <div
      className="ai-glass-avatar flex size-8 shrink-0 items-center justify-center rounded-lg"
      style={glassIconBox}
      aria-hidden
    >
      <Image
        src="/valgate-icon.svg"
        alt=""
        width={18}
        height={18}
        className="size-[18px]"
      />
    </div>
  );
}

function formatBytes(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ToolStepRow({
  summary,
  failed,
  index,
  reduceMotion,
  compact = false,
}: {
  summary: string;
  failed: boolean;
  index: number;
  reduceMotion: boolean | null;
  compact?: boolean;
}) {
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.22,
        delay: reduceMotion ? 0 : index * 0.05,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3",
        compact ? "py-2.5" : "py-2",
        failed
          ? "animate-[ai-shake_0.4s_ease-out_1] border-red-200 bg-red-50/80 motion-reduce:animate-none dark:border-red-900/50 dark:bg-red-950/40"
          : "border-interactive-primary/15 bg-interactive-primary/5",
      )}
    >
      <span
        className={cn(
          "mt-0.5 size-1.5 shrink-0 rounded-full",
          failed ? "mt-1 bg-red-500/70" : "bg-interactive-primary/50",
        )}
      />
      <span
        className={cn(
          "leading-relaxed",
          compact ? "text-[11.5px]" : "text-[12px]",
          failed
            ? "text-red-800 dark:text-red-200"
            : "text-interactive-primary/80",
        )}
      >
        {summary}
      </span>
    </motion.div>
  );
}

// Fast typing reveal — 6 chars per 10ms tick ≈ 600 chars/sec
function useTypingText(fullText: string, isNew: boolean) {
  const [displayed, setDisplayed] = useState(isNew ? "" : fullText);
  const [done, setDone] = useState(!isNew);

  useEffect(() => {
    if (!isNew) {
      setDisplayed(fullText);
      setDone(true);
      return;
    }

    // Reset on each effect run so StrictMode double-invoke works cleanly
    setDisplayed("");
    setDone(false);
    let i = 0;

    const interval = setInterval(() => {
      i = Math.min(i + 6, fullText.length);
      setDisplayed(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, 10);

    return () => clearInterval(interval);
  }, [isNew, fullText]);

  return { displayed, done };
}

type AIMessageBubbleProps = {
  message: AiMessage;
  userInitials: string;
  documentsById: Map<string, AiWorkspaceDocument>;
  onOpenDocument: (doc: AiWorkspaceDocument) => void;
  index?: number;
  isNew?: boolean;
  onApprove?: (messageId: string) => void;
  onReject?: (messageId: string) => void;
  onUndo?: (messageId: string) => void;
  approvePendingId?: string | null;
};

export function AIMessageBubble({
  message,
  userInitials,
  documentsById,
  onOpenDocument,
  index = 0,
  isNew = false,
  onApprove,
  onReject,
  onUndo,
  approvePendingId,
}: AIMessageBubbleProps) {
  const reduceMotion = useReducedMotion();
  const artifacts =
    message.artifactDocIds
      ?.map((id) => documentsById.get(id))
      .filter(Boolean) ?? [];

  const { displayed, done } = useTypingText(
    message.content,
    isNew && message.role === "assistant",
  );

  if (message.role === "user") {
    return (
      <div
        className="flex w-full justify-end animate-[glass-card-in_0.4s_ease-out_both] motion-reduce:animate-none"
        style={{ animationDelay: `${0.25 + index * 0.05}s` }}
      >
        <div className="flex max-w-[640px] flex-row-reverse items-start gap-3 sm:gap-4">
          <div
            className="rounded-2xl rounded-br-md px-4 py-4"
            style={glassUserBubble}
          >
            <p className="text-sm leading-5 text-white">{message.content}</p>
          </div>
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-full"
            style={glassUserAvatar}
            aria-hidden
          >
            <span className="text-xs font-semibold text-secondary">{userInitials}</span>
          </div>
        </div>
      </div>
    );
  }

  const hasProposedAction = !!message.proposedAction;
  const isPendingApprove = approvePendingId === message.id;

  return (
    <div
      className="flex w-full max-w-[768px] gap-3 animate-[glass-card-in_0.4s_ease-out_both] motion-reduce:animate-none sm:gap-4"
      style={{ animationDelay: `${0.2 + index * 0.05}s` }}
    >
      <AIAvatar />
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {/* Agent activity trace — show tool steps if present */}
        {message.steps && message.steps.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {message.steps.map((step, i) => (
              <ToolStepRow
                key={i}
                summary={step.summary}
                failed={step.ok === false}
                index={i}
                reduceMotion={reduceMotion}
              />
            ))}
          </div>
        )}

        {/* Message text */}
        <div className="min-w-0 break-words text-[16px] leading-[26px] text-foreground">
          {done ? (
            <AIMarkdown content={message.content} />
          ) : (
            <p className="whitespace-pre-wrap">
              {displayed}
              <span className="ml-px inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse rounded-sm bg-interactive-primary/60" />
            </p>
          )}
        </div>

        {/* Document artifacts */}
        {artifacts.map((doc) => (
          <button
            key={doc!.id}
            type="button"
            onClick={() => onOpenDocument(doc!)}
            className="ai-glass-card flex w-full items-start gap-4 rounded-xl p-5 text-left transition-transform hover:-translate-y-0.5"
          >
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-lg"
              style={glassArtifactIcon}
            >
              <FileText className="size-5 text-[#0891b2]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.6px] text-[#0891b2]">
                  Artifact
                </span>
                {doc!.sizeBytes != null && (
                  <span className="text-[10px] text-secondary">
                    PDF · {formatBytes(doc!.sizeBytes)}
                  </span>
                )}
              </div>
              <p className="text-[16px] font-semibold leading-6 text-foreground">{doc!.name}</p>
              <p className="mt-0.5 text-sm leading-5 text-secondary">{doc!.propertyId}</p>
            </div>
            <ChevronRight className="mt-1 size-4.5 shrink-0 text-secondary" />
          </button>
        ))}

        {/* Approval gate — rendered when agent has proposed an action */}
        {hasProposedAction && (
          <ApprovalGate
            action={message.proposedAction!}
            result={message.actionResult}
            onApprove={() => onApprove?.(message.id)}
            onReject={() => onReject?.(message.id)}
            onUndo={() => onUndo?.(message.id)}
            isPending={isPendingApprove}
          />
        )}
      </div>
    </div>
  );
}

export function AIThinkingIndicator() {
  return (
    <div className="flex w-full max-w-[768px] items-center gap-3 animate-[glass-card-in_0.4s_ease-out_0.45s_both] motion-reduce:animate-none sm:gap-4">
      <AIAvatar />
      <div className="ai-glass-thinking flex items-center gap-1.5 rounded-2xl px-4 py-4">
        <span className="ai-dot size-[6px] rounded-full bg-interactive-primary/40" />
        <span
          className="ai-dot size-[6px] rounded-full bg-interactive-primary/40"
          style={{ animationDelay: "160ms" }}
        />
        <span
          className="ai-dot size-[6px] rounded-full bg-interactive-primary/40"
          style={{ animationDelay: "320ms" }}
        />
        <span className="pl-2 text-xs font-medium text-interactive-primary">
          Valgate Agent is working…
        </span>
      </div>
    </div>
  );
}
