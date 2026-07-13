"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { TrendingUp, X, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { AiPortfolioBar } from "@/lib/data/derivations/ai-context";
import type { PortfolioStats, PortfolioKpis } from "@/lib/data/derivations/portfolio";
import {
  glassChartArea,
  glassCloseButton,
  glassModalOverlay,
  glassModalPanel,
  glassTrendIcon,
} from "./glass-styles";

const BAR_GRADIENTS = [
  "linear-gradient(180deg, #a5f3fc, rgba(165,243,252,0.6))",
  "linear-gradient(180deg, #67e8f9, rgba(103,232,249,0.6))",
  "linear-gradient(180deg, #22d3ee, rgba(34,211,238,0.6))",
  "linear-gradient(180deg, var(--val-primary-dark), rgba(0,74,198,0.7))",
  "linear-gradient(180deg, rgba(0,74,198,0.7), rgba(0,74,198,0.35))",
] as const;

function chartHeights(bars: AiPortfolioBar[]): number[] {
  if (bars.length === 0) return [45, 68, 62, 96, 79];
  const max = Math.max(...bars.map((b) => b.value), 1);
  return bars.map((b) => Math.max(14, Math.round((b.value / max) * 96)));
}

type Portfolio = {
  stats: PortfolioStats;
  kpis: PortfolioKpis;
  propertyCount: number;
} | null;

type Props = {
  open: boolean;
  onClose: () => void;
  portfolioBars: AiPortfolioBar[];
  portfolio: Portfolio;
  portfolioHref: string;
};

