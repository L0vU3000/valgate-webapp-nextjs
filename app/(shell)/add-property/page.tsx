import { Suspense } from "react";
import { AddPropertyFlow } from "./_components/AddPropertyFlow";
import { getAddPropertyPageData } from "@/lib/data/add-property-page";

function AddPropertyFlowFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
      Loading…
    </div>
  );
}

export default async function Page() {
  const { drafts } = await getAddPropertyPageData();

  return (
    <Suspense fallback={<AddPropertyFlowFallback />}>
      <AddPropertyFlow drafts={drafts} />
    </Suspense>
  );
}
