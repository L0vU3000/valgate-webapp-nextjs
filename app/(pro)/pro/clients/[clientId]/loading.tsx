import {
  SkeletonPageFrame,
  SkeletonPageHeader,
  SkeletonKpiStrip,
  SkeletonWidgetCard,
} from "@/app/(pro)/pro/_components/skeletons";

// Loading skeleton for /pro/clients/[clientId]: the per-owner portfolio —
// header + client KPI strip + portfolio table + owner statement / contact.
export default function ClientPortfolioLoading() {
  return (
    <SkeletonPageFrame>
      <SkeletonPageHeader />
      <SkeletonKpiStrip />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[65fr_35fr]">
        <div className="flex flex-col gap-6">
          <SkeletonWidgetCard rows={6} />
          <SkeletonWidgetCard rows={4} />
        </div>
        <div className="flex flex-col gap-6">
          <SkeletonWidgetCard rows={8} />
          <SkeletonWidgetCard rows={3} />
        </div>
      </div>
    </SkeletonPageFrame>
  );
}
