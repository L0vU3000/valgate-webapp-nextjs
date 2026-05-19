"use client";
import { useEffect, useState } from "react";
import type { Trace, TraceStep } from "../_lib/trace";

type Props = {
  trace: Trace;
  onClear: () => void;
  onStepClick?: (step: TraceStep) => void;
};

export function TracePill({ trace, onClear, onStepClick }: Props) {
  const [expanded, setExpanded] = useState(false);

  // Collapse whenever the active trace changes (e.g. user narrowed to a step)
  useEffect(() => {
    setExpanded(false);
  }, [trace]);

  const isExpandable =
    (trace.kind === "incoming" && trace.steps.length > 1) ||
    (trace.kind === "entity" && trace.steps.length > 0);

  const pkCount =
    trace.kind === "entity"
      ? trace.steps.filter((s) => s.target === trace.entity).length
      : 0;
  const fkCount =
    trace.kind === "entity"
      ? trace.steps.filter((s) => s.source === trace.entity).length
      : 0;

  let label: string;
  if (trace.kind === "entity") {
    label = trace.entity;
  } else if (trace.kind === "incoming") {
    const count = trace.steps.length;
    label =
      count === 0
        ? `${trace.entity}.${trace.field} — no incoming references`
        : `${count} table${count === 1 ? "" : "s"} reference ${trace.entity}.${trace.field}`;
  } else if (trace.kind === "forward" && trace.steps.length > 0) {
    const reversed = [...trace.steps].reverse();
    const path = [
      `${reversed[0].target}.id`,
      ...reversed.map((s) => `${s.source}.${s.sourceField}`),
    ];
    label = path.join(" → ");
  } else {
    label = `${trace.entity}.${trace.field}`;
  }

  const pillBorder =
    trace.kind === "incoming"
      ? "border-amber-300"
      : trace.kind === "entity"
        ? "border-indigo-300"
        : "border-sky-300";
  const badgeCls =
    trace.kind === "incoming"
      ? "bg-amber-100 text-amber-700"
      : trace.kind === "entity"
        ? "bg-indigo-100 text-indigo-700"
        : "bg-sky-100 text-sky-700";

  return (
    <div className="pointer-events-auto absolute left-1/2 top-4 z-20 flex w-max max-w-[min(720px,calc(100%-32px))] -translate-x-1/2 flex-col items-stretch">
      {/* Pill row */}
      <div
        role="status"
        aria-live="polite"
        className={`flex items-center gap-2 rounded-full border bg-white/95 px-3 py-1.5 shadow-lg backdrop-blur ${pillBorder}`}
      >
        <span className={`flex h-5 items-center rounded-full px-2 text-[10px] font-semibold uppercase tracking-wider ${badgeCls}`}>
          trace
        </span>
        <span className="flex min-w-0 items-center gap-1.5 truncate font-mono text-[11px] text-neutral-800">
          {label}
          {trace.kind === "entity" && (
            <>
              <span className="flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {pkCount} pk
              </span>
              <span className="flex items-center gap-0.5 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                {fkCount} fk
              </span>
            </>
          )}
        </span>
        {isExpandable && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse paths" : "Show all paths"}
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-neutral-100 hover:text-neutral-900 ${
              expanded ? `${badgeCls}` : "text-neutral-400"
            }`}
          >
            <svg
              width="8"
              height="8"
              viewBox="0 0 8 8"
              fill="none"
              aria-hidden
              className={`transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
            >
              <path
                d="M1 2.5l3 3 3-3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear trace"
          className="ml-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
        >
          ×
        </button>
      </div>

      {/* Expanded step list */}
      {expanded && (
        <div className="mt-1.5 overflow-hidden rounded-xl border border-neutral-200 bg-white/95 shadow-lg backdrop-blur">
          <div className="max-h-60 overflow-y-auto py-1">
            {trace.steps.map((step) => {
              const isPk =
                trace.kind === "entity" && step.target === trace.entity;
              const rowColor = isPk ? "hover:bg-amber-50" : "hover:bg-sky-50";
              const badge = trace.kind === "entity" ? (
                <span
                  className={`shrink-0 rounded px-1 py-px text-[9px] font-bold uppercase tracking-wide ${
                    isPk
                      ? "bg-amber-100 text-amber-700"
                      : "bg-sky-100 text-sky-700"
                  }`}
                >
                  {isPk ? "pk" : "fk"}
                </span>
              ) : null;
              return (
                <button
                  key={step.edgeId}
                  type="button"
                  onClick={() => {
                    onStepClick?.(step);
                    setExpanded(false);
                  }}
                  className={`flex w-full items-center gap-1.5 px-3 py-1.5 text-left transition-colors ${rowColor}`}
                >
                  {badge}
                  <span className="font-mono text-[11px] font-medium text-neutral-700">
                    {isPk ? step.source : step.target}
                  </span>
                  <span className="font-mono text-[11px] text-neutral-400">.</span>
                  <span
                    className={`font-mono text-[11px] ${isPk ? "text-amber-600" : "text-sky-600"}`}
                  >
                    {isPk ? step.sourceField : step.sourceField}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