export function AIPortfolioSnapshotModal({
  open,
  onClose,
  portfolioBars,
  portfolio,
  portfolioHref,
}: Props) {
  const barHeights = chartHeights(portfolioBars);
  const totalValue = portfolioBars.reduce((sum, b) => sum + b.value, 0);
  const maxBarValue = Math.max(...portfolioBars.map((b) => b.value), 1);
  const hasBars = portfolioBars.length > 0;
  const isSingleProperty = portfolioBars.length === 1;

  const footerLabel = isSingleProperty ? "View property" : "View portfolio";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-[60]"
          style={glassModalOverlay}
        />

        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[60] flex -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl animate-[glass-open_0.35s_cubic-bezier(0.16,1,0.3,1)_both] focus:outline-none"
          style={{
            ...glassModalPanel,
            width: "min(90vw, 640px)",
            maxHeight: "85vh",
          }}
        >
          <div className="flex shrink-0 items-center gap-3 px-6 py-4">
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-lg"
              style={glassTrendIcon}
            >
              <TrendingUp className="size-4 text-[#9333ea]" />
            </div>

            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="font-display text-[15px] font-bold text-foreground">
                Portfolio Snapshot
              </DialogPrimitive.Title>
              <p className="text-[11px] text-secondary">
                {hasBars
                  ? `${portfolioBars.length} ${portfolioBars.length === 1 ? "property" : "properties"} · ${formatCurrency(totalValue)} total value`
                  : "Property values for your current context"}
              </p>
            </div>

            <DialogPrimitive.Close
              className="flex size-10 shrink-0 items-center justify-center rounded-lg transition-opacity hover:opacity-80"
              style={glassCloseButton}
              aria-label="Close portfolio snapshot"
            >
              <X className="size-4 text-foreground" />
            </DialogPrimitive.Close>
          </div>

          <div className="ai-glass-divider-h mx-6" />

          <div className="min-h-0 flex-1 overflow-y-auto">
            {!hasBars ? (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <p className="text-sm text-secondary">
                  Open your portfolio or a property page to see value breakdowns here.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6 p-6">
                {portfolio != null && (
                  <div className="grid grid-cols-3 gap-3">
                    <div
                      className="flex flex-col gap-1 rounded-xl p-3.5"
                      style={{
                        background: "rgba(255,255,255,0.45)",
                        border: "1px solid rgba(255,255,255,0.55)",
                      }}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-[0.7px] text-secondary">
                        Total Value
                      </span>
                      <span className="font-display text-[17px] font-bold leading-tight tabular-nums text-foreground">
                        {portfolio.kpis.totalValueFormatted}
                      </span>
                    </div>

                    <div
                      className="flex flex-col gap-1 rounded-xl p-3.5"
                      style={{
                        background: "rgba(147,51,234,0.04)",
                        border: "1px solid rgba(147,51,234,0.12)",
                      }}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-[0.7px] text-secondary">
                        Occupancy
                      </span>
                      <span
                        className="font-display text-[17px] font-bold leading-tight tabular-nums"
                        style={{ color: "#9333ea" }}
                      >
                        {portfolio.stats.occupancyRate}%
                      </span>
                    </div>

                    <div
                      className="flex flex-col gap-1 rounded-xl p-3.5"
                      style={{
                        background: "rgba(255,255,255,0.45)",
                        border: "1px solid rgba(255,255,255,0.55)",
                      }}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-[0.7px] text-secondary">
                        Avg. Progress
                      </span>
                      <span className="font-display text-[17px] font-bold leading-tight tabular-nums text-foreground">
                        {portfolio.stats.avgProgress}%
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <span className="text-[12px] font-semibold text-foreground">
                    Value by property
                  </span>
                  <div
                    className="flex items-end justify-center gap-2 rounded-xl px-4 pb-3 pt-5"
                    style={{ ...glassChartArea, minHeight: "140px" }}
                    role="img"
                    aria-label="Bar chart of property values"
                  >
                    {portfolioBars.map((bar, i) => (
                      <div
                        key={bar.propertyId}
                        className="flex min-w-0 flex-1 flex-col items-center gap-2"
                      >
                        <span className="text-[10px] font-semibold tabular-nums text-foreground">
                          {formatCurrency(bar.value)}
                        </span>
                        <div
                          className="w-full max-w-[52px] rounded-t-md"
                          style={{
                            height: `${barHeights[i]}px`,
                            background: BAR_GRADIENTS[i % BAR_GRADIENTS.length],
                          }}
                        />
                        <span
                          className="w-full truncate text-center text-[9px] leading-tight text-secondary"
                          title={bar.label}
                        >
                          {bar.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  <span className="text-[12px] font-semibold text-foreground">
                    Full breakdown
                  </span>
                  {portfolioBars.map((bar) => {
                    const pct = Math.max(4, Math.round((bar.value / maxBarValue) * 100));
                    return (
                      <div key={bar.propertyId} className="flex items-center gap-3">
                        <span className="w-[120px] shrink-0 truncate text-[11px] text-secondary">
                          {bar.label}
                        </span>
                        <div className="flex flex-1 items-center gap-2">
                          <div
                            className="flex-1 overflow-hidden rounded-full"
                            style={{
                              height: "6px",
                              background: "rgba(226,232,240,0.6)",
                            }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                background:
                                  "linear-gradient(90deg, #9333ea, color-mix(in srgb, #9333ea 70%, #c084fc))",
                              }}
                            />
                          </div>
                          <span className="w-[88px] shrink-0 text-right text-[11px] font-semibold tabular-nums text-foreground">
                            {formatCurrency(bar.value)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="ai-glass-divider-h mx-6" />

          <div
            className="flex shrink-0 items-center justify-between gap-4 px-6 pt-4"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))" }}
          >
            <a
              href={portfolioHref}
              className="flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-2.5 text-[12px] font-medium text-interactive-primary transition-opacity hover:opacity-80"
              style={glassCloseButton}
            >
              <ExternalLink className="size-3.5 shrink-0" />
              {footerLabel}
            </a>

            {hasBars && (
              <span className="text-[10px] tabular-nums text-secondary">
                {formatCurrency(totalValue)} combined
              </span>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
