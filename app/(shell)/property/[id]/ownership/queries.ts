import "server-only";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import * as db from "@/lib/data/db";
import type { OwnershipRecord } from "@/lib/data/types/ownership-record";
import type { Property } from "@/lib/data/types/property";
import type { Document as CentralDocument } from "@/lib/data/types/document";
import { buildPropertyFinancials, type PropertyFinancials } from "@/lib/data/derivations/property-financials";

export type { PropertyFinancials };

export type OwnershipPageData = {
  ownershipDocuments: Awaited<ReturnType<typeof db.ownershipDocuments.list>>;
  verificationDocs: CentralDocument[];
  ownershipHistory: Awaited<ReturnType<typeof db.ownershipHistory.list>>;
  coOwners: Awaited<ReturnType<typeof db.coOwners.list>>;
  ownershipRecord: OwnershipRecord | null;
  monthlyRentIncome: number;
  propertyFinancials: PropertyFinancials;
};

export async function getOwnershipPageData(
  propertyId: string,
  property: Property,
): Promise<OwnershipPageData> {
  const userId = getCurrentUserId();
  const [
    ownershipDocuments,
    ownershipHistory,
    coOwners,
    allLeases,
    ownershipRecords,
    allDocs,
  ] = await Promise.all([
    db.ownershipDocuments.listByProperty(userId, propertyId),
    db.ownershipHistory.listByProperty(userId, propertyId),
    db.coOwners.listByProperty(userId, propertyId),
    db.leases.list(userId),
    db.ownershipRecords.listByProperty(userId, propertyId),
    db.documents.list(userId),
  ]);

  const ownershipRecord = ownershipRecords[0] ?? null;

  // Central docs that verify this specific ownership record (de-duped from legacy docs)
  const verificationDocs: CentralDocument[] = ownershipRecord
    ? allDocs.filter(
        (doc) =>
          doc.verifies?.entityType === "ownership-record" &&
          doc.verifies.entityId === ownershipRecord.id,
      )
    : [];

  const signedLeases = allLeases.filter(
    (l) => l.propertyId === propertyId && l.stage === "Signed",
  );
  const monthlyRentIncome = signedLeases.reduce((s, l) => s + l.monthlyRent, 0);

  return {
    ownershipDocuments,
    verificationDocs,
    ownershipHistory,
    coOwners,
    ownershipRecord,
    monthlyRentIncome,
    propertyFinancials: buildPropertyFinancials(property),
  };
}

export { buildPropertyFinancials };
