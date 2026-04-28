"use client";

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

export function HowItWorksGate({ stepIndex, onContinue, onBack }: HowItWorksGateProps) {
  const step = HOW_IT_WORKS_STEPS[stepIndex];
  const isLast = stepIndex === HOW_IT_WORKS_STEPS.length - 1;

  return (
    <div className="flex flex-col h-full">
      {/* 1:1 split */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — video panel */}
        <div className="flex-1 bg-[#f3f4ed] overflow-hidden flex items-center justify-center">
          <video
            src="/property-ambiance.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full max-w-[80%] max-h-[80%] aspect-video object-cover"
            style={{
              maskImage: FADE_MASK,
              WebkitMaskImage: FADE_MASK,
              maskComposite: "intersect",
              WebkitMaskComposite: "source-in",
            }}
          />
        </div>

        {/* Right — white */}
        <div className="flex-1 bg-white flex items-center justify-start overflow-hidden">
          <div className="w-full max-w-[600px] px-12 py-10 flex flex-col gap-4 shrink-0">
            <span className="text-[14px] font-semibold uppercase tracking-[0.35px] text-[#5b5f62]">
              Step {stepIndex + 1} of {HOW_IT_WORKS_STEPS.length}
            </span>
            <h1 className="text-[48px] font-semibold leading-[1.25] tracking-[-0.025em] text-[#1a1c1c]">
              {step.title}
            </h1>
            <p className="text-[18px] text-[#5b5f62] leading-[1.625] max-w-[400px]">
              {step.desc}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="shrink-0 bg-white shadow-[0px_-4px_6px_-1px_rgba(0,0,0,0.1)] px-8 py-4 flex items-center justify-between">
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
                style={{ backgroundColor: i <= stepIndex ? "#1a1c1c" : "#e2e2e2" }}
              />
            ))}
          </div>
          <span className="text-[12px] font-medium text-[#5b5f62]">
            Step {stepIndex + 1} of {HOW_IT_WORKS_STEPS.length}
          </span>
        </div>

        {/* Continue */}
        <div className="flex-1 flex justify-end">
          <button
            onClick={onContinue}
            className="bg-[#14181b] text-white text-[16px] font-semibold px-6 py-3 rounded-lg hover:bg-[#252b2f] active:scale-[0.98] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2"
          >
            {isLast ? "Start Review" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
