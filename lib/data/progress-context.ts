import "server-only";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import * as db from "@/lib/data/db";
import type { ProgressContext } from "@/lib/data/derivations/progress";

/** Loads all entity lists needed to compute weighted property progress. */
export async function getProgressContext(): Promise<ProgressContext> {
  const userId = getCurrentUserId();
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
    db.leases.list(userId),
    db.tenants.list(userId),
    db.payments.list(userId),
    db.ownershipRecords.list(userId),
    db.coOwners.list(userId),
    db.ownershipDocuments.list(userId),
    db.propertyValuations.list(userId),
    db.safetyRisks.list(userId),
    db.inspections.list(userId),
    db.certifications.list(userId),
    db.emergencyContacts.list(userId),
    db.estateAssignments.list(userId),
    db.documents.list(userId),
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
