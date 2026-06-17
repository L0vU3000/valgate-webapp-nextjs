"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { ProModal } from "../../_components/pro-modal";
import { ApprovalGate } from "@/components/layout/ai-overlay/ApprovalGate";
import { ToolStepRow } from "@/components/layout/ai-overlay/AIMessageBubble";
import {
  approveProposedAction,
  rejectProposedAction,
  undoApprovedAction,
} from "@/lib/actions/ai-overlay.actions";
import { AGENT_CONFIG } from "./agent-config";
import { cn } from "@/components/ui/utils";
import type { AgentHubRun } from "../../queries";

export function AgentRunModal({
  run,
  open,
  onOpenChange,
  onOpenThread,
}: {
  run: AgentHubRun;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenThread?: (sessionId?: string) => void;
}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [isPending, setIsPending] = useState(false);

  const cfg = AGENT_CONFIG[run.agentKey];
  const Icon = cfg.Icon;
  const proposedAction = run.linkedMessage?.proposedAction;
  const actionResult = run.linkedMessage?.actionResult;

  async function handleApprove() {
    if (!run.linkedMessage?.id) return;
    setIsPending(true);
    const result = await approveProposedAction(run.linkedMessage.id);
    setIsPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.refresh();
    onOpenChange(false);
  }

  async function handleReject() {
    if (!run.linkedMessage?.id) return;
    const result = await rejectProposedAction(run.linkedMessage.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.refresh();
    onOpenChange(false);
  }

  async function handleUndo() {
    if (!run.linkedMessage?.id) return;
    const result = await undoApprovedAction(run.linkedMessage.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.refresh();
    onOpenChange(false);
  }

  return (
    <ProModal
      open={open}
      onOpenChange={onOpenChange}
      title={cfg.label}
      description={run.title}
    >
      <div className="flex flex-col gap-5">
        {/* Agent identity + current task */}
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
              cfg.bg,
              cfg.border,
            )}
          >
            <Icon className={cn("h-5 w-5", cfg.color)} />
          </div>
          <div className="min-w-0">
            <p className="text-[10.5px] font-medium uppercase tracking-wider text-slate-400">
              Current task
            </p>
            <p className="mt-0.5 text-[13px] leading-snug text-slate-700">
              {run.task}
            </p>
          </div>
        </div>

        {/* Finding callout */}
        {run.finding && (
          <div
            className={cn(
              "rounded-lg border px-3 py-2.5 text-[12.5px] font-medium",
              run.derivedStatus === "needs-approval"
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : run.derivedStatus === "done"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-slate-50 text-slate-700",
            )}
          >
            {run.finding}
          </div>
        )}

        {/* Trace steps */}
        {run.steps && run.steps.length > 0 && (
          <div className="flex flex-col gap-1">
            {run.steps.map((step, i) => (
              <ToolStepRow
                key={i}
                summary={step.summary}
                failed={step.ok === false}
                index={i}
                reduceMotion={reduceMotion}
                compact
              />
            ))}
          </div>
        )}

        {/* Approval gate — wired to the real Pro mutations */}
        {proposedAction && (
          <ApprovalGate
            action={proposedAction}
            result={actionResult}
            onApprove={handleApprove}
            onReject={handleReject}
            onUndo={handleUndo}
            isPending={isPending}
          />
        )}

        {/* View thread — opens the overlay on this run's session */}
        {run.sessionId && onOpenThread && (
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onOpenThread(run.sessionId);
            }}
            className="flex items-center gap-1.5 self-start rounded-md px-2.5 py-1.5 text-[12px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            View thread
          </button>
        )}
      </div>
    </ProModal>
  );
}
