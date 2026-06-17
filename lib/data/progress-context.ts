import "server-only";
import { requireCtx } from "@/lib/auth/ctx";
import { listLeases } from "@/lib/services/leases";
import { listTenants } from "@/lib/services/tenants";
import { listPayments } from "@/lib/services/payments";
import { listOwnershipRecords } from "@/lib/services/ownership-records";
import { listCoOwners } from "@/lib/services/co-owners";
import { listOwnershipDocuments } from "@/lib/services/ownership-documents";
import { listPropertyValuations } from "@/lib/services/property-valuations";
import { listSafetyRisks } from "@/lib/services/safety-risks";
import { listInspections } from "@/lib/services/inspections";
import { listCertifications } from "@/lib/services/certifications";
import { listEmergencyContacts } from "@/lib/services/emergency-contacts";
import { listEstateAssignments } from "@/lib/services/estate-assignments";
import { listDocuments } from "@/lib/services/documents";
import type { ProgressContext } from "@/lib/data/derivations/progress";

/** Loads all entity lists needed to compute weighted property progress. */
export async function getProgressContext(): Promise<ProgressContext> {
  const authCtx = await requireCtx();
  const [
    leases,
    tenants,
    payments,
    ownershipRecords,
    coOwners,
    ownershipDocuments,
    valuations,
    safetyRisks,
    inspections,
    certifications,
    emergencyContacts,
    successorAssignments,
    documents,
  ] = await Promise.all([
    listLeases(authCtx),
    listTenants(authCtx),
    listPayments(authCtx),
    listOwnershipRecords(authCtx),
    listCoOwners(authCtx),
    listOwnershipDocuments(authCtx),
    listPropertyValuations(authCtx),
    listSafetyRisks(authCtx),
    listInspections(authCtx),
    listCertifications(authCtx),
    listEmergencyContacts(authCtx),
    listEstateAssignments(authCtx),
    listDocuments(authCtx),
  ]);

  return {
    leases,
    tenants,
    payments,
    ownershipRecords,
    coOwners,
    ownershipDocuments,
    valuations,
    safetyRisks,
    inspections,
    certifications,
    emergencyContacts,
    successorAssignments,
    documents,
  };
}
