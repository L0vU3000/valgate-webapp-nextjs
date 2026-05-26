"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Info } from "lucide-react";
import { cn } from "@/components/ui/utils";
import type { PropertyListItem } from "@/lib/data/types/property";
import type { ProgressPillar } from "@/lib/data/types/progress";

interface ProgressModalProps {
  property: PropertyListItem | null;
  onClose: () => void;
  onExplainerClick?: () => void;
}

const EXIT_MS = 160;

function scoreTier(score: number): { label: string; bg: string; text: string } {
  if (score >= 90) return { label: "Complete",      bg: "bg-emerald-50", text: "text-emerald-700" };
  if (score >= 70) return { label: "Good",           bg: "bg-blue-50",    text: "text-blue-700"   };
  if (score >= 40) return { label: "In progress",    bg: "bg-amber-50",   text: "text-amber-600"  };
  return             { label: "Needs attention", bg: "bg-red-50",     text: "text-red-600"    };
}

function pillarBarColor(score: number) {
  if (score === 100) return "bg-emerald-400";
  if (score > 0)     return "bg-blue-500";
  return "bg-slate-200";
}

function useCountUp(target: number, active: boolean, duration = 650) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) { setCount(0); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setCount(Math.round(eased * target));
      if (t < 1) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [active, target, duration]);
  return count;
}

