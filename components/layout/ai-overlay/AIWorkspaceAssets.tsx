"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText, TrendingUp, Zap } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { formatCurrency } from "@/lib/format";
import type { AiPortfolioBar, AiWorkspaceDocument } from "@/lib/data/derivations/ai-context";
import {
  glassChartArea,
  glassDocIcon,
  glassFilterChipInactive,
  glassProgressFill,
  glassProgressTrack,
  glassStorageFill,
  glassStorageTrack,
  glassTrendIcon,
  glassYieldIcon,
} from "./glass-styles";

const FILTERS = ["All", "Documents", "Charts", "Legal"] as const;
type AssetFilter = (typeof FILTERS)[number];

const STORAGE_CAP_BYTES = 50 * 1024 * 1024;

const BAR_GRADIENTS = [
  "linear-gradient(180deg, #a5f3fc, rgba(165,243,252,0.6))",
  "linear-gradient(180deg, #67e8f9, rgba(103,232,249,0.6))",
  "linear-gradient(180deg, #22d3ee, rgba(34,211,238,0.6))",
  "linear-gradient(180deg, var(--val-primary-dark), rgba(0,74,198,0.7))",
  "linear-gradient(180deg, rgba(0,74,198,0.7), rgba(0,74,198,0.35))",
] as const;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function chartHeights(bars: AiPortfolioBar[]): number[] {
  if (bars.length === 0) return [45, 68, 62, 96, 79];
  const max = Math.max(...bars.map((b) => b.value), 1);
  return bars.map((b) => Math.max(14, Math.round((b.value / max) * 96)));
}

type AIWorkspaceAssetsProps = {
  documents: AiWorkspaceDocument[];
  portfolioBars: AiPortfolioBar[];
  yieldHref: string;
};

export function AIWorkspaceAssets({
  documents,
  portfolioBars,
  yieldHref,
}: AIWorkspaceAssetsProps) {
  const [activeFilter, setActiveFilter] = useState<AssetFilter>("All");

  const totalBytes = useMemo(
    () => documents.reduce((sum, d) => sum + (d.sizeBytes ?? 0), 0),
    [documents],
  );
  const storagePct = Math.min(100, Math.round((totalBytes / STORAGE_CAP_BYTES) * 100));
  const barHeights = useMemo(() => chartHeights(portfolioBars), [portfolioBars]);

  const filteredDocs = useMemo(() => {
    if (activeFilter === "All" || activeFilter === "Documents") {
      return documents;
    }
    if (activeFilter === "Legal") {
      return documents.filter((d) => d.category === "Legal" || d.category === "Title");
    }
    return [];
  }, [activeFilter, documents]);

  const showTools = activeFilter === "All" || activeFilter === "Charts";
  const showDocs = activeFilter === "All" || activeFilter === "Documents" || activeFilter === "Legal";

  return (
    <aside
      className={cn(
        "ai-glass-assets flex h-full w-full shrink-0 flex-col lg:w-[320px]",
        "animate-[glass-panel-right_0.4s_cubic-bezier(0.16,1,0.3,1)_0.2s_both]",
      )}
    >
      <div className="flex flex-col gap-4 px-5 py-5">
        <h3 className="font-display text-[16px] font-bold text-foreground">Workspace Assets</h3>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.5px] transition-all",
                activeFilter === filter
                  ? "ai-glass-cta text-interactive-primary-text"
                  : "text-secondary hover:text-interactive-primary",
              )}
              style={activeFilter !== filter ? glassFilterChipInactive : undefined}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="ai-glass-divider-h mx-5" />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        {showTools && (
          <>
            <Link
              href={yieldHref}
              className="ai-glass-card flex animate-[glass-card-in_0.35s_ease-out_both] flex-col gap-2 rounded-xl p-4 transition-transform hover:-translate-y-0.5"
              style={{ animationDelay: "0.3s" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                  style={glassYieldIcon}
                >
                  <Zap className="size-4 text-[#ea580c]" />
                </div>
                <span className="text-sm font-semibold text-foreground">Yield Projection Tool</span>
              </div>
              <p className="text-[11px] leading-[16.5px] text-secondary">
                Open financials to review yield, cash flow, and ROI for this context.
              </p>
            </Link>

            <div
              className="ai-glass-card flex animate-[glass-card-in_0.35s_ease-out_both] flex-col gap-3 rounded-xl p-4"
              style={{ animationDelay: "0.4s" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                    style={glassTrendIcon}
                  >
                    <TrendingUp className="size-4 text-[#9333ea]" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Portfolio Trend</span>
                </div>
              </div>
              {portfolioBars.length > 0 ? (
                <>
                  <div
                    className="flex h-24 items-end justify-center gap-1 rounded-lg px-2 pb-2 pt-2"
                    style={glassChartArea}
                  >
                    {portfolioBars.map((bar, i) => (
                      <div
                        key={bar.propertyId}
                        className="group/bar relative flex flex-1 flex-col items-center justify-end"
                        title={`${bar.label}: ${formatCurrency(bar.value)}`}
                      >
                        <div
                          className="w-full rounded-t-sm"
                          style={{
                            height: `${barHeights[i] ?? 40}%`,
                            background: BAR_GRADIENTS[i % BAR_GRADIENTS.length],
                            boxShadow:
                              "0 -2px 6px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.2)",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between gap-1 px-1">
                    {portfolioBars.map((bar) => (
                      <span
                        key={bar.propertyId}
                        className="flex-1 truncate text-center text-[9px] text-secondary"
                        title={bar.label}
                      >
                        {bar.label}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-[11px] leading-[16.5px] text-secondary">
                  Open portfolio or a property page to see value trend bars.
                </p>
              )}
            </div>
          </>
        )}

        {showDocs &&
          filteredDocs.slice(0, 6).map((doc, i) => (
            <Link
              key={doc.id}
              href={doc.href}
              target="_blank"
              rel="noopener noreferrer"
              className="ai-glass-card flex animate-[glass-card-in_0.35s_ease-out_both] flex-col gap-3 rounded-xl p-4"
              style={{ animationDelay: `${0.35 + i * 0.05}s` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                  style={glassDocIcon}
                >
                  <FileText className="size-4 text-interactive-primary" />
                </div>
                <span className="truncate text-sm font-semibold text-foreground">{doc.name}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full" style={glassProgressTrack}>
                <div
                  className="h-full rounded-full"
                  style={{
                    ...glassProgressFill,
                    width: `${Math.min(100, 40 + (doc.sizeBytes ?? 0) / 50000)}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[1px] text-status-success">
                  {doc.category}
                </span>
                <span className="text-[10px] text-secondary">
                  {doc.sizeBytes != null ? formatBytes(doc.sizeBytes) : "Document"}
                </span>
              </div>
            </Link>
          ))}

        {showDocs && filteredDocs.length === 0 && activeFilter !== "Charts" && (
          <p className="px-1 py-2 text-sm text-secondary">No documents in this filter.</p>
        )}
      </div>

      <div className="ai-glass-divider-h mx-5" />

      <div className="flex shrink-0 flex-col gap-2 px-5 py-5">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold uppercase tracking-[0.6px] text-foreground">
            Storage Used
          </span>
          <span className="text-xs text-secondary">{storagePct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full" style={glassStorageTrack}>
          <div
            className="h-full rounded-full"
            style={{ ...glassStorageFill, width: `${Math.max(storagePct, 4)}%` }}
          />
        </div>
        <p className="text-[11px] text-secondary">
          {formatBytes(totalBytes)} of {formatBytes(STORAGE_CAP_BYTES)} from documents in scope
        </p>
      </div>
    </aside>
  );
}
