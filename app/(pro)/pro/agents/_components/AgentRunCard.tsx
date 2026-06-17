"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/components/ui/utils";
import { AGENT_CONFIG } from "./agent-config";
import { AgentRunModal } from "./AgentRunModal";
import { useProAgent } from "../../_components/ProAgentContext";
import type { AgentHubRun } from "../../queries";

// Status affordance shown on the right side of the collapsed card.
function StatusBadge({ status }: { status: AgentHubRun["derivedStatus"] }) {
  if (status === "needs-approval") {
    return (
      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700">
        Needs you
      </span>
    );
  }
  if (status === "done") {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />;
  }
  // watching/detected — the animated ring on the icon communicates activity
  return null;
}

export function AgentRunCard({ run }: { run: AgentHubRun }) {
  const { openAI } = useProAgent();
  const reduceMotion = useReducedMotion();
  const [modalOpen, setModalOpen] = useState(false);

  const cfg = AGENT_CONFIG[run.agentKey];
  const Icon = cfg.Icon;

  // Single summary line: finding takes priority over task
  const summaryLine = run.finding ?? run.task;

  // Pulse ring only for active (non-done) runs
  const isActive =
    run.derivedStatus === "watching" || run.derivedStatus === "detected";

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={cn(
          "group w-full text-left",
          "flex items-center gap-3 rounded-xl border bg-surface-base p-3.5",
          "border-border-default shadow-sm",
          "transition-[border-color,box-shadow,transform]",
          "hover:border-slate-300 hover:shadow-[0_1px_4px_rgba(0,0,0,0.08)]",
          "active:scale-[0.985]",
        )}
      >
        {/* Icon with ambient breathing ring for active runs */}
        <div className="relative shrink-0">
          {!reduceMotion && isActive && (
            <span
              className={cn("absolute inset-0 rounded-lg border-2", cfg.ringBorder)}
              style={{ animation: "agent-working 2.4s ease-in-out infinite" }}
            />
          )}
          <div
            className={cn(
              "relative flex h-8 w-8 items-center justify-center rounded-lg border",
              cfg.bg,
              cfg.border,
            )}
          >
            <Icon className={cn("h-4 w-4", cfg.color)} />
          </div>
        </div>

        {/* Agent name + one-line summary */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-semibold text-foreground">
            {cfg.label}
          </p>
          <p className="truncate text-[11.5px] text-secondary">{summaryLine}</p>
        </div>

        {/* Status affordance */}
        <StatusBadge status={run.derivedStatus} />
      </button>

      <AgentRunModal
        run={run}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onOpenThread={(sessionId) => openAI(sessionId)}
      />
    </>
  );
}
