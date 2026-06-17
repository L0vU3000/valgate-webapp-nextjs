"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, animate, useReducedMotion } from "motion/react";
import { cn } from "@/components/ui/utils";

// Shared motion primitives for the Pro cockpit.
//
// Design rules (from the Pro task plan):
//   - Motion serves comprehension, never decoration.
//   - Every primitive respects `prefers-reduced-motion`: when the user
//     asks for reduced motion we render the final state immediately.
//   - Numbers and bars animate ONCE on mount (page load), not on every
//     re-render, so filtering/searching never replays entrance motion.

// ---------------------------------------------------------------------------
// CountUpText — animates the numeric part of an already-formatted string.
// ---------------------------------------------------------------------------
//
// The query layer hands the UI fully formatted strings ("$14.50M", "62%",
// "6"). Rather than threading raw numbers + formatters through every KPI
// prop, this component finds the first number inside the string, counts
// it up from zero, and re-attaches the surrounding prefix/suffix on every
// frame. Decimal places and thousands separators follow the original text
// so the value never changes shape mid-animation.

type ParsedNumericText = {
  prefix: string;
  suffix: string;
  value: number;
  decimals: number;
  hasGrouping: boolean;
};

function parseNumericText(text: string): ParsedNumericText | null {
  const match = text.match(/-?[\d,]+(?:\.\d+)?/);
  if (!match || match.index === undefined) {
    return null;
  }

  const numericPart = match[0];
  const prefix = text.slice(0, match.index);
  const suffix = text.slice(match.index + numericPart.length);

  const value = Number.parseFloat(numericPart.replace(/,/g, ""));
  if (Number.isNaN(value)) {
    return null;
  }

  const decimalPart = numericPart.split(".")[1];
  const decimals = decimalPart ? decimalPart.length : 0;
  const hasGrouping = numericPart.includes(",");

  return { prefix, suffix, value, decimals, hasGrouping };
}

function formatFrame(parsed: ParsedNumericText, current: number): string {
  const formattedNumber = current.toLocaleString("en-US", {
    minimumFractionDigits: parsed.decimals,
    maximumFractionDigits: parsed.decimals,
    useGrouping: parsed.hasGrouping,
  });
  return `${parsed.prefix}${formattedNumber}${parsed.suffix}`;
}

export function CountUpText({
  text,
  durationMs = 900,
}: {
  text: string;
  durationMs?: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const parsed = useMemo(() => parseNumericText(text), [text]);

  // Server render and first client render both show the final text, so
  // there is no hydration mismatch and no-JS users still see real data.
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    if (prefersReducedMotion || parsed === null) {
      setDisplay(text);
      return;
    }

    const animation = animate(0, parsed.value, {
      duration: durationMs / 1000,
      ease: "easeOut",
      onUpdate: (latest) => {
        setDisplay(formatFrame(parsed, latest));
      },
    });

    return () => {
      animation.stop();
    };
  }, [text, parsed, prefersReducedMotion, durationMs]);

  return <span className="tabular-nums">{display}</span>;
}

// ---------------------------------------------------------------------------
// SectionEnter — gentle fade-up for top-level page sections.
// ---------------------------------------------------------------------------
//
// `index` staggers sections in reading order (header → KPIs → alerts →
// content), reinforcing the page hierarchy on load.

export function SectionEnter({
  index = 0,
  className,
  children,
}: {
  index?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        ease: "easeOut",
        delay: index * 0.06,
      }}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// EnterTr — table row that fades up into place on mount.
// ---------------------------------------------------------------------------
//
// The stagger delay is capped so long tables (20+ properties) finish
// entering quickly instead of trickling in for seconds.

export function EnterTr({
  index,
  className,
  onClick,
  children,
}: {
  index: number;
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.tr
      className={className}
      onClick={onClick}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        ease: "easeOut",
        delay: Math.min(index * 0.035, 0.45),
      }}
    >
      {children}
    </motion.tr>
  );
}

// ---------------------------------------------------------------------------
// EnterLi — list item that fades up into place on mount (the <li> sibling
// of EnterTr, for list-based widgets like the work-orders queue).
// ---------------------------------------------------------------------------

export function EnterLi({
  index,
  className,
  children,
}: {
  index: number;
  className?: string;
  children: React.ReactNode;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.li
      className={className}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        ease: "easeOut",
        delay: Math.min(index * 0.035, 0.45),
      }}
    >
      {children}
    </motion.li>
  );
}

// ---------------------------------------------------------------------------
// DrawInBar — horizontal progress/occupancy bar that draws in on mount.
// ---------------------------------------------------------------------------
//
// Used for occupancy bars in table rows and the collected-vs-expected
// bar in Financials. The track is the outer element; the fill animates
// from 0 to its real percentage.

export function DrawInBar({
  percent,
  delaySeconds = 0,
  trackClassName,
  fillClassName,
}: {
  percent: number;
  delaySeconds?: number;
  trackClassName?: string;
  fillClassName?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div
      className={cn(
        "h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden",
        trackClassName,
      )}
    >
      <motion.div
        className={cn("h-full rounded-full bg-blue-500", fillClassName)}
        initial={prefersReducedMotion ? false : { width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{
          duration: 0.8,
          ease: [0.25, 1, 0.3, 1],
          delay: delaySeconds,
        }}
      />
    </div>
  );
}
