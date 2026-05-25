"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Zap, X, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { AiPortfolioBar } from "@/lib/data/derivations/ai-context";
import type { PortfolioStats, PortfolioKpis } from "@/lib/data/derivations/portfolio";
import {
  glassCloseButton,
  glassModalOverlay,
  glassModalPanel,
  glassYieldIcon,
} from "./glass-styles";

type Portfolio = {
  stats: PortfolioStats;
  kpis: PortfolioKpis;
  propertyCount: number;
  monthlyExpectedRaw: number;
  monthlyCollectedRaw: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  portfolio: Portfolio | null;
  portfolioBars: AiPortfolioBar[];
  yieldHref: string;
};

export function AIYieldModal({
  open,
  onClose,
  portfolio,
  portfolioBars,
  yieldHref,
}: Props) {
  const stats = portfolio?.stats;
  const kpis = portfolio?.kpis;
  const monthlyExpectedRaw = portfolio?.monthlyExpectedRaw ?? 0;
  const monthlyCollectedRaw = portfolio?.monthlyCollectedRaw ?? 0;

  const totalValue = stats?.totalValue ?? 0;
  const annualRent = monthlyExpectedRaw * 12;
  const grossYield =
    totalValue > 0 && annualRent > 0
      ? ((annualRent / totalValue) * 100).toFixed(1)
      : null;

  const collectionRate =
    monthlyExpectedRaw > 0
      ? Math.min(100, Math.round((monthlyCollectedRaw / monthlyExpectedRaw) * 100))
      : null;

  const maxBarValue = Math.max(...portfolioBars.map((b) => b.value), 1);

  const collectionColor =
    collectionRate == null
      ? "#2563eb"
      : collectionRate >= 90
        ? "#16a34a"
        : collectionRate >= 70
          ? "#2563eb"
          : "#ea580c";

  const hasData = portfolio != null || portfolioBars.length > 0;

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
          {/* Header */}
          <div className="flex shrink-0 items-center gap-3 px-5 py-4">
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-lg"
              style={glassYieldIcon}
            >
              <Zap className="size-4 text-[#ea580c]" />
            </div>

            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="font-display text-[15px] font-bold text-foreground">
                Yield Projection Tool
              </DialogPrimitive.Title>
              <p className="text-[11px] text-secondary">
                {kpis?.monthLabel ?? "Portfolio financial overview"}
              </p>
            </div>

            <DialogPrimitive.Close
              className="flex size-10 shrink-0 items-center justify-center rounded-lg transition-opacity hover:opacity-80"
              style={glassCloseButton}
              aria-label="Close yield projection"
            >
              <X className="size-4 text-foreground" />
            </DialogPrimitive.Close>
          </div>

          <div className="ai-glass-divider-h mx-5" />

          {/* Scrollable body */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {!hasData ? (
              <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
                <p className="text-sm text-secondary">
                  Navigate to your portfolio or a property page to see yield projections.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-5 p-5">

                {/* Key Metrics — 3 tiles */}
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
                        Portfolio Value
                      </span>
                      <span className="font-display text-[18px] font-bold leading-tight tabular-nums text-foreground">
                        {kpis?.totalValueFormatted ?? "—"}
                      </span>
                      <span className="text-[10px] text-secondary">
                        {stats?.totalProperties ?? 0}{" "}
                        {stats?.totalProperties === 1 ? "property" : "properties"}
                      </span>
                    </div>

                    <div
                      className="flex flex-col gap-1 rounded-xl p-3.5"
                      style={{
                        background: "rgba(234,88,12,0.04)",
                        border: "1px solid rgba(234,88,12,0.12)",
                      }}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-[0.7px] text-secondary">
                        Gross Yield
                      </span>
                      <span
                        className="font-display text-[18px] font-bold leading-tight tabular-nums"
                        style={{ color: "#ea580c" }}
                      >
                        {grossYield != null ? `${grossYield}%` : "—"}
                      </span>
                      <span className="text-[10px] text-secondary">Annualised est.</span>
                    </div>

                    <div
                      className="flex flex-col gap-1 rounded-xl p-3.5"
                      style={{
                        background: "rgba(22,163,74,0.04)",
                        border: "1px solid rgba(22,163,74,0.12)",
                      }}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-[0.7px] text-secondary">
                        Occupancy
                      </span>
                      <span
                        className="font-display text-[18px] font-bold leading-tight tabular-nums"
                        style={{ color: "#16a34a" }}
                      >
                        {stats != null ? `${stats.occupancyRate}%` : "—"}
                      </span>
                      <span className="text-[10px] text-secondary">
                        {stats != null
                          ? `${stats.rentedCount} rented · ${stats.vacantCount} vacant`
                          : "No data"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Monthly Cash Flow */}
                {portfolio != null && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-foreground">
                        Monthly Cash Flow
                      </span>
                      <span className="text-[10px] text-secondary">{kpis?.monthLabel}</span>
                    </div>

                    <div
                      className="rounded-xl p-4"
                      style={{
                        background: "rgba(255,255,255,0.35)",
                        border: "1px solid rgba(255,255,255,0.5)",
                      }}
                    >
                      <div className="mb-3 flex items-end justify-between gap-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.5px] text-secondary">
                            Collected
                          </span>
                          <span className="font-display text-[22px] font-bold leading-none tabular-nums text-foreground">
                            {kpis?.monthlyCollected ?? "—"}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.5px] text-secondary">
                            Expected
                          </span>
                          <span className="font-display text-[15px] font-semibold leading-none tabular-nums text-secondary">
                            {kpis?.monthlyExpected ?? "—"}
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div
                        className="h-2 overflow-hidden rounded-full"
                        style={{
                          background: "rgba(226,232,240,0.7)",
                          border: "1px solid rgba(255,255,255,0.5)",
                        }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${collectionRate ?? 0}%`,
                            background:
                              collectionRate != null && collectionRate >= 90
                                ? "linear-gradient(90deg, #16a34a, #22c55e)"
                                : collectionRate != null && collectionRate >= 70
                                  ? "linear-gradient(90deg, #2563eb, #3b82f6)"
                                  : "linear-gradient(90deg, #ea580c, #f97316)",
                          }}
                        />
                      </div>

                      {collectionRate != null && (
                        <div className="mt-2 flex justify-end">
                          <span
                            className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                            style={{
                              background: `${collectionColor}18`,
                              color: collectionColor,
                            }}
                          >
                            {collectionRate}% collected
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Property Value Breakdown */}
                {portfolioBars.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <span className="text-[12px] font-semibold text-foreground">
                      Property Values
                    </span>
                    <div className="flex flex-col gap-2.5">
                      {portfolioBars.map((bar) => {
                        const pct = Math.max(4, Math.round((bar.value / maxBarValue) * 100));
                        return (
                          <div key={bar.propertyId} className="flex items-center gap-3">
                            <span className="w-[110px] shrink-0 truncate text-[11px] text-secondary">
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
                                      "linear-gradient(90deg, var(--interactive-primary), color-mix(in srgb, var(--interactive-primary) 75%, #22d3ee))",
                                  }}
                                />
                              </div>
                              <span className="w-[84px] shrink-0 text-right text-[11px] font-semibold tabular-nums text-foreground">
                                {formatCurrency(bar.value)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Disclaimer */}
                {grossYield == null && portfolio != null && (
                  <p className="text-[10px] leading-relaxed text-secondary">
                    Gross yield requires active signed leases with rental amounts configured.
                    Add lease data in the Rental section of each property.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="ai-glass-divider-h mx-5" />

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-between px-5 py-4 pb-safe">
            <a
              href={yieldHref}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-[12px] font-medium text-interactive-primary transition-opacity hover:opacity-80"
              style={glassCloseButton}
            >
              <ExternalLink className="size-3.5" />
              Open full financials
            </a>

            <span className="text-[10px] text-secondary">
              {grossYield != null
                ? `Est. gross yield · ${grossYield}% p.a.`
                : "Complete lease data for yield"}
            </span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
