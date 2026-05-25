"use client";

import { useMemo, useState } from "react";
import { FileText, TrendingUp, Zap } from "lucide-react";
import { AIDocumentModal } from "./AIDocumentModal";
import { AIYieldModal } from "./AIYieldModal";
import { cn } from "@/components/ui/utils";
import { formatCurrency } from "@/lib/format";
import type { AiPortfolioBar, AiWorkspaceDocument } from "@/lib/data/derivations/ai-context";
import type { PortfolioStats, PortfolioKpis } from "@/lib/data/derivations/portfolio";
import {
  glassChartArea,
  glassDocIcon,
  glassFilterChipInactive,
  glassStorageFill,
  glassStorageTrack,
  glassTrendIcon,
  glassYieldIcon,
} from "./glass-styles";

const FILTERS = ["All", "Documents", "Legal"] as const;
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

type PortfolioForYield = {
  stats: PortfolioStats;
  kpis: PortfolioKpis;
  propertyCount: number;
  monthlyExpectedRaw: number;
  monthlyCollectedRaw: number;
} | null;

type AIWorkspaceAssetsProps = {
  documents: AiWorkspaceDocument[];
  portfolioBars: AiPortfolioBar[];
  yieldHref: string;
  portfolio: PortfolioForYield;
};

export function AIWorkspaceAssets({
  documents,
  portfolioBars,
  yieldHref,
  portfolio,
}: AIWorkspaceAssetsProps) {
  const [activeFilter, setActiveFilter] = useState<AssetFilter>("All");
  const [selectedDoc, setSelectedDoc] = useState<(typeof documents)[number] | null>(null);
  const [yieldModalOpen, setYieldModalOpen] = useState(false);

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

  const showTools = activeFilter === "All";
  const showDocs = activeFilter === "All" || activeFilter === "Documents" || activeFilter === "Legal";

  return (
    <>
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
                "rounded-full px-3 py-2 sm:py-1 min-h-9 sm:min-h-0 text-[11px] sm:text-[10px] font-semibold uppercase tracking-[0.5px] transition-all",
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
            <button
              type="button"
              onClick={() => setYieldModalOpen(true)}
              className="ai-glass-card flex animate-[glass-card-in_0.35s_ease-out_both] flex-col gap-2 rounded-xl p-4 text-left transition-transform hover:-translate-y-0.5"
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
                Review yield, cash flow, and ROI for this context.
              </p>
            </button>

            <div
              className="ai-glass-card flex animate-[glass-card-in_0.35s_ease-out_both] flex-col gap-2.5 rounded-xl p-4"
              style={{ animationDelay: "0.4s" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                  style={glassTrendIcon}
                >
                  <TrendingUp className="size-4 text-[#9333ea]" />
                </div>
                <span className="text-sm font-semibold text-foreground">Portfolio Snapshot</span>
              </div>
              {portfolioBars.length > 0 ? (
                <div className="flex flex-col gap-1.5 pt-0.5">
                  {portfolioBars.slice(0, 3).map((bar) => (
                    <div key={bar.propertyId} className="flex items-center justify-between gap-2">
                      <span className="truncate text-[11px] text-secondary">{bar.label}</span>
                      <span className="shrink-0 text-[11px] font-semibold text-foreground">
                        {formatCurrency(bar.value)}
                      </span>
                    </div>
                  ))}
                  {portfolioBars.length > 3 && (
                    <p className="text-[10px] text-secondary">
                      +{portfolioBars.length - 3} more properties
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-[11px] leading-[16.5px] text-secondary">
                  Open portfolio or a property page to see values.
                </p>
              )}
            </div>
          </>
        )}

        {showDocs &&
          filteredDocs.slice(0, 6).map((doc, i) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => setSelectedDoc(doc)}
              className="ai-glass-card flex animate-[glass-card-in_0.35s_ease-out_both] flex-col gap-3 rounded-xl p-4 text-left transition-transform hover:-translate-y-0.5"
              style={{ animationDelay: `${0.35 + i * 0.05}s` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                  style={
                    doc.mimeType === "application/pdf"
                      ? {
                          background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                          boxShadow: "0 2px 8px rgba(37,99,235,0.28), inset 0 1px 0 rgba(255,255,255,0.15)",
                        }
                      : glassDocIcon
                  }
                >
                  {doc.mimeType === "application/pdf" ? (
                    <span className="text-[10px] font-black tracking-wide text-white">VG</span>
                  ) : (
                    <FileText className="size-4 text-interactive-primary" />
                  )}
                </div>
                <span className="truncate text-sm font-semibold text-foreground">{doc.name}</span>
              </div>
              {doc.description && (
                <p className="truncate text-[11px] leading-relaxed text-secondary">
                  {doc.description}
                </p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[1px] text-status-success">
                  {doc.category}
                </span>
                <span className="text-[10px] text-secondary">
                  {doc.sizeBytes != null ? formatBytes(doc.sizeBytes) : "Document"}
                </span>
              </div>
            </button>
          ))}

        {showDocs && filteredDocs.length === 0 && (
          <p className="px-1 py-2 text-sm text-secondary">No documents in this filter.</p>
        )}
      </div>

      <div className="ai-glass-divider-h mx-5" />

      <div className="flex shrink-0 items-center justify-between px-5 py-4">
        <span className="text-[11px] text-secondary">
          {documents.length} document{documents.length === 1 ? "" : "s"} in scope
        </span>
        <span className="text-[11px] text-secondary">{formatBytes(totalBytes)}</span>
      </div>
    </aside>

      <AIDocumentModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
      <AIYieldModal
        open={yieldModalOpen}
        onClose={() => setYieldModalOpen(false)}
        portfolio={portfolio}
        portfolioBars={portfolioBars}
        yieldHref={yieldHref}
      />
    </>
  );
}

