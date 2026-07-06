import { notFound } from "next/navigation";
import { PropertyShellProvider } from "@/components/property/PropertyShellContext";
import { getPropertyByIdParam } from "@/lib/data/properties";
import { getPropertyForOrg } from "@/lib/services/properties";
import { computeProgressDetails } from "@/lib/data/derivations/progress";
import { getProgressContext } from "@/lib/data/progress-context";
import { PropertySafetyPage } from "@/app/(shell)/property/[id]/_components/PropertySafetyPage";
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

  const [property, progressCtx] = await Promise.all([
    isCrossOrg ? getPropertyForOrg(ctx.orgId, id) : getPropertyByIdParam(id),
    getProgressContext(isCrossOrg ? ctx : undefined),
  ]);
  if (!property) notFound();
  const progressDetails = computeProgressDetails(property, progressCtx);

  return (
    <PropertyShellProvider property={property} progressDetails={progressDetails}>
      <PropertySafetyPage property={property} />
    </PropertyShellProvider>
  );
}