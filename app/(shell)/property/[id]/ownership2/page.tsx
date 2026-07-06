import { notFound } from "next/navigation";
import { PropertyShellProvider } from "@/components/property/PropertyShellContext";
import { PropertyOwnershipPage2 } from "../_components/PropertyOwnershipPage2";
import { getPropertyByIdParam } from "@/lib/data/properties";
import { getPropertyForOrg } from "@/lib/services/properties";
import { computeProgressDetails } from "@/lib/data/derivations/progress";
import { getProgressContext } from "@/lib/data/progress-context";
import { getOwnershipPageData } from "../ownership/queries";
import { resolveCrossOrgCtx } from "@/lib/auth/cross-org";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ orgId?: string }>;
}) {
  const { id } = await params;
  const { orgId } = await searchParams;
  const { ctx, isCrossOrg } = await resolveCrossOrgCtx(orgId);

  const property = isCrossOrg ? await getPropertyForOrg(ctx.orgId, id) : await getPropertyByIdParam(id);
  if (!property) notFound();

  const [progressCtx, ownershipData] = await Promise.all([
    getProgressContext(isCrossOrg ? ctx : undefined),
    getOwnershipPageData(id, property, isCrossOrg ? ctx : undefined),
  ]);
  const progressDetails = computeProgressDetails(property, progressCtx);

  return (
    <PropertyShellProvider property={property} progressDetails={progressDetails}>
      <PropertyOwnershipPage2 property={property} {...ownershipData} />
    </PropertyShellProvider>
  );
}