"use client";

import { Bot } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { AgentRunCard } from "./AgentRunCard";
import type { AgentHubData } from "../../queries";
import type { AgentRunStatus } from "@/lib/data/types/agent-run";

// Pipeline columns — status dot color only; no colored backgrounds or borders.
const COLUMNS: Array<{
  status: AgentRunStatus;
  label: string;
  dotClass: string;
  emptyText: string;
}> = [
  {
    status: "watching",
    label: "Watching",
    dotClass: "bg-blue-400",
    emptyText: "No agents actively watching.",
  },
  {
    status: "detected",
    label: "Detected",
    dotClass: "bg-orange-400",
    emptyText: "Nothing detected.",
  },
  {
    status: "needs-approval",
    label: "Needs Approval",
    dotClass: "bg-amber-400",
    emptyText: "No pending approvals.",
  },
  {
    status: "done",
    label: "Done",
    dotClass: "bg-emerald-400",
    emptyText: "No completed actions yet.",
  },
];

export function AgentHubPage({ data }: { data: AgentHubData }) {
  const { runs } = data;

  function runsForColumn(status: AgentRunStatus) {
    return runs.filter((r) => r.derivedStatus === status);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Page header — title + run count only; no legend chips */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border-default px-6 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-default bg-surface-tint">
          <Bot className="h-5 w-5 text-secondary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold text-foreground">Agent Hub</h1>
          <p className="text-[12px] text-secondary">
            {runs.length} agent run{runs.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {/* Kanban board — lanes, not boxes */}
      <div className="min-h-0 flex-1 overflow-x-auto">
        <div className="flex h-full gap-6 p-8">
          {COLUMNS.map((col) => {
            const colRuns = runsForColumn(col.status);

            return (
              <div key={col.status} className="flex min-w-[260px] flex-1 flex-col">
                {/* Column label: quiet dot + text + count */}
                <div className="mb-4 flex items-center gap-2">
                  <span
                    className={cn("h-2 w-2 shrink-0 rounded-full", col.dotClass)}
                  />
                  <span className="text-[12.5px] font-semibold text-foreground">
                    {col.label}
                  </span>
                  <span className="text-[11.5px] tabular-nums text-secondary">
                    {colRuns.length}
                  </span>
                </div>

                {/* Hairline divider */}
                <div className="mb-5 h-px bg-border-default" />

                {/* Cards */}
                <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
                  {colRuns.length === 0 ? (
                    <p className="py-6 text-center text-[12px] text-secondary">
                      {col.emptyText}
                    </p>
                  ) : (
                    colRuns.map((run) => <AgentRunCard key={run.id} run={run} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
