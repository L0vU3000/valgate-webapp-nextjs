"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "./utils";

/**
 * TableScroll
 *
 * Wraps a wide `<table>` so it scrolls horizontally on phone without
 * breaking the page layout. With `stickyFirstColumn`, the first cell of
 * every row stays pinned to the left edge as columns scroll.
 *
 * Includes a right-edge gradient affordance that hints at horizontal
 * scrollability and fades away when scrolled to the end (learned UX
 * pattern from Premier League / ESPN apps).
 *
 * Phone-first: negative-margin bleed (`-mx-4 px-4`) so the scroll
 * surface reaches the viewport edges. On tablet+ the wrapper is inert.
 *
 * **When to use:**
 *   Tables where comparing values across rows IS the task — payment
 *   ledgers, inspection histories, audit logs. If row identity (a person /
 *   entity) is the primary unit and column-comparison is secondary, prefer
 *   `<StackedCardTable>` instead.
 *
 * Mobbin references: Premier League goalkeepers, ESPN Squad, F1 Live Timing.
 *
 * The consumer is responsible for the `<table>` markup. To enable the
 * sticky-first-column behavior, set `stickyFirstColumn` and add the class
 * `data-sticky-col` to the first `<th>` and the first `<td>` of every row.
 * That class is what the wrapper's CSS hooks into.
 */
interface TableScrollProps {
  children: ReactNode;
  stickyFirstColumn?: boolean;
  /** Additional className on the outer wrapper. */
  className?: string;
}

export function TableScroll({
  children,
  stickyFirstColumn = false,
  className,
}: TableScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showRightFade, setShowRightFade] = useState(false);

  const updateFade = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    const hasOverflow = el.scrollWidth > el.clientWidth + 4;
    setShowRightFade(hasOverflow && !atEnd);
  }, []);

  // Initial measurement after layout.
  useLayoutEffect(() => {
    updateFade();
  }, [updateFade]);

  // Track resizes and content changes.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateFade);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateFade]);

  return (
    <div className={cn("relative -mx-4 sm:mx-0", className)}>
      <div
        ref={scrollRef}
        onScroll={updateFade}
        className={cn(
          "overflow-x-auto px-4 sm:px-0",
          // Tablet+ — no horizontal scroll wrapping needed.
          "sm:overflow-x-visible",
          // Sticky-first-column hook: tag your first th/td with .data-sticky-col
          // and we provide the position-sticky styling.
          stickyFirstColumn &&
            "[&_.data-sticky-col]:sticky [&_.data-sticky-col]:left-0 [&_.data-sticky-col]:bg-surface-base [&_.data-sticky-col]:z-[2] sm:[&_.data-sticky-col]:static sm:[&_.data-sticky-col]:bg-transparent",
          // Subtle right-edge separator on the sticky column so the fade-out
          // boundary reads as a column edge, not a smudge.
          stickyFirstColumn &&
            "[&_.data-sticky-col]:shadow-[1px_0_0_var(--border-subtle)] sm:[&_.data-sticky-col]:shadow-none",
        )}
      >
        {children}
      </div>

      {/* Right-edge fade affordance — phone only, hides when at end of scroll */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-0 right-0 bottom-0 w-6 sm:hidden",
          "bg-gradient-to-l from-surface-base to-transparent transition-opacity duration-200",
          showRightFade ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
