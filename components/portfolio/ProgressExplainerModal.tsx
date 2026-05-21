"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ProgressExplainerModalProps {
  open: boolean;
  onClose: () => void;
}

const PILLARS = [
  { name: "Location & Identity", weight: 15, color: "#3b82f6" },   // blue-500
  { name: "Financials",          weight: 20, color: "#10b981" },   // emerald-500
  { name: "Rental",              weight: 20, color: "#8b5cf6" },   // violet-500
  { name: "Ownership",           weight: 15, color: "#f59e0b" },   // amber-500
  { name: "Valuation History",   weight: 10, color: "#6366f1" },   // indigo-500
  { name: "Safety",              weight: 10, color: "#ec4899" },   // pink-500
  { name: "Estate Planning",     weight:  5, color: "#14b8a6" },   // teal-500
  { name: "Documents",           weight:  5, color: "#64748b" },   // slate-500
];

const PAGE_TITLES = ["What is Progress?", "How is it calculated?", "How do I improve it?"];

function scoreTier(pct: number): { label: string; bg: string; text: string } {
  if (pct >= 90) return { label: "Complete",       bg: "bg-green-50",  text: "text-green-700" };
  if (pct >= 70) return { label: "Good",            bg: "bg-blue-50",   text: "text-blue-700"  };
  if (pct >= 40) return { label: "In progress",     bg: "bg-amber-50",  text: "text-amber-600" };
  return           { label: "Needs attention",  bg: "bg-red-50",    text: "text-red-600"   };
}

// ─── Page 1 ─────────────────────────────────────────────────────────────────