function PillarRow({ pillar, index, animate }: { pillar: ProgressPillar; index: number; animate: boolean }) {
  const allDone = pillar.score === 100;
  const router = useRouter();

  return (
    <div
      className={cn("px-6 py-4 border-b border-slate-50 last:border-0", allDone && "opacity-40")}
      style={
        animate
          ? { animation: `pillar-row-in 380ms cubic-bezier(0.16,1,0.3,1) ${index * 30}ms both` }
          : { opacity: 0 }
      }
    >
      {/* Pillar header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-semibold text-slate-500 truncate">
            {pillar.name}
          </span>
          <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-1.5 py-px rounded shrink-0">
            {pillar.weight}%
          </span>
        </div>
        <span className={cn(
          "text-[12px] font-semibold tabular-nums shrink-0 ml-3",
          allDone ? "text-emerald-500" : pillar.score > 0 ? "text-blue-600" : "text-slate-400"
        )}>
          {pillar.score}%
        </span>
      </div>

      {/* Mini progress bar */}
      <div className="h-[3px] bg-slate-100 rounded-full overflow-hidden mb-3">
        <div
          className={cn("h-full rounded-full", pillarBarColor(pillar.score))}
          style={{
            width: animate ? `${pillar.score}%` : "0%",
            transition: `width 550ms cubic-bezier(0.16,1,0.3,1) ${index * 40}ms`,
          }}
        />
      </div>

      {/* Check items */}
      <div className="space-y-2">
        {pillar.checks.map((check) => (
          <div key={check.label} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {check.done ? (
                <span className="w-[18px] h-[18px] rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-emerald-500 stroke-[2.5]" />
                </span>
              ) : (
                <span className="w-[18px] h-[18px] rounded-full border border-slate-200 shrink-0" />
              )}
              <span className={cn(
                "text-[14px] sm:text-[15px] leading-tight truncate",
                check.done ? "text-slate-400 line-through decoration-slate-300/60" : "text-slate-600"
              )}>
                {check.label}
              </span>
            </div>
            {!check.done && (
              <button
                onClick={() => router.push(pillar.href)}
                className="shrink-0 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-full transition-colors duration-150 whitespace-nowrap"
              >
                Add →
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProgressModal({ property, onClose, onExplainerClick }: ProgressModalProps) {
  const [animate, setAnimate] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [snapshot, setSnapshot] = useState<PropertyListItem | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (property) {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      setSnapshot(property);
      setMounted(true);
      setClosing(false);
      const id = requestAnimationFrame(() => setAnimate(true));
      return () => cancelAnimationFrame(id);
    } else if (mounted) {
      setAnimate(false);
      setClosing(true);
      closeTimer.current = setTimeout(() => {
        setMounted(false);
        setClosing(false);
        setSnapshot(null);
      }, EXIT_MS);
    }
  }, [property]); // eslint-disable-line react-hooks/exhaustive-deps

  const current = snapshot;
  const score = current?.progressDetails?.score ?? 0;
  const pillars = current?.progressDetails?.pillars ?? [];
  const displayScore = useCountUp(score, animate);

  if (!mounted || !current?.progressDetails) return null;

  const tier = scoreTier(score);

  const sortedPillars = [...pillars].sort((a, b) => {
    if (a.score === 100 && b.score < 100) return 1;
    if (a.score < 100 && b.score === 100) return -1;
    return b.weight - a.weight;
  });

  const completedCount = pillars.filter((p) => p.score === 100).length;
  const incompleteCount = pillars.length - completedCount;
  const firstCompletedIndex = sortedPillars.findIndex((p) => p.score === 100);

  const backdropAnim = closing
    ? `modal-backdrop-out ${EXIT_MS}ms ease-in forwards`
    : "modal-backdrop-in 220ms ease-out forwards";

  const modalAnim = closing
    ? `modal-scale-out ${EXIT_MS}ms cubic-bezier(0.4,0,1,1) forwards`
    : "modal-scale-in 300ms cubic-bezier(0.16,1,0.3,1) forwards";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[2px]"
        style={{ animation: backdropAnim }}
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-[calc(100%-1rem)] sm:max-w-[500px] bg-white rounded-xl border border-slate-200 shadow-[0_8px_40px_rgba(0,0,0,0.12)] pointer-events-auto overflow-hidden flex flex-col"
          style={{
            maxHeight: "min(88vh, 720px)",
            animation: modalAnim,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-5 border-b border-slate-100 shrink-0">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em] mb-1">
                  {current.code}
                </p>
                <h2 className="text-[15px] sm:text-[18px] font-semibold text-val-heading leading-snug truncate pr-2">
                  {current.name}
                </h2>
              </div>
              <div className="flex items-start gap-1.5 shrink-0">
                {/* Score + tier */}
                <div className="text-right mr-1.5">
                  <div className="flex items-baseline gap-0.5 justify-end">
                    <span className={cn("text-[22px] sm:text-[26px] font-bold tabular-nums leading-none",
                      score >= 70 ? "text-emerald-600" : score >= 40 ? "text-amber-500" : "text-red-400"
                    )}>
                      {displayScore}
                    </span>
                    <span className="text-[14px] text-slate-400">%</span>
                  </div>
                  <span className={cn(
                    "inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-[0.05em]",
                    tier.bg, tier.text
                  )}>
                    {tier.label}
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150 mt-0.5"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Overall progress bar */}
            <div className="h-[5px] bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: animate ? `${score}%` : "0%",
                  background: score >= 70 ? "rgb(52,211,153)" : "var(--val-primary-dark)",
                  transition: "width 700ms cubic-bezier(0.16,1,0.3,1) 60ms",
                }}
              />
            </div>

            {/* Summary line */}
            <div className="mt-2.5 flex items-center justify-between">
              <p className="text-[12px] text-slate-400">
                {incompleteCount > 0
                  ? `${incompleteCount} section${incompleteCount > 1 ? "s" : ""} still need data`
                  : "All sections complete — full features unlocked"}
              </p>
              <span className="text-[11px] text-slate-400 tabular-nums">{completedCount}/{pillars.length}</span>
            </div>
          </div>

          {/* Pillars — scrollable */}
          <div className="overflow-y-auto scrollbar-none flex-1">
            {sortedPillars.map((pillar, i) => (
              <div key={pillar.key}>
                {i === firstCompletedIndex && firstCompletedIndex > 0 && (
                  <div className="px-6 py-2 flex items-center gap-3">
                    <div className="h-px bg-slate-100 flex-1" />
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">
                      Completed
                    </span>
                    <div className="h-px bg-slate-100 flex-1" />
                  </div>
                )}
                <PillarRow pillar={pillar} index={i} animate={animate} />
              </div>
            ))}
          </div>

          {/* Footer CTA */}
          <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1.5 min-w-0">
              <p className="text-[12px] text-slate-400 leading-snug">
                Add missing data on the property page to raise your score.
              </p>
              {onExplainerClick && (
                <button
                  onClick={onExplainerClick}
                  className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors w-fit"
                  aria-label="How progress is calculated"
                >
                  <Info className="w-3 h-3 shrink-0" />
                  How is this calculated?
                </button>
              )}
            </div>
            <button
              onClick={() => { router.push(`/property/${current.id}`); onClose(); }}
              className="shrink-0 px-3.5 py-1.5 rounded-md text-[14px] font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all duration-150 whitespace-nowrap"
            >
              Go to property →
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modal-backdrop-in  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modal-backdrop-out { from { opacity: 1; } to { opacity: 0; } }
        @keyframes modal-scale-in {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        @keyframes modal-scale-out {
          from { opacity: 1; transform: scale(1)    translateY(0);   }
          to   { opacity: 0; transform: scale(0.97) translateY(4px); }
        }
        @keyframes pillar-row-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes modal-scale-in  { from { opacity: 0; } to { opacity: 1; } }
          @keyframes modal-scale-out { from { opacity: 1; } to { opacity: 0; } }
          @keyframes pillar-row-in   { from { opacity: 0; } to { opacity: 1; } }
        }
      `}</style>
    </>
  );
}
