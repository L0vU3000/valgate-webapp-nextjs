"use client";

import type { ReactNode } from "react";
import { cn } from "@/components/ui/utils";
import { useIsMobile } from "@/components/ui/use-mobile";
import { formatCurrency } from "@/lib/format";
import { progressClass, progressBgClass } from "@/lib/property-helpers";
import type { PortfolioStats } from "@/app/(shell)/portfolio/queries";

/**
 * PortfolioLegend
 *
 * Bottom-anchored summary pill that floats over the map on the home page.
 *
 * Mobile (`useIsMobile`): a compact 2×2 grid card so the four stats fit
 * inside a 484px viewport without horizontal overflow. The right edge is
 * also offset from the FAB by `right-20` (the FAB sits at `right-4`,
 * 56px wide, plus a comfortable gap).
 *
 * Desktop: the original single-row pill with dividers between groups.
 * The `right` offset shrinks when the property drawer is open so the
 * pill stays visually centered in the remaining space.
 */
export function PortfolioLegend({
  stats,
  mapLoaded,
  drawerOpen,
  quickAddOpen = false,
  action,
}: {
  stats: PortfolioStats;
  mapLoaded: boolean;
  drawerOpen: boolean;
  // True as soon as quick-add is active — before a pin is dropped and while suggestions are only
  // previewed. Distinct from `drawerOpen` because the two want different placement: the property
  // drawer leaves the pill centred in the space beside it, quick-add parks it left (see `align`).
  quickAddOpen?: boolean;
  // Rendered directly above the stats card, inside the same positioned wrapper. The action button
  // lives here rather than in HomePage so it inherits the legend's placement maths — safe-area
  // inset, the FAB gap on mobile, and the drawer's right shift — instead of re-deriving them and
  // drifting the first time one of them changes.
  action?: ReactNode;
}) {
  const isMobile = useIsMobile();

  // Quick add moves the whole column — search bar and stats pill both — to the left edge of the map
  // pane, from the moment it becomes active. The card lands on the right, so the pill gets out of
  // the way up front and does not slide around under the card on every pin drag.
  const align = !isMobile && quickAddOpen;

  // On mobile the drawer pushes up from the bottom (not from the right),
  // so the centre shift is only meaningful at tablet+ widths. Left-aligned, there is nothing to
  // centre in, so the shift goes away entirely.
  //
  // Expressed as an offset on `left` rather than a `right` inset: the anchored element is
  // shrink-to-fit, so a `right` inset would resize it, and the pill inside it would not track the
  // resize smoothly. Half the drawer width pulls the centred pill to the same spot either way — the
  // old `left: 0; right: 20rem` and `justify-center` centred it at `50% - 10rem`.
  const centreShift = !isMobile && drawerOpen && !align ? "10rem" : "0px";

  // Anchored with `left` + `transform` instead of `justify-content`: changing a justify value is
  // discrete, so the move to the left edge used to snap. Both of these interpolate, so the column
  // glides. Written as `calc()` in both states so the interpolated values stay the same shape as
  // the endpoints. Same resting positions as before: centred on the map pane's middle (less half
  // the drawer), or 1rem from its left edge while quick-add is active.
  const anchor = align
    ? { left: "calc(0% + 1rem)", transform: "translateX(0)" }
    : { left: `calc(50% - ${centreShift})`, transform: "translateX(-50%)" };

  // Common card content (the four stats). On mobile each stat is its own
  // grid cell, on desktop they sit in a horizontal flex row with dividers.
  const portfolioValue = formatCurrency(stats.totalValue);

  if (isMobile) {
    // Mobile layout — compact 2×2 grid card.
    return (
      <div
        data-no-drag
        // Positioned at the bottom-left, leaving space on the right for the
        // floating AI button (`MobileAIFab`). The FAB is 56px wide with a
        // 16px gap from the right edge — `right-20` (80px) gives 8px of
        // breathing room between the two.
        className="absolute bottom-4 left-4 right-20 z-10 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          bottom: "calc(1rem + env(safe-area-inset-bottom))",
        }}
      >
        <div
          className={cn(
            "flex flex-col gap-2",
            mapLoaded
              ? "[animation:fade-slide-up_0.5s_cubic-bezier(0.16,1,0.3,1)_300ms_both]"
              : "opacity-0",
          )}
        >
          {action}
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 bg-glass-panel-fill backdrop-blur-md border border-glass-panel-border rounded-2xl shadow-sm px-4 py-3">
            {/* Portfolio value */}
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-[0.05em] text-slate-500 font-semibold">
                Portfolio
              </span>
              <span className="text-[18px] sm:text-[22px] font-bold font-display text-foreground tabular-nums truncate">
                {portfolioValue}
              </span>
            </div>

            {/* Property count */}
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-[0.05em] text-slate-500 font-semibold">
                Properties
              </span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-interactive-primary shrink-0" />
                <span className="text-[18px] sm:text-[22px] font-bold text-foreground tabular-nums">
                  {stats.totalProperties}
                </span>
              </div>
            </div>

            {/* Rented */}
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-[0.05em] text-slate-500 font-semibold">
                Rented
              </span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-status-success shrink-0" />
                <span className="text-sm font-medium text-foreground">
                  {stats.rentedCount}
                </span>
                <span className="text-xs text-secondary">·</span>
                <span className="text-xs text-secondary">{stats.vacantCount} vacant</span>
              </div>
            </div>

            {/* Avg progress */}
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-[0.05em] text-slate-500 font-semibold">
                Avg Progress
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    progressBgClass(stats.avgProgress),
                  )}
                />
                <span
                  className={cn(
                    "text-sm font-medium",
                    progressClass(stats.avgProgress),
                  )}
                >
                  {stats.avgProgress}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop layout — single-row glass pill.
  return (
    <div
      data-no-drag
      className={cn(
        // 600ms on the Material standard curve, not the house expo-out. Expo-out front-loads the
        // move: sampled at 60fps it covers 16% of this ~390px travel in one frame, which reads as a
        // snap with a long tail. Standard spreads that to 7.5% per frame and still settles in 0.58s.
        // (`transition-all` so the pin-gated drawer shift, which moves `left` the same way, matches.)
        "absolute bottom-4 z-10 flex transition-all duration-[600ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
      )}
      // Shrink-to-fit box anchored by `left`/`transform` (see `anchor`), so the outer flex needs no
      // justify value: the column is the only child.
      style={{ ...anchor, right: "auto" }}
    >
      <div
        className={cn(
          "flex flex-col gap-2",
          // The search bar is wider than the stats pill, so the column has to be left-flush when it
          // is parked left or the two would stagger against each other's centres.
          align ? "items-start" : "items-center",
          mapLoaded
            ? "[animation:fade-slide-up_0.5s_cubic-bezier(0.16,1,0.3,1)_300ms_both]"
            : "opacity-0",
        )}
      >
        {action}
        <div className="flex items-center bg-glass-panel-fill backdrop-blur-md border border-glass-panel-border rounded-full shadow-sm px-5 py-2.5 gap-4 whitespace-nowrap">
          {/* Total value */}
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] uppercase tracking-[0.05em] text-slate-500 font-semibold">
              Portfolio
            </span>
            <span className="text-sm font-bold font-display text-foreground">
              {portfolioValue}
            </span>
          </div>

          <div className="w-px h-4 bg-border-subtle shrink-0" />

          {/* Property count */}
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-interactive-primary shrink-0" />
            <span className="text-sm font-medium text-foreground">
              {stats.totalProperties}
            </span>
            <span className="text-xs text-secondary">Properties</span>
          </div>

          {/* Rented */}
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-status-success shrink-0" />
            <span className="text-sm font-medium text-foreground">
              {stats.rentedCount}
            </span>
            <span className="text-xs text-secondary">Rented</span>
          </div>

          {/* Vacant */}
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-status-warning shrink-0" />
            <span className="text-sm font-medium text-foreground">
              {stats.vacantCount}
            </span>
            <span className="text-xs text-secondary">Vacant</span>
          </div>

          <div className="w-px h-4 bg-border-subtle shrink-0" />

          {/* Avg progress */}
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full shrink-0",
                progressBgClass(stats.avgProgress),
              )}
            />
            <span className="text-xs text-secondary">Avg Progress</span>
            <span
              className={cn(
                "text-sm font-medium",
                progressClass(stats.avgProgress),
              )}
            >
              {stats.avgProgress}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
