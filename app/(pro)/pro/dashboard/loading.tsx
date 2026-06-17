import {
  SkeletonPageFrame,
  SkeletonPageHeader,
  SkeletonKpiStrip,
  SkeletonWidgetCard,
  Shimmer,
} from "@/app/(pro)/pro/_components/skeletons";

// Loading skeleton for /pro/dashboard. Mirrors the real layout:
// header → KPI strip → alerts row → 65/35 grid → 50/50 bottom row.
export default function DashboardLoading() {
  return (
    <SkeletonPageFrame>
      <SkeletonPageHeader />
      <SkeletonKpiStrip />

      {/* Alerts strip */}
      <div className="flex gap-2">
        <Shimmer className="h-8 w-56 rounded-full" />
        <Shimmer className="h-8 w-64 rounded-full" />
        <Shimmer className="h-8 w-48 rounded-full" />
      </div>

      {/* 65 / 35 main content split */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[65fr_35fr]">
        <div className="flex flex-col gap-6">
          <SkeletonWidgetCard rows={6} />
          <SkeletonWidgetCard rows={6} />
        </div>
        <div className="flex flex-col gap-6">
          <SkeletonWidgetCard rows={3} />
          <SkeletonWidgetCard rows={3} />
          <SkeletonWidgetCard rows={3} />
        </div>
      </div>

      {/* 50 / 50 bottom row */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <SkeletonWidgetCard rows={4} />
        <SkeletonWidgetCard rows={4} />
      </div>
    </SkeletonPageFrame>
  );
}
