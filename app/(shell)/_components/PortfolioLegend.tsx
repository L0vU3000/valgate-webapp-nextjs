"use client";

import { cn } from "@/components/ui/utils";
import { formatCurrency } from "@/lib/format";
import { progressClass, progressBgClass } from "@/lib/property-helpers";
import type { PortfolioStats } from "@/app/(shell)/portfolio/queries";

export function PortfolioLegend({
  stats,
  mapLoaded,
  drawerOpen,
}: {
  stats: PortfolioStats;
  mapLoaded: boolean;
  drawerOpen: boolean;
}) {
  return (
    <div
      data-no-drag
      className="absolute bottom-4 z-10 flex justify-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
      style={{ left: 0, right: drawerOpen ? "20rem" : 0 }}
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
            <span className="text-[10px] uppercase tracking-wider text-secondary font-medium">
              Portfolio
            </span>
            <span className="text-sm font-bold font-display text-foreground">
              {formatCurrency(stats.totalValue)}
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
