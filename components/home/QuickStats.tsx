import type React from "react";
import { cn } from "../ui/utils";
import { formatCurrency } from "../../lib/format";
import { properties } from "../../lib/mock-data";

const portfolioStats = {
  totalProperties: properties.length,
  totalValue: properties.reduce((sum, p) => sum + p.buyNumeric, 0),
  rentedCount: properties.filter((p) => p.statusVariant === "rented").length,
  vacantCount: properties.filter((p) => p.statusVariant === "vacant").length,
  avgHealth: Math.round(
    properties.reduce((sum, p) => sum + p.health, 0) / properties.length,
  ),
};

function healthClass(health: number) {
  if (health >= 75) return "text-status-success-text";
  if (health >= 40) return "text-status-warning-text";
  return "text-status-danger-text";
}

export function QuickStats({ mapLoaded }: { mapLoaded: boolean }) {
  return (
    <div data-no-drag className={cn(
      "absolute left-6 top-44 z-10 bg-glass-panel-fill backdrop-blur-md border border-glass-panel-border rounded-xl p-6 shadow-sm w-72",
      mapLoaded ? "[animation:fade-slide-left_0.55s_cubic-bezier(0.16,1,0.3,1)_200ms_both]" : "opacity-0",
    )}>
      <p className="text-xs uppercase tracking-wider text-secondary font-medium">
        Portfolio Overview
      </p>
      <p className="text-3xl font-bold font-display text-foreground mt-1">
        {formatCurrency(portfolioStats.totalValue)}
      </p>
      <div className="flex items-center gap-4 mt-3 text-sm text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-interactive-primary" />
          {portfolioStats.totalProperties} Properties
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-status-success" />
          {portfolioStats.rentedCount} Rented
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-status-warning" />
          {portfolioStats.vacantCount} Vacant
        </span>
      </div>
      <div className="mt-3 pt-3 border-t border-border-subtle">
        <span className="text-xs text-secondary">Avg Health </span>
        <span className={cn("text-xs font-medium", healthClass(portfolioStats.avgHealth))}>
          {portfolioStats.avgHealth}%
        </span>
      </div>
    </div>
  );
}

export function MapIconButton({
  children,
  onClick,
  spin,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  spin?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "bg-glass-icon-btn-fill backdrop-blur-md border border-glass-icon-btn-border rounded-lg p-2 shadow-sm text-secondary hover:bg-surface-base hover:text-foreground hover:scale-110 active:scale-95 transition-all duration-150 [&_svg]:transition-transform [&_svg]:duration-300",
        spin && "hover:[&_svg]:rotate-180",
      )}
    >
      {children}
    </button>
  );
}
