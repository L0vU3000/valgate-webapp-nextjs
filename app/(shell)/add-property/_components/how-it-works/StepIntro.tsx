"use client";

import { useRouter } from "next/navigation";
import { Home, DollarSign, ClipboardCheck, X } from "lucide-react";
import { HOW_IT_WORKS_STEPS } from "./steps-data";

const STEP_ICONS = [Home, DollarSign, ClipboardCheck];
const STEP_GRADIENTS: [string, string][] = [
  ["#3b82f6", "#1d4ed8"],
  ["#14b8a6", "#0d9488"],
  ["#34d399", "#10b981"],
];

/**
 * StepIntro
 *
 * The "List your property with confidence." landing screen shown on first
 * visit to /add-property. Two layouts in one component:
 *
 *  - Phone (< lg): single scrollable column — eyebrow → headline → body →
 *    "HOW IT WORKS" divider → three numbered rows → sticky bottom CTA with
 *    pb-safe. Top-right X escapes to /portfolio.
 *  - Desktop (lg:+): two-column split — left holds the hero + inline CTA,
 *    right holds the three numbered rows on a soft-gray panel. Matches the
 *    original Figma design.
 */
export function StepIntro({ onStart }: { onStart: () => void }) {
  const router = useRouter();

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden lg:flex-row">
      {/* Phone-only X escape — closes the add-property flow entirely.
          Positioned top-right with safe-area-aware top offset so it clears
          the iOS Dynamic Island / notch. Hidden on lg: where the user has
          the normal app chrome to escape with. */}
      <button
        type="button"
        onClick={() => router.push("/portfolio")}
        aria-label="Close and return to portfolio"
        className="absolute right-3 z-10 flex size-11 items-center justify-center rounded-full border border-border-subtle bg-white/90 text-foreground backdrop-blur transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2 lg:hidden"
        style={{ top: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        <X className="size-5" />
      </button>

      {/* Left / hero — white panel on desktop, full-width on phone */}
      <div className="flex flex-1 flex-col overflow-hidden bg-white lg:items-center lg:justify-center">
        <div className="flex w-full max-w-[600px] shrink-0 flex-1 flex-col overflow-y-auto px-4 pt-safe sm:px-8 lg:flex-none lg:overflow-visible lg:px-12 lg:py-10">
          {/* Eyebrow / breadcrumb */}
          <div className="mt-4 mb-4 flex items-center gap-2 lg:mt-0">
            <span className="text-xs font-semibold uppercase tracking-widest text-[--val-primary-dark]">
              Valgate
            </span>
            <span className="text-xs text-slate-300">/</span>
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Add Property
            </span>
          </div>

          {/* Headline — fluid 28px → 42px between iPhone 14 and ~860px viewport */}
          <h1
            className="mb-5 font-extrabold leading-[1.05] tracking-[-0.03em] text-[#1a1c1c]"
            style={{ fontSize: "clamp(1.75rem, 1.4rem + 1.5vw, 2.625rem)" }}
          >
            List your
            <br />
            property with
            <br />
            confidence.
          </h1>

          <p className="mb-6 max-w-[360px] text-[15px] leading-[1.65] text-[#434655] lg:mb-9">
            Join thousands of hosts earning on Valgate. Our streamlined
            process makes it easy to set up your listing, optimize your
            pricing, and start welcoming guests.
          </p>

          {/* Desktop inline CTA — hidden on phone; the phone gets a sticky
              full-width CTA pinned at the bottom of the viewport below. */}
          <button
            onClick={onStart}
            className="hidden self-start rounded-lg bg-[#2563eb] px-6 py-3 text-[14px] font-medium text-white transition-all duration-150 hover:bg-[#1d4ed8] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2 lg:inline-flex"
          >
            Get Started
          </button>

          {/* Phone-only divider between hero and "HOW IT WORKS". On desktop
              the visual separation comes from the white/gray column split. */}
          <div className="my-6 h-px bg-border-subtle lg:hidden" />

          {/* Phone — "HOW IT WORKS" header. On desktop this lives in the
              right panel; here we render it inline above the steps. */}
          <p className="mb-5 text-[11px] font-semibold uppercase tracking-widest text-slate-400 lg:hidden">
            How it works
          </p>

          {/* Phone — three numbered rows live inline. Hidden on lg: where
              they render in the dedicated right panel. */}
          <div className="flex flex-col lg:hidden">
            <StepRows />
          </div>

          {/* Bottom spacer so the last row doesn't hug the sticky CTA bar */}
          <div className="h-6 shrink-0 lg:hidden" />
        </div>
      </div>

      {/* Right / steps — visible on desktop only. The phone-side rows are
          rendered inline above to keep everything in one scroll container. */}
      <div className="hidden flex-1 items-center justify-start overflow-hidden bg-[#f9f9f9] lg:flex">
        <div className="flex w-full max-w-[560px] shrink-0 flex-col px-12 py-10">
          <p className="mb-7 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            How it works
          </p>
          <div className="flex flex-col">
            <StepRows />
          </div>
        </div>
      </div>

      {/* Phone-only sticky CTA — full-width pill pinned to the bottom of
          the viewport, with pb-safe so it clears the iOS home indicator. */}
      <div className="shrink-0 border-t border-border-subtle bg-white px-4 pt-3 pb-safe lg:hidden">
        <button
          onClick={onStart}
          className="flex h-12 w-full items-center justify-center rounded-full bg-[#2563eb] text-[15px] font-semibold text-white transition-all duration-150 hover:bg-[#1d4ed8] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}

/**
 * Three numbered "how it works" rows — extracted so both the phone-side
 * inline render and the desktop-side right panel use the same markup.
 */
function StepRows() {
  return (
    <>
      {HOW_IT_WORKS_STEPS.map((s, i) => {
        const Icon = STEP_ICONS[i];
        const gradient = STEP_GRADIENTS[i];
        return (
          <div key={i}>
            <div className="flex items-start gap-4">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.06),0_3px_8px_rgba(0,0,0,0.08)]"
                style={{
                  background: `linear-gradient(to bottom, ${gradient[0]}, ${gradient[1]})`,
                }}
              >
                <Icon size={18} strokeWidth={1.75} className="text-white" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-1">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-[11px] font-bold leading-none tracking-wide text-[#2563eb] tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[15px] font-semibold leading-snug text-[#1a1c1c]">
                    {s.title}
                  </span>
                </div>
                <p className="text-[13px] leading-[1.55] text-[#5b5f62]">
                  {s.desc}
                </p>
              </div>
            </div>
            {i < HOW_IT_WORKS_STEPS.length - 1 && (
              <div className="my-5 h-px bg-[#e6e6e6]" />
            )}
          </div>
        );
      })}
    </>
  );
}
