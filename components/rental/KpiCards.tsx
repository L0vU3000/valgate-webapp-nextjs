import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "../ui/utils";
import type { MaintenanceSummaryItem } from "@/lib/data/derivations/rental";

/* -------------------------------------------------------------------------- */
/*  Slot Machine Digit                                                        */
/* -------------------------------------------------------------------------- */

export function SlotDigit({ digit, delay }: { digit: string; delay: number }) {
  const target = parseInt(digit, 10);
  const [active, setActive] = useState(false);
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (reduced) { setActive(true); return; }
    const t = setTimeout(() => setActive(true), delay);
    return () => clearTimeout(t);
  }, [delay, reduced]);

  return (
    <span
      style={{
        display: "inline-block",
        overflow: "hidden",
        height: "1em",
        lineHeight: "1em",
        verticalAlign: "top",
      }}
    >
      <span
        style={{
          display: "flex",
          flexDirection: "column",
          transform: active ? `translateY(-${target * 10}%)` : "translateY(0%)",
          transition:
            active && !reduced
              ? "transform 600ms cubic-bezier(0.16, 1, 0.3, 1)"
              : "none",
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <span
            key={d}
            style={{ display: "block", height: "1em", lineHeight: "1em" }}
          >
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

export function SlotNumber({ value }: { value: string }) {
  let digitIndex = 0;
  return (
    <>
      {value.split("").map((char, i) => {
        if (/\d/.test(char)) {
          const delay = 80 + digitIndex++ * 90;
          return <SlotDigit key={i} digit={char} delay={delay} />;
        }
        return <span key={i} style={{ verticalAlign: "top" }}>{char}</span>;
      })}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  KpiCards Component                                                        */
/* -------------------------------------------------------------------------- */

const sparklineHeights = [40, 55, 45, 70, 85, 96];

const DOT_SEVERITY_COLORS = ["bg-red-700", "bg-orange-400", "bg-slate-200"] as const;

type KpiCardsProps = {
  grossIncome: string;
  incomeTrend: string;
  occupancyPct: number;
  vacancyCost: string;
  collectionRate: string;
  maintenanceItems: MaintenanceSummaryItem[];
  maintenanceTotal: string;
};

export function KpiCards({ grossIncome, incomeTrend, occupancyPct, vacancyCost, collectionRate, maintenanceItems, maintenanceTotal }: KpiCardsProps) {
  const trendUp = incomeTrend.startsWith("+");
  const dots = DOT_SEVERITY_COLORS.map((color, i) => ({
    color,
    active: (maintenanceItems[i]?.count ?? 0) > 0,
  }));

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
      {/* Hero Income Card */}
      <div
        className="rental-hero lg:col-span-7 relative overflow-hidden rounded-lg bg-blue-600 p-5 sm:p-8 shadow-xl"
      >
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-xl bg-blue-500 opacity-20 blur-[32px]" />

        <div className="relative flex flex-col justify-between h-full">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-widest text-blue-200">
              Monthly Gross Income
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[40px] sm:text-[60px] font-extrabold leading-none tracking-tight text-blue-50">
                <SlotNumber value={grossIncome} />
              </span>
              {incomeTrend && (
                <span className={cn(
                  "flex items-center text-sm font-semibold",
                  trendUp ? "text-blue-200" : "text-red-300"
                )}>
                  {trendUp
                    ? <TrendingUp className="mr-1 h-3.5 w-3.5" />
                    : <TrendingDown className="mr-1 h-3.5 w-3.5" />
                  }
                  {incomeTrend}
                </span>
              )}
            </div>
          </div>

          <div className="mt-8 flex h-24 items-end gap-1">
            {sparklineHeights.map((h, i) => (
              <div
                key={i}
                className={cn(
                  "rental-sparkline-bar flex-1 rounded-t-sm",
                  i === sparklineHeights.length - 1
                    ? "bg-white"
                    : "bg-blue-400/30"
                )}
                style={{
                  height: `${h}%`,
                  animationDelay: `${400 + i * 80}ms`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* KPI 2x2 Grid */}
      <div className="lg:col-span-5 grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200">

        {/* Occupancy */}
        <div
          className="anim-enter flex flex-col justify-center bg-white px-6 py-7"
          style={{ animationDelay: "200ms" }}
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Occupancy</span>
          <span className="mt-1 text-3xl font-extrabold text-slate-900">{occupancyPct}%</span>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="rental-bar h-full rounded-full bg-blue-700"
              style={{ width: `${occupancyPct}%`, animationDelay: "600ms" }}
            />
          </div>
        </div>

        {/* Vacancy Loss */}
        <div
          className="anim-enter flex flex-col justify-center bg-white px-6 py-7 border-l border-slate-200"
          style={{ animationDelay: "300ms" }}
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Vacancy Loss</span>
          <span className="mt-1 text-3xl font-extrabold text-slate-900">{vacancyCost}</span>
          <span className="mt-1 text-[10px] font-medium text-red-700">/ mo est.</span>
        </div>

        {/* Collection Rate — Q3.P: Paid Rent $ this month / expected Rent $ this month */}
        <div
          className="anim-enter flex flex-col justify-center bg-white px-6 py-7 border-t border-slate-200"
          style={{ animationDelay: "400ms" }}
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Collection</span>
          <span className="mt-1 text-3xl font-extrabold text-slate-900">{collectionRate}</span>
          <span className="mt-1 text-[10px] font-medium text-green-600">of expected rent received</span>
        </div>

        {/* Maintenance */}
        <div
          className="anim-enter flex flex-col justify-center bg-white px-6 py-7 border-l border-t border-slate-200"
          style={{ animationDelay: "500ms" }}
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Maintenance</span>
          <span className="mt-1 text-3xl font-extrabold text-slate-900">{maintenanceTotal}</span>
          <div className="mt-2 flex gap-1">
            {dots.map((d, j) => (
              <div
                key={j}
                className={cn("h-2 w-2 rounded-full", d.active ? d.color : "bg-slate-100")}
              />
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
