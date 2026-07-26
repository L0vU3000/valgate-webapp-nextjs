"use client";

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
}: {
  stats: PortfolioStats;
  mapLoaded: boolean;
  drawerOpen: boolean;
}) {
  const isMobile = useIsMobile();

  // On mobile the drawer pushes up from the bottom (not from the right),
  // so the right offset is only meaningful at tablet+ widths.
  const rightOffset = !isMobile && drawerOpen ? "20rem" : 0;

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
            mapLoaded
              ? "[animation:fade-slide-up_0.5s_cubic-bezier(0.16,1,0.3,1)_300ms_both]"
              : "opacity-0",
          )}
        >
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
  // Sits at `bottom-24` (not `bottom-4`) so it clears the docked AI chat bar
  // (`FloatingAgentChat`, ~56px tall at `bottom-4`) instead of overlapping it.
  return (
    <div
      data-no-drag
      className="absolute bottom-24 z-10 flex justify-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
      style={{ left: 0, right: rightOffset }}
    >
      <div
        className={cn(
          mapLoaded
            ? "[animation:fade-slide-up_0.5s_cubic-bezier(0.16,1,0.3,1)_300ms_both]"
            : "opacity-0",
        )}
      >
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
