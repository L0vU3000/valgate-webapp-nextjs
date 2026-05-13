import { notFound } from "next/navigation";
import { PropertyOverviewPage } from "../_components/PropertyOverviewPage";
import { getPropertyByIdParam } from "@/lib/data/properties";
import { getOverviewPageData } from "./queries";
import { computeProgressDetails, type ProgressContext } from "@/lib/data/derivations/progress";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [property, overviewData] = await Promise.all([
    getPropertyByIdParam(id),
    getOverviewPageData(id),
  ]);
  if (!property) notFound();

  const progressCtx = {
    leases: overviewData.leases,
    tenants: overviewData.tenants,
    payments: overviewData.payments,
    valuations: overviewData.valuations,
    ownershipRecords: overviewData.ownershipRecords,
    coOwners: overviewData.coOwners,
    ownershipDocuments: [],
    safetyRisks: [],
    inspections: [],
    certifications: [],
    emergencyContacts: [],
    successorAssignments: [],
    documents: [],
  } as unknown as ProgressContext;
  const progressDetails = computeProgressDetails(property, progressCtx);

  return <PropertyOverviewPage property={property} {...overviewData} progressDetails={progressDetails} />;
}
