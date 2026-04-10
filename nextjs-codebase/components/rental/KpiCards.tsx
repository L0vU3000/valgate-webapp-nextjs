import { useState, useEffect } from "react";
import { TrendingUp } from "lucide-react";
import { cn } from "../ui/utils";

/* -------------------------------------------------------------------------- */
/*  Static Data                                                               */
/* -------------------------------------------------------------------------- */

const kpiCards = [
  { label: "Occupancy", value: "91%", sub: null, bar: 91 },
  { label: "Vacancy Cost", value: "$2,450", sub: "/ Month Realized Loss", subColor: "text-red-700" },
  { label: "Collection", value: "93%", sub: "On-time payment rate", subColor: "text-green-600" },
  {
    label: "Maintenance",
    value: "$4,800",
    sub: null,
    dots: [
      { color: "bg-red-700" },
      { color: "bg-orange-400" },
      { color: "bg-slate-200" },
    ],
  },
] as const;

const sparklineHeights = [40, 55, 45, 70, 85, 96];

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

export function KpiCards() {
  return (
    <section className="grid grid-cols-12 gap-6">
      {/* Hero Income Card */}
      <div
        className="rental-hero col-span-7 relative overflow-hidden rounded-lg bg-blue-600 p-8 shadow-xl"
      >
        {/* Decorative blob */}
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-xl bg-blue-500 opacity-20 blur-[32px]" />

        <div className="relative flex flex-col justify-between h-full">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-widest text-blue-200">
              Monthly Gross Income
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[60px] font-extrabold leading-none tracking-tight text-blue-50">
                <SlotNumber value="$19,600" />
              </span>
              <span className="flex items-center text-sm font-semibold text-blue-200">
                <TrendingUp className="mr-1 h-3.5 w-3.5" />
                +4.2%
              </span>
            </div>
          </div>

          {/* Sparkline -- bars grow upward */}
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
      <div className="col-span-5 grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200">
        {kpiCards.map((kpi, i) => (
          <div
            key={kpi.label}
            className={cn(
              "anim-enter flex flex-col justify-center bg-white px-6 py-7",
              i % 2 !== 0 && "border-l border-slate-200",
              i >= 2 && "border-t border-slate-200"
            )}
            style={{ animationDelay: `${200 + i * 100}ms` }}
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {kpi.label}
            </span>
            <span className="mt-1 text-3xl font-extrabold text-slate-900">
              {kpi.value}
            </span>
            {"bar" in kpi && kpi.bar && (
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="rental-bar h-full rounded-full bg-blue-700"
                  style={{
                    width: `${kpi.bar}%`,
                    animationDelay: "600ms",
                  }}
                />
              </div>
            )}
            {kpi.sub && (
              <span className={cn("mt-1 text-[10px] font-medium", kpi.subColor)}>
                {kpi.sub}
              </span>
            )}
            {"dots" in kpi && kpi.dots && (
              <div className="mt-2 flex gap-1">
                {kpi.dots.map((d, j) => (
                  <div key={j} className={cn("h-2 w-2 rounded-full", d.color)} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
