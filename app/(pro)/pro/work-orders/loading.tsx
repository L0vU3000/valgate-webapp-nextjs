import {
  SkeletonPageFrame,
  SkeletonPageHeader,
  SkeletonKpiStrip,
  SkeletonWidgetCard,
} from "@/app/(pro)/pro/_components/skeletons";

// Loading skeleton for /pro/work-orders: header + status KPIs + the
// dispatch table alongside the vendor directory card.
export default function WorkOrdersLoading() {
  return (
    <SkeletonPageFrame>
      <SkeletonPageHeader />
      <SkeletonKpiStrip />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[65fr_35fr]">
        <SkeletonWidgetCard rows={8} />
        <SkeletonWidgetCard rows={5} />
      </div>
    </SkeletonPageFrame>
  );
}
