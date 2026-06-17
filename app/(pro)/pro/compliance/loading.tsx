import {
  SkeletonPageFrame,
  SkeletonPageHeader,
  SkeletonKpiStrip,
  SkeletonWidgetCard,
} from "@/app/(pro)/pro/_components/skeletons";

// Loading skeleton for /pro/compliance: header + summary KPIs + the
// 65/35 split (certification timeline on the left, the safety-risk and
// inspection cards stacked on the right).
export default function ComplianceLoading() {
  return (
    <SkeletonPageFrame>
      <SkeletonPageHeader />
      <SkeletonKpiStrip />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.85fr_1fr]">
        <SkeletonWidgetCard rows={8} />
        <div className="flex flex-col gap-6">
          <SkeletonWidgetCard rows={4} />
          <SkeletonWidgetCard rows={4} />
        </div>
      </div>
    </SkeletonPageFrame>
  );
}
