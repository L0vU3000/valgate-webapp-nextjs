import {
  SkeletonPageFrame,
  SkeletonPageHeader,
  SkeletonKpiStrip,
  SkeletonWidgetCard,
} from "@/app/(pro)/pro/_components/skeletons";

// Loading skeleton for /pro/rent: header + collection KPIs + rent roll
// table alongside the overdue / expiring-lease side cards.
export default function RentLoading() {
  return (
    <SkeletonPageFrame>
      <SkeletonPageHeader />
      <SkeletonKpiStrip />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[65fr_35fr]">
        <SkeletonWidgetCard rows={8} />
        <div className="flex flex-col gap-6">
          <SkeletonWidgetCard rows={4} />
          <SkeletonWidgetCard rows={4} />
        </div>
      </div>
    </SkeletonPageFrame>
  );
}
