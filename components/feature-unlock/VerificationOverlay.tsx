"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

export type VerificationOverlayPhase = "verifying" | "success" | "error";

interface VerificationOverlayProps {
  phase: VerificationOverlayPhase;
  /** Short label shown during verify, e.g. "Verify ownership" */
  actionLabel: string;
  errorMessage?: string;
  onSuccessComplete?: () => void;
  onErrorDismiss?: () => void;
}

const VERIFY_MESSAGES = [
  "Uploading documents…",
  "Reviewing evidence…",
  "Confirming verification…",
] as const;

const SUCCESS_HOLD_MS = 1400;
const ERROR_HOLD_MS = 2200;

export function VerificationOverlay({
  phase,
  actionLabel,
  errorMessage,
  onSuccessComplete,
  onErrorDismiss,
}: VerificationOverlayProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  // Cycle status copy while verifying
  useEffect(() => {
    if (phase !== "verifying") {
      setMessageIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % VERIFY_MESSAGES.length);
    }, 1200);

    return () => window.clearInterval(interval);
  }, [phase]);

  // Hold success state, then complete
  useEffect(() => {
    if (phase !== "success") return;

    const timer = window.setTimeout(() => {
      onSuccessComplete?.();
    }, SUCCESS_HOLD_MS);

    return () => window.clearTimeout(timer);
  }, [phase, onSuccessComplete]);

  // Hold error state, then dismiss back to form
  useEffect(() => {
    if (phase !== "error") return;

    const timer = window.setTimeout(() => {
      onErrorDismiss?.();
    }, ERROR_HOLD_MS);

    return () => window.clearTimeout(timer);
  }, [phase, onErrorDismiss]);

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/95 backdrop-blur-[2px] px-10 animate-[verify-overlay-in_220ms_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:animate-none"
      role="status"
      aria-live="polite"
      aria-busy={phase === "verifying"}
    >
      {phase === "verifying" && (
        <div className="flex flex-col items-center text-center">
          <div className="relative w-[88px] h-[88px] mb-7">
            {/* Outer orbit ring */}
            <span
              className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--val-primary-dark)] border-r-[var(--val-primary-dark)]/30 animate-[verify-orbit_1.1s_linear_infinite] motion-reduce:animate-none"
              aria-hidden
            />
            {/* Inner pulse ring */}
            <span
              className="absolute inset-[10px] rounded-full border border-[var(--val-primary-dark)]/20 animate-[verify-pulse-ring_2s_ease-in-out_infinite] motion-reduce:animate-none"
              aria-hidden
            />
            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-11 h-11 rounded-full bg-[oklch(97%_0.02_250)] flex items-center justify-center animate-[verify-icon-breathe_2.4s_ease-in-out_infinite] motion-reduce:animate-none">
                <ShieldCheck className="w-5 h-5 text-[var(--val-primary-dark)]" strokeWidth={2} />
              </div>
            </div>
          </div>

          <p className="text-[17px] font-bold text-val-heading mb-2">{actionLabel}</p>
          <p
            key={messageIndex}
            className="text-[13px] text-slate-500 animate-[verify-message-in_280ms_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:animate-none"
          >
            {VERIFY_MESSAGES[messageIndex]}
          </p>

          {/* Indeterminate progress bar */}
          <div className="mt-8 w-[200px] h-[3px] rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-[var(--val-primary-dark)] animate-[loading-bar_1.5s_ease-in-out_infinite] motion-reduce:animate-none" />
          </div>
        </div>
      )}

      {phase === "success" && (
        <div className="flex flex-col items-center text-center verify-result-enter">
          <div className="relative w-[88px] h-[88px] mb-6">
            <svg
              viewBox="0 0 88 88"
              className="w-full h-full"
              aria-hidden
            >
              <circle
                cx="44"
                cy="44"
                r="40"
                fill="none"
                stroke="oklch(62% 0.17 155)"
                strokeWidth="3"
                strokeLinecap="round"
                className="verify-circle-draw"
              />
              <path
                d="M28 44 L38 54 L60 32"
                fill="none"
                stroke="oklch(52% 0.15 155)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="verify-check-draw"
              />
            </svg>
          </div>
          <p className="text-[17px] font-bold text-val-heading mb-1.5 verify-result-text">
            Verification complete
          </p>
          <p className="text-[13px] text-slate-500 verify-result-subtext">
            Your evidence has been confirmed.
          </p>
        </div>
      )}

      {phase === "error" && (
        <div className="flex flex-col items-center text-center verify-result-shake motion-reduce:animate-none">
          <div className="relative w-[88px] h-[88px] mb-6">
            <svg
              viewBox="0 0 88 88"
              className="w-full h-full"
              aria-hidden
            >
              <circle
                cx="44"
                cy="44"
                r="40"
                fill="none"
                stroke="oklch(62% 0.2 25)"
                strokeWidth="3"
                strokeLinecap="round"
                className="verify-circle-draw"
              />
              <path
                d="M32 32 L56 56 M56 32 L32 56"
                fill="none"
                stroke="oklch(52% 0.18 25)"
                strokeWidth="3.5"
                strokeLinecap="round"
                className="verify-x-draw"
              />
            </svg>
          </div>
          <p className="text-[17px] font-bold text-red-700 mb-1.5 verify-result-text">
            Verification incomplete
          </p>
          <p className="text-[13px] text-red-600/80 max-w-[280px] leading-relaxed verify-result-subtext">
            {errorMessage ?? "We couldn't confirm your documents. Check your files and try again."}
          </p>
        </div>
      )}
    </div>
  );
}
