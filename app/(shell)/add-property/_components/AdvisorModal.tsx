"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";

interface AdvisorModalProps {
  onSetupWithAdvisor: () => void;
  onSetupOwn: () => void;
}

const ADVISOR_AVATARS = [
  { initials: "SA", color: "#3b6b9e" },
  { initials: "JM", color: "#5b4e8a" },
  { initials: "EK", color: "#2d6a4a" },
  { initials: "FL", color: "#7c4d2a" },
] as const;

const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];
const easeIn: [number, number, number, number] = [0.55, 0, 1, 0.45];

export function AdvisorModal({ onSetupWithAdvisor, onSetupOwn }: AdvisorModalProps) {
  const ownBtnRef = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    ownBtnRef.current?.focus();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: reduced ? 0 : 0.15, ease: "easeIn" } }}
      transition={{ duration: reduced ? 0 : 0.2, ease: "easeOut" }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
      onClick={(e) => { if (e.target === e.currentTarget) onSetupOwn(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: reduced ? 1 : 0.94, y: reduced ? 0 : 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{
          opacity: 0,
          scale: reduced ? 1 : 0.97,
          y: reduced ? 0 : -8,
          transition: { duration: reduced ? 0 : 0.18, ease: easeIn },
        }}
        transition={{ duration: reduced ? 0 : 0.28, ease: easeOut }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="advisor-modal-title"
        className="bg-white w-full max-w-[480px] rounded-2xl overflow-hidden flex flex-col shadow-[0px_20px_60px_-8px_rgba(18,28,40,0.3),0px_0px_0px_1px_rgba(18,28,40,0.08)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dark header */}
        <div className="bg-[#0d1117] px-8 pt-8 pb-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 mb-6">
            <span className="text-xs font-semibold tracking-widest uppercase text-blue-400">Valgate</span>
            <span className="text-xs text-white/20">/</span>
            <span className="text-xs font-semibold tracking-widest uppercase text-white/40">Advisors</span>
          </div>

          {/* Avatars */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex -space-x-3">
              {ADVISOR_AVATARS.map((a) => (
                <div
                  key={a.initials}
                  className="size-11 rounded-full ring-2 ring-[#0d1117] flex items-center justify-center text-white text-[11px] font-bold"
                  style={{ background: a.color }}
                >
                  {a.initials}
                </div>
              ))}
            </div>
            <span className="text-[10px] font-semibold tracking-[1px] uppercase px-3 py-1 rounded-full bg-blue-500/20 text-blue-300">
              Available Now
            </span>
          </div>

          {/* Headline */}
          <h2
            id="advisor-modal-title"
            className="text-[32px] font-extrabold text-white tracking-[-0.03em] leading-[1.1]"
          >
            Let an expert guide<br />your setup.
          </h2>
        </div>

        {/* Body */}
        <div className="flex flex-col px-8 pt-7 pb-8">
          <p className="text-sm text-slate-500 leading-relaxed mb-7">
            Valgate Advisors can walk you through creating your listing, optimizing
            pricing, and preparing for your first guests—completely free.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={onSetupWithAdvisor}
              className="w-full text-white text-sm font-semibold py-4 rounded text-center hover:opacity-90 active:scale-[0.98] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--val-primary-dark] focus-visible:ring-offset-2"
              style={{
                background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)",
                boxShadow: "0 4px 6px -1px rgba(0,74,198,0.25), 0 2px 4px -2px rgba(0,74,198,0.15)",
              }}
            >
              Set up with an Advisor
            </button>
            <button
              ref={ownBtnRef}
              onClick={onSetupOwn}
              className="w-full text-sm font-medium text-slate-400 py-3 text-center hover:text-slate-600 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--val-primary-dark] focus-visible:ring-offset-2"
            >
              Set up on my own
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
