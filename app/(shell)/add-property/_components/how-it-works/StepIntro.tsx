"use client";

import { Home, DollarSign, ClipboardCheck } from "lucide-react";
import { HOW_IT_WORKS_STEPS } from "./steps-data";

const STEP_ICONS = [Home, DollarSign, ClipboardCheck];
const STEP_GRADIENTS: [string, string][] = [
  ["#3b82f6", "#1d4ed8"],
  ["#14b8a6", "#0d9488"],
  ["#34d399", "#10b981"],
];

export function StepIntro({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex h-full overflow-hidden">
      {/* Left — white */}
      <div className="flex-1 bg-white flex items-center justify-end overflow-hidden">
        <div className="w-full max-w-[600px] flex flex-col px-12 py-10 shrink-0">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-semibold tracking-widest uppercase text-[--val-primary-dark]">Valgate</span>
            <span className="text-xs text-slate-300">/</span>
            <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">Add Property</span>
          </div>
          <h1 className="text-[42px] font-extrabold leading-[1.05] tracking-[-0.03em] text-[#1a1c1c] mb-5">
            List your
            <br />
            property with
            <br />
            confidence.
          </h1>
          <p className="text-[15px] text-[#434655] leading-[1.65] max-w-[360px] mb-9">
            Join thousands of hosts earning on Valgate. Our streamlined process
            makes it easy to set up your listing, optimize your pricing, and
            start welcoming guests.
          </p>
          <button
            onClick={onStart}
            className="self-start inline-flex items-center bg-[#2563eb] text-white text-[14px] font-medium px-6 py-3 rounded-lg hover:bg-[#1d4ed8] active:scale-[0.98] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2"
          >
            Get Started
          </button>
        </div>
      </div>

      {/* Right — gray */}
      <div className="flex-1 bg-[#f9f9f9] flex items-center justify-start overflow-hidden">
        <div className="w-full max-w-[560px] flex flex-col px-12 py-10 shrink-0">
          <p className="text-[11px] font-semibold tracking-widest uppercase text-slate-400 mb-7">
            How it works
          </p>
          <div className="flex flex-col">
            {HOW_IT_WORKS_STEPS.map((s, i) => {
              const Icon = STEP_ICONS[i];
              const gradient = STEP_GRADIENTS[i];
              return (
                <div key={i}>
                  <div className="flex gap-4 items-start">
                    <div
                      className="shrink-0 w-11 h-11 rounded-[10px] flex items-center justify-center shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.06),0_3px_8px_rgba(0,0,0,0.08)]"
                      style={{ background: `linear-gradient(to bottom, ${gradient[0]}, ${gradient[1]})` }}
                    >
                      <Icon size={18} strokeWidth={1.75} className="text-white" />
                    </div>
                    <div className="flex-1 pt-1 flex flex-col gap-1.5 min-w-0">
                      <div className="flex items-baseline gap-2.5">
                        <span className="text-[11px] font-bold text-[#2563eb] tabular-nums leading-none tracking-wide">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="text-[15px] font-semibold text-[#1a1c1c] leading-snug">
                          {s.title}
                        </span>
                      </div>
                      <p className="text-[13px] text-[#5b5f62] leading-[1.55]">{s.desc}</p>
                    </div>
                  </div>
                  {i < HOW_IT_WORKS_STEPS.length - 1 && (
                    <div className="my-5 h-px bg-[#e6e6e6]" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