function Page1() {
  const pct = 68;
  const tier = scoreTier(pct);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const textColor = pct >= 70 ? "text-emerald-600" : pct >= 40 ? "text-amber-500" : "text-red-400";

  return (
    <div className="flex flex-col">
      {/* Score display — matches ProgressModal header style */}
      <div className="flex flex-col items-center gap-3 rounded-lg bg-slate-50 py-8 mb-4">
        <div className="flex items-baseline gap-1">
          <span className={`text-[52px] font-bold tabular-nums leading-none ${textColor}`}>{pct}</span>
          <span className="text-[22px] text-slate-400 font-medium">%</span>
        </div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${tier.bg} ${tier.text}`}>
          {tier.label}
        </span>
        <div className="w-[200px] h-[5px] bg-slate-100 rounded-full overflow-hidden">
          <div
            style={{
              width: animate ? `${pct}%` : "0%",
              background: "var(--val-primary-dark)",
              transition: "width 700ms cubic-bezier(0.16,1,0.3,1) 80ms",
            }}
            className="h-full rounded-full"
          />
        </div>
      </div>
      <p className="text-[14px] text-slate-600 leading-relaxed text-center max-w-[340px] mx-auto">
        Progress is a score from 0–100 measuring how complete a property&apos;s data is. The higher the score, the more Valgate features unlock for that property.{" "}
        <span className="font-medium text-slate-700">It is not a quality or condition score</span> — it&apos;s purely about data completeness.
      </p>
    </div>
  );
}

// ─── Page 2 ─────────────────────────────────────────────────────────────────

function Page2() {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[14px] text-slate-600 leading-relaxed">
        Progress is made up of 8 data pillars. Each pillar carries a different weight toward the total score. Bar width reflects each pillar&apos;s share of the full 100%.
      </p>
      <div className="space-y-[11px]">
        {PILLARS.map((p, i) => (
          <div key={p.name}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-medium text-slate-700">{p.name}</span>
              <span className="text-[11px] font-semibold tabular-nums" style={{ color: p.color }}>{p.weight}%</span>
            </div>
            <div className="h-[4px] bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  backgroundColor: p.color,
                  width: animate ? `${p.weight}%` : "0%",
                  transition: `width 500ms cubic-bezier(0.16,1,0.3,1) ${i * 35}ms`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <span className="text-[10px] text-slate-400 font-medium tabular-nums">Total = 100%</span>
      </div>
    </div>
  );
}

// ─── Page 3 ─────────────────────────────────────────────────────────────────

const IMPROVEMENT_ITEMS = [
  { pillar: "Financials",    label: "Add purchase price & costs",  weight: 20, done: false },
  { pillar: "Rental",        label: "Set monthly rent & occupancy", weight: 20, done: false },
  { pillar: "Ownership",     label: "Confirm ownership documents",  weight: 15, done: false },
  { pillar: "Location",      label: "Location confirmed",           weight: 15, done: true  },
  { pillar: "Valuation",     label: "Add valuation history",        weight: 10, done: false },
];

function Page3() {
  return (
    <div className="flex flex-col gap-4">
      {/* Tinted panel showing score delta */}
      <div className="rounded-lg bg-blue-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-slate-500 line-through">34%</span>
          <span className="text-[11px] text-slate-400">→</span>
          <span className="text-[15px] font-bold text-blue-700">78%</span>
        </div>
        <span className="text-[11px] font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">+44 pts</span>
      </div>

      <p className="text-[13px] text-slate-500 leading-relaxed">
        Fill in missing data, starting with the highest-weighted pillars. Each property page has a corresponding section for the relevant data.
      </p>

      {/* Actionable checklist */}
      <div className="space-y-[6px]">
        {IMPROVEMENT_ITEMS.map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-3 rounded-md px-3 py-2 ${item.done ? "opacity-50" : "bg-slate-50"}`}
          >
            <div className={`w-4 h-4 rounded-full shrink-0 flex items-center justify-center border ${
              item.done
                ? "bg-blue-600 border-blue-600"
                : "border-slate-300 bg-white"
            }`}>
              {item.done && (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span className={`text-[12px] flex-1 ${item.done ? "text-slate-400 line-through" : "text-slate-700 font-medium"}`}>
              {item.label}
            </span>
            <span className={`text-[11px] font-semibold tabular-nums shrink-0 ${item.done ? "text-slate-300" : "text-emerald-600"}`}>
              {item.done ? "✓" : `+${item.weight}%`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Shell ───────────────────────────────────────────────────────────────────

const EXIT_DURATION = 160;

export function ProgressExplainerModal({ open, onClose }: ProgressExplainerModalProps) {
  const [page, setPage] = useState<1 | 2 | 3>(1);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [pageDir, setPageDir] = useState<"forward" | "back">("forward");
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      setMounted(true);
      setClosing(false);
    }
  }, [open]);

  if (!mounted) return null;

  function handleClose() {
    setClosing(true);
    closeTimer.current = setTimeout(() => {
      setMounted(false);
      setPage(1);
      onClose();
    }, EXIT_DURATION);
  }

  function handleNext() {
    if (page < 3) {
      setPageDir("forward");
      setPage((p) => (p + 1) as 1 | 2 | 3);
    } else {
      handleClose();
    }
  }

  function handleBack() {
    if (page > 1) {
      setPageDir("back");
      setPage((p) => (p - 1) as 1 | 2 | 3);
    }
  }

  const backdropAnim = closing
    ? `modal-backdrop-out ${EXIT_DURATION}ms ease-in forwards`
    : "modal-backdrop-in 220ms ease-out forwards";

  const modalAnim = closing
    ? `modal-scale-out ${EXIT_DURATION}ms cubic-bezier(0.4,0,1,1) forwards`
    : "modal-scale-in 300ms cubic-bezier(0.16,1,0.3,1) forwards";

  const pageAnim = pageDir === "forward"
    ? "page-slide-forward 220ms cubic-bezier(0.16,1,0.3,1) forwards"
    : "page-slide-back 220ms cubic-bezier(0.16,1,0.3,1) forwards";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[2px]"
        style={{ animation: backdropAnim }}
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-[480px] bg-white rounded-xl border border-slate-200 shadow-[0_8px_40px_rgba(0,0,0,0.12)] pointer-events-auto flex flex-col"
          style={{ animation: modalAnim }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between shrink-0">
            <h2 className="text-[15px] font-semibold text-val-heading">
              {PAGE_TITLES[page - 1]}
            </h2>
            <button
              onClick={handleClose}
              className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-5 flex-1 min-h-[300px] overflow-hidden">
            <div key={`${page}-${pageDir}`} style={{ animation: pageAnim }}>
              {page === 1 && <Page1 />}
              {page === 2 && <Page2 />}
              {page === 3 && <Page3 />}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0">
            {/* Back */}
            <button
              onClick={handleBack}
              className={`text-[13px] font-medium text-slate-500 hover:text-slate-700 transition-colors duration-150 ${page === 1 ? "invisible" : ""}`}
            >
              Back
            </button>

            {/* Step dots + counter */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-[7px]">
                {([1, 2, 3] as const).map((n) => (
                  <span
                    key={n}
                    className={`h-[6px] rounded-full transition-all duration-300 ${
                      n === page
                        ? "w-[18px] bg-blue-600"
                        : "w-[6px] bg-slate-200"
                    }`}
                  />
                ))}
              </div>
              <span className="text-[11px] text-slate-400 tabular-nums">{page}/3</span>
            </div>

            {/* Next / Got it */}
            <button
              onClick={handleNext}
              className="px-4 py-1.5 rounded-md text-[13px] font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all duration-150"
            >
              {page === 3 ? "Got it" : "Next"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modal-backdrop-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modal-backdrop-out {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes modal-scale-in {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        @keyframes modal-scale-out {
          from { opacity: 1; transform: scale(1)    translateY(0); }
          to   { opacity: 0; transform: scale(0.97) translateY(4px); }
        }
        @keyframes page-slide-forward {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes page-slide-back {
          from { opacity: 0; transform: translateX(-20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes modal-backdrop-in  { from { opacity: 0; } to { opacity: 1; } }
          @keyframes modal-backdrop-out { from { opacity: 1; } to { opacity: 0; } }
          @keyframes modal-scale-in     { from { opacity: 0; } to { opacity: 1; } }
          @keyframes modal-scale-out    { from { opacity: 1; } to { opacity: 0; } }
          @keyframes page-slide-forward { from { opacity: 0; } to { opacity: 1; } }
          @keyframes page-slide-back    { from { opacity: 0; } to { opacity: 1; } }
        }
      `}</style>
    </>
  );
}
