"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { CountUpText } from "./motion-primitives";

// One KPI cell in the strip. The delta row is optional: when a metric
// has no real prior-period comparison we show a plain sub-label (or
// nothing) instead of inventing a delta.
export type KpiMetric = {
  value: string;
  label: string;
  subLabel?: string;
  deltaLabel?: string;
  deltaDirection?: "up" | "down" | "flat";
};

type Props = {
  metrics: KpiMetric[];
  ariaLabel: string;
};

export function KpiMetricStrip({ metrics, ariaLabel }: Props) {
  return (
    <section
      aria-label={ariaLabel}
      className="overflow-hidden rounded-lg border border-slate-200"
    >
      <div className="grid grid-cols-1 gap-px bg-slate-200 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => (
          <KpiCell key={metric.label} {...metric} />
        ))}
      </div>
    </section>
  );
}

function KpiCell({
  value,
  label,
  subLabel,
  deltaLabel,
  deltaDirection,
}: KpiMetric) {
  const isLongValue = value.length > 14;

  const deltaTone =
    deltaDirection === "up"
      ? "text-emerald-600"
      : deltaDirection === "down"
        ? "text-red-600"
        : "text-slate-400";

  const DeltaIcon =
    deltaDirection === "up"
      ? ArrowUpRight
      : deltaDirection === "down"
        ? ArrowDownRight
        : Minus;

  return (
    <article className="flex min-h-[6.75rem] flex-col bg-white px-5 py-4 transition-colors hover:bg-slate-50/80">
      <div className="flex flex-col gap-2">
        <p className="text-[11.5px] font-medium leading-snug text-slate-500">
          {label}
        </p>
        <p
          className={cn(
            "font-semibold tracking-tight text-slate-900",
            isLongValue
              ? "text-[14px] leading-snug"
              : "text-[1.75rem] leading-none tabular-nums",
          )}
        >
          <CountUpText text={value} />
        </p>
      </div>

      {deltaLabel ? (
        <div className="mt-auto flex items-center gap-1.5 border-t border-slate-100 pt-3">
          <DeltaIcon
            className={cn("h-3.5 w-3.5 shrink-0", deltaTone)}
            aria-hidden
          />
          <span className="text-[12px] leading-snug text-slate-500">
            {deltaLabel}
          </span>
        </div>
      ) : subLabel ? (
        <div className="mt-auto flex items-center border-t border-slate-100 pt-3">
          <span className="text-[12px] leading-snug text-slate-500">
            {subLabel}
          </span>
        </div>
      ) : null}
    </article>
  );
}
