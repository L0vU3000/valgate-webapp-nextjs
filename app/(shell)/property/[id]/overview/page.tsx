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

  const progressCtx: ProgressContext = {
    leases: overviewData.leases,
    tenants: overviewData.tenants,
    payments: overviewData.payments,
    valuations: overviewData.valuations,
    ownershipRecords: overviewData.ownershipRecords,
    coOwners: overviewData.coOwners,
    ownershipDocuments: overviewData.ownershipDocuments,
    safetyRisks: overviewData.safetyRisks,
    inspections: overviewData.inspections,
    certifications: overviewData.certifications,
    emergencyContacts: overviewData.emergencyContacts,
    successorAssignments: overviewData.estateAssignments,
    documents: overviewData.documents,
  };
  const progressDetails = computeProgressDetails(property, progressCtx);

  return <PropertyOverviewPage property={property} {...overviewData} userProfile={overviewData.userProfile} progressDetails={progressDetails} recentActivities={overviewData.recentActivities} />;
}
