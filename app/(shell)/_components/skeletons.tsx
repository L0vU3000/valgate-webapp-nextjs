import { cn } from "@/components/ui/utils";

// Shared skeleton primitives for the client shell (app/(shell)/) loading.tsx files.
// Mirrors the real page scaffolding — same max-w-[1200px] canvas, same bg-val-bg-page-alt
// background, same card rhythm — so the jump from skeleton to data feels like the same
// page filling in, not a different screen.

// A single shimmering block.
export function Shimmer({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-200/80", className)}
      style={style}
    />
  );
}

// The page-level frame matching PortfolioPage / AnalyticsPage / etc.
// bg-val-bg-page-alt background, flex-1 scrollable canvas, max-w-[1200px] centering.
export function ShellPageFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="h-full flex flex-col bg-val-bg-page-alt">
      <div className="flex-1 overflow-auto scrollbar-none px-4 sm:px-8 pb-6 sm:pb-8">
        <div className="max-w-[1200px] mx-auto flex flex-col gap-5 pt-6">
          {children}
        </div>
      </div>
    </main>
  );
}

// Breadcrumb "Valgate / Page" + big title + subtitle + optional action button.
// Matches the flex header used by PortfolioPage and most other shell routes.
export function ShellPageHeader({ hasButton = true }: { hasButton?: boolean }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Shimmer className="h-3 w-12" />
          <Shimmer className="h-3 w-2 rounded-none" />
          <Shimmer className="h-3 w-24" />
        </div>
        <Shimmer className="h-8 sm:h-10 w-44" />
        <Shimmer className="h-3.5 w-72 max-w-full" />
      </div>
      {hasButton && <Shimmer className="h-9 w-36 rounded" />}
    </div>
  );
}

// The 4-cell (or N-cell) KPI stat grid that most shell pages use.
// Defaults to 4 columns on lg, 2 on smaller viewports.
export function ShellKpiGrid({ cells = 4, cols = 4 }: { cells?: number; cols?: number }) {
  const colClass = cols === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 lg:grid-cols-4";
  return (
    <div className={cn("grid gap-3 sm:gap-4", colClass)}>
      {Array.from({ length: cells }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-100 bg-white p-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <Shimmer className="h-3 w-20" />
            <Shimmer className="h-7 w-7 rounded-md" />
          </div>
          <Shimmer className="h-7 w-24 mt-1" />
          <Shimmer className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

// A card with a header row (title + action button) and a list of row-shaped items.
export function ShellWidgetCard({
  rows = 4,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-slate-100 bg-white p-5 flex flex-col gap-4",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <Shimmer className="h-4 w-36" />
        <Shimmer className="h-7 w-20 rounded-md" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Shimmer className="h-9 w-9 rounded-lg flex-shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
              <Shimmer className="h-3 w-3/4" />
              <Shimmer className="h-2.5 w-1/2" />
            </div>
            <Shimmer className="h-3 w-14" />
          </div>
        ))}
      </div>
    </section>
  );
}

// A chart-style card (tall): header row + a big rectangle standing in for the chart.
export function ShellChartCard({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "rounded-xl border border-slate-100 bg-white p-5 flex flex-col gap-4",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <Shimmer className="h-4 w-40" />
        <Shimmer className="h-7 w-24 rounded-md" />
      </div>
      <Shimmer className="h-40 w-full rounded-lg" />
      <div className="grid grid-cols-3 gap-3">
        <Shimmer className="h-3" />
        <Shimmer className="h-3" />
        <Shimmer className="h-3" />
      </div>
    </section>
  );
}

// A grid of property cards — 1-col mobile, 2-col sm, 3-col lg.
export function ShellPropertyGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-100 bg-white overflow-hidden flex flex-col"
        >
          <Shimmer className="h-36 rounded-none" />
          <div className="p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <Shimmer className="h-4 w-3/4" />
                <Shimmer className="h-3 w-1/2" />
              </div>
              <Shimmer className="h-5 w-16 rounded-full flex-shrink-0" />
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-50">
              <Shimmer className="h-3" />
              <Shimmer className="h-3" />
              <Shimmer className="h-3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// A grid of professional directory cards — 2-col mobile, 3-col lg.
export function ShellDirectoryGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-100 bg-white p-5 flex flex-col gap-3"
        >
          <div className="flex items-center gap-3">
            <Shimmer className="h-12 w-12 rounded-full flex-shrink-0" />
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <Shimmer className="h-4 w-3/4" />
              <Shimmer className="h-3 w-1/2" />
            </div>
          </div>
          <Shimmer className="h-3 w-full" />
          <Shimmer className="h-3 w-2/3" />
          <div className="flex gap-2 mt-1">
            <Shimmer className="h-5 w-16 rounded-full" />
            <Shimmer className="h-5 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Full-height property page frame — mirrors PropertyLayout's:
//   bg-card header bar → tab nav strip → flex-1 scrollable content area.
// Used by property/[id]/* loading.tsx files.
export function ShellPropertyPageFrame({ children }: { children: React.ReactNode }) {
  // Tab widths in px, one per tab (Overview, Financials, Location, Ownership, Rental, Safety, Valuation, Documents).
  const tabWidths = [68, 80, 64, 72, 56, 56, 72, 80];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Property header bar */}
      <div className="bg-card border-b border-border px-3 sm:px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Shimmer className="h-8 w-8 rounded-md flex-shrink-0" />
          <Shimmer className="hidden sm:block h-4 w-16" />
          <Shimmer className="hidden sm:block h-4 w-2 rounded-none" />
          <Shimmer className="h-4 w-44" />
        </div>
        <div className="flex items-center gap-2">
          <Shimmer className="h-7 w-24 rounded-full" />
          <Shimmer className="hidden sm:block h-9 w-9 rounded" />
          <Shimmer className="h-9 w-9 rounded" />
        </div>
      </div>

      {/* Tab nav strip — 8 tabs, icon + label shimmer per tab */}
      <div className="bg-card border-b border-border px-4 sm:px-6 flex gap-0 shrink-0 overflow-x-auto">
        {tabWidths.map((w, i) => (
          <div key={i} className="flex items-center gap-1.5 px-3 py-3 min-h-11 shrink-0">
            <Shimmer className="h-4 w-4 rounded flex-shrink-0" />
            <Shimmer className="h-3 rounded" style={{ width: w }} />
          </div>
        ))}
      </div>

      {/* Page content slot */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}

// Content padding frame used inside ShellPropertyPageFrame.
// Matches the px-4 sm:px-6 py-6 pattern used by property sub-pages.
export function ShellPropertyContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 sm:px-6 py-6 flex flex-col gap-5 max-w-[1200px] mx-auto">
      {children}
    </div>
  );
}
