import { cn } from "@/components/ui/utils";

// Shared skeleton primitives for the Pro route loading.tsx files.
//
// These are plain server-rendered blocks (no hooks, no "use client") that
// pulse via Tailwind's animate-pulse. They mirror the real page scaffolding
// — same max-w-[1440px] canvas, same KPI strip / widget-card rhythm — so
// the jump from skeleton to data feels like the same page filling in,
// not a different screen.

// A single shimmering block.
export function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-slate-200/70 dark:bg-slate-800",
        className,
      )}
    />
  );
}

// The page-level frame every Pro route shares (scroll area + centered canvas).
export function SkeletonPageFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="h-full overflow-y-auto bg-slate-50/50">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        {children}
      </div>
    </main>
  );
}

// Breadcrumb + big title + subtitle.
export function SkeletonPageHeader() {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="flex flex-col gap-2.5">
        <Shimmer className="h-3 w-40" />
        <Shimmer className="h-7 w-56" />
        <Shimmer className="h-3.5 w-72" />
      </div>
      <Shimmer className="h-9 w-36 rounded-md" />
    </div>
  );
}

// The 5-cell KPI strip, matching KpiMetricStrip's bordered grid.
export function SkeletonKpiStrip() {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
      <div className="grid grid-cols-1 gap-px bg-slate-200 dark:bg-slate-800 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="flex min-h-[6.75rem] flex-col gap-3 bg-white px-5 py-4 dark:bg-slate-900"
          >
            <Shimmer className="h-3 w-24" />
            <Shimmer className="h-7 w-20" />
            <Shimmer className="mt-auto h-3 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}

// A generic widget card with a header row and a stack of lines.
export function SkeletonWidgetCard({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <Shimmer className="h-4 w-32" />
        <Shimmer className="h-7 w-20 rounded-md" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Shimmer className="h-8 w-8 rounded-full" />
            <Shimmer className="h-3.5 flex-1" />
            <Shimmer className="h-3.5 w-16" />
          </div>
        ))}
      </div>
    </section>
  );
}
