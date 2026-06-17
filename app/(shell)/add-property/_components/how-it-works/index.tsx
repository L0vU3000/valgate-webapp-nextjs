"use client";

import { X } from "lucide-react";
import { HOW_IT_WORKS_STEPS } from "./steps-data";

const FADE_MASK = [
  "linear-gradient(to right, transparent 0%, black 7%, black 93%, transparent 100%)",
  "linear-gradient(to bottom, transparent 0%, black 7%, black 93%, transparent 100%)",
].join(", ");

interface HowItWorksGateProps {
  stepIndex: number; // 0-indexed (0, 1, 2)
  onContinue: () => void;
  onBack?: () => void;
}

/**
 * HowItWorksGate
 *
 * Interstitial "Step N of 3 — …" screen shown between major Add Property
 * form steps. Two layouts:
 *
 *  - Phone (< lg): copy-only (Wise pattern). The ambient video is hidden;
 *    eyebrow + headline + body sit at the top with breathing room, and the
 *    footer becomes a vertical stack — full-width segmented progress bar
 *    above a Back link + dark "Continue" pill. Top-right X escapes the
 *    gate (back to the previous form step) if onBack is provided.
 *  - Desktop (lg:+): original 1:1 video-left / text-right split with the
 *    same single-row footer (Back · Progress · Continue).
 */
export function HowItWorksGate({
  stepIndex,
  onContinue,
  onBack,
}: HowItWorksGateProps) {
  const step = HOW_IT_WORKS_STEPS[stepIndex];
  const isLast = stepIndex === HOW_IT_WORKS_STEPS.length - 1;

  return (
    <div className="relative flex h-full flex-col">
      {/* Phone-only X escape — top-right, safe-area aware. Calls onBack if
          present so the user returns to the previous form step rather than
          falling out of the flow entirely. */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Close and return to previous step"
          className="absolute right-3 z-10 flex size-11 items-center justify-center rounded-full border border-border-subtle bg-white/90 text-foreground backdrop-blur transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2 lg:hidden"
          style={{ top: "calc(env(safe-area-inset-top) + 0.75rem)" }}
        >
          <X className="size-5" />
        </button>
      )}

      {/* Main content area — stacked column on phone, 1:1 row on desktop */}
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Left — video panel (desktop only). On phone we use Wise's
            copy-only pattern: no video, no illustration. The text panel
            below fills the available height with generous top padding. */}
        <div className="hidden flex-1 items-center justify-center overflow-hidden bg-[#f3f4ed] lg:flex">
          <video
            src="/property-ambiance.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="aspect-video h-auto w-full max-w-[80%] max-h-[80%] object-cover"
            style={{
              maskImage: FADE_MASK,
              WebkitMaskImage: FADE_MASK,
              maskComposite: "intersect",
              WebkitMaskComposite: "source-in",
            }}
          />
        </div>

        {/* Right — text panel */}
        <div className="flex flex-1 items-start overflow-y-auto bg-white pt-safe lg:items-center lg:justify-start lg:overflow-hidden">
          <div className="flex w-full max-w-[600px] shrink-0 flex-col gap-4 px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
            <span className="text-[14px] font-semibold uppercase tracking-[0.35px] text-[#5b5f62]">
              Step {stepIndex + 1} of {HOW_IT_WORKS_STEPS.length}
            </span>
            <h1
              className="font-semibold leading-[1.2] tracking-[-0.025em] text-[#1a1c1c] lg:leading-[1.25]"
              style={{ fontSize: "clamp(1.75rem, 1.25rem + 2vw, 3rem)" }}
            >
              {step.title}
            </h1>
            <p className="max-w-[400px] text-[16px] leading-[1.625] text-[#5b5f62] lg:text-[18px]">
              {step.desc}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom nav — two distinct layouts. Phone uses a vertical stack
          (progress on top, button row below). Desktop uses the original
          three-cell row (Back · Progress · Continue). pb-safe clears the
          iOS home indicator on phone. */}

      {/* Phone footer */}
      <div className="shrink-0 border-t border-border-subtle bg-white px-4 pt-3 pb-safe lg:hidden">
        {/* Progress pills — three flex-1 segments span the full width */}
        <div className="mb-3 flex flex-col items-center gap-2">
          <div className="flex w-full gap-2">
            {HOW_IT_WORKS_STEPS.map((_, i) => (
              <div
                key={i}
                className="h-[4px] flex-1 rounded-full transition-colors duration-300"
                style={{
                  backgroundColor: i <= stepIndex ? "#1a1c1c" : "#e2e2e2",
                }}
              />
            ))}
          </div>
          <span className="text-[12px] font-medium text-[#5b5f62]">
            Step {stepIndex + 1} of {HOW_IT_WORKS_STEPS.length}
          </span>
        </div>

        {/* Button row — Back as a small 44px tap target on the left,
            Continue as a full-remaining-width dark pill on the right. */}
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex h-11 shrink-0 items-center justify-center rounded-lg px-4 text-[15px] font-semibold text-[#1a1c1c] underline underline-offset-2 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]"
            >
              Back
            </button>
          )}
          <button
            onClick={onContinue}
            className="flex h-12 flex-1 items-center justify-center rounded-full bg-[#14181b] px-6 text-[15px] font-semibold text-white transition-all duration-150 hover:bg-[#252b2f] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2"
          >
            {isLast ? "Start Review" : "Continue"}
          </button>
        </div>
      </div>

      {/* Desktop footer — original three-cell layout (Back · Progress · Continue) */}
      <div className="hidden shrink-0 bg-white px-8 py-4 shadow-[0px_-4px_6px_-1px_rgba(0,0,0,0.1)] lg:flex lg:items-center lg:justify-between">
        {/* Back */}
        <div className="flex-1">
          {onBack && (
            <button
              onClick={onBack}
              className="text-[16px] font-semibold text-[#1a1c1c] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]"
            >
              Back
            </button>
          )}
        </div>

        {/* Progress pills */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-2">
            {HOW_IT_WORKS_STEPS.map((_, i) => (
              <div
                key={i}
                className="h-[4px] w-16 rounded-full transition-colors duration-300"
                style={{
                  backgroundColor: i <= stepIndex ? "#1a1c1c" : "#e2e2e2",
                }}
              />
            ))}
          </div>
          <span className="text-[12px] font-medium text-[#5b5f62]">
            Step {stepIndex + 1} of {HOW_IT_WORKS_STEPS.length}
          </span>
        </div>

        {/* Continue */}
        <div className="flex flex-1 justify-end">
          <button
            onClick={onContinue}
            className="rounded-lg bg-[#14181b] px-6 py-3 text-[16px] font-semibold text-white transition-all duration-150 hover:bg-[#252b2f] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2"
          >
            {isLast ? "Start Review" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
