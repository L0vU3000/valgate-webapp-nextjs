import {
  SkeletonPageFrame,
  SkeletonPageHeader,
  SkeletonKpiStrip,
  SkeletonWidgetCard,
} from "@/app/(pro)/pro/_components/skeletons";

// Loading skeleton for /pro/properties: header + summary KPIs + the
// filterable register table.
export default function PropertiesLoading() {
  return (
    <SkeletonPageFrame>
      <SkeletonPageHeader />
      <SkeletonKpiStrip />
      <SkeletonWidgetCard rows={10} />
    </SkeletonPageFrame>
  );
}
