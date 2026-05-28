"use client";

import { useEffect, useRef } from "react";
import {
  PhoneSheet,
  PhoneSheetContent,
} from "@/components/ui/phone-sheet";

/**
 * AdvisorModal
 *
 * The "Set up with an Advisor / Set up on my own" branded modal shown on
 * top of Step 0 of the Add Property flow. On phone (< sm) this renders as
 * a full-screen bottom sheet via PhoneSheet — the dark brand panel sits
 * at the top, the description fills the middle, and the two CTAs are
 * pinned at the bottom above the iOS home indicator. On tablet+ it falls
 * back to a centered dialog at ~480px wide.
 */
interface AdvisorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSetupWithAdvisor: () => void;
  onSetupOwn: () => void;
}

const ADVISOR_AVATARS = [
  { initials: "SA", color: "#3b6b9e" },
  { initials: "JM", color: "#5b4e8a" },
  { initials: "EK", color: "#2d6a4a" },
  { initials: "FL", color: "#7c4d2a" },
] as const;

export function AdvisorModal({
  open,
  onOpenChange,
  onSetupWithAdvisor,
  onSetupOwn,
}: AdvisorModalProps) {
  const ownBtnRef = useRef<HTMLButtonElement>(null);

  // Focus the "Set up on my own" button when the sheet opens, so a quick
  // dismiss with Enter / Return on phone is the default action.
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => ownBtnRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [open]);

  return (
    <PhoneSheet open={open} onOpenChange={onOpenChange}>
      <PhoneSheetContent
        hideClose
        showHandle
        // PhoneSheet defaults to sm:max-w-lg (32rem). We want ~480px on
        // desktop to match the original modal width.
        desktopMaxWidth="sm:max-w-[480px]"
        // Remove default header/body padding so the dark brand panel can
        // bleed edge-to-edge inside the sheet. Round desktop corners; on
        // phone the sheet is full-screen and the only rounded corners are
        // the top ones provided by PhoneSheetContent itself.
        className="p-0 bg-white sm:rounded-2xl overflow-hidden"
        aria-labelledby="advisor-modal-title"
      >
        {/* Top dark brand panel — fills the upper section. On phone this
            sits below the grab handle; on desktop it's the modal's top. */}
        <div className="bg-[#0d1117] px-6 sm:px-8 pt-4 sm:pt-8 pb-6 sm:pb-8">
          {/* Breadcrumb */}
          <div className="mb-6 flex items-center gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-400">
              Valgate
            </span>
            <span className="text-xs text-white/20">/</span>
            <span className="text-xs font-semibold uppercase tracking-widest text-white/40">
              Advisors
            </span>
          </div>

          {/* Advisor avatars */}
          <div className="mb-6 flex items-center gap-4">
            <div className="flex -space-x-3">
              {ADVISOR_AVATARS.map((a) => (
                <div
                  key={a.initials}
                  className="flex size-11 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-[#0d1117]"
                  style={{ background: a.color }}
                >
                  {a.initials}
                </div>
              ))}
            </div>
            <span className="rounded-full bg-blue-500/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[1px] text-blue-300">
              Available Now
            </span>
          </div>

          {/* Headline — fluid: 24px on iPhone 14, scales up to 32px at sm: */}
          <h2
            id="advisor-modal-title"
            className="text-[24px] font-extrabold leading-[1.1] tracking-[-0.03em] text-white sm:text-[32px]"
          >
            Let an expert guide
            <br />
            your setup.
          </h2>
        </div>

        {/* Body — descriptive copy. flex-1 so on phone the section
            expands and pushes the buttons to the bottom of the sheet. */}
        <div className="flex flex-1 flex-col px-6 pt-6 sm:px-8 sm:pt-7">
          <p className="mb-7 text-sm leading-relaxed text-slate-500">
            Valgate Advisors can walk you through creating your listing,
            optimizing pricing, and preparing for your first guests —
            completely free.
          </p>
        </div>

        {/* Footer — primary + secondary CTAs. On phone they sit above the
            iOS home indicator thanks to pb-safe. On desktop they have a
            normal padding so the modal stays compact. */}
        <div className="flex shrink-0 flex-col gap-3 px-6 pt-2 pb-safe sm:px-8 sm:pb-8">
          <button
            onClick={onSetupWithAdvisor}
            className="auth-submit-btn min-h-11 w-full rounded py-4 text-center text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--val-primary-dark] focus-visible:ring-offset-2"
            style={{
              background:
                "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)",
              boxShadow:
                "0 4px 6px -1px rgba(0,74,198,0.25), 0 2px 4px -2px rgba(0,74,198,0.15)",
            }}
          >
            Set up with an Advisor
          </button>
          <button
            ref={ownBtnRef}
            onClick={onSetupOwn}
            className="min-h-11 w-full py-3 text-center text-sm font-medium text-slate-400 transition-colors duration-150 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--val-primary-dark] focus-visible:ring-offset-2"
          >
            Set up on my own
          </button>
        </div>
      </PhoneSheetContent>
    </PhoneSheet>
  );
}
