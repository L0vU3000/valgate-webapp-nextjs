import {
  SkeletonPageFrame,
  SkeletonPageHeader,
  SkeletonWidgetCard,
} from "@/app/(pro)/pro/_components/skeletons";

// Loading skeleton for /pro/clients: header + book-of-business table.
export default function ClientsLoading() {
  return (
    <SkeletonPageFrame>
      <SkeletonPageHeader />
      <SkeletonWidgetCard rows={6} />
    </SkeletonPageFrame>
  );
}
