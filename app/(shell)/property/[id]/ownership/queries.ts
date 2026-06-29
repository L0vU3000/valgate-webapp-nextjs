import "server-only";
import { requireCtx } from "@/lib/auth/ctx";
import {
  cachedListOwnershipDocuments,
  cachedListCoOwners,
  cachedListLeases,
  cachedListOwnershipRecords,
  cachedListDocuments,
} from "@/lib/data/cached-reads";
import { listOwnershipHistory } from "@/lib/services/ownership-history";
import type { OwnershipRecord } from "@/lib/data/types/ownership-record";
import type { Property } from "@/lib/data/types/property";
import type { Document as CentralDocument } from "@/lib/data/types/document";
import { buildPropertyFinancials, type PropertyFinancials } from "@/lib/data/derivations/property-financials";

export type { PropertyFinancials };

export type OwnershipPageData = {
  ownershipDocuments: Awaited<ReturnType<typeof cachedListOwnershipDocuments>>;
  verificationDocs: CentralDocument[];
  ownershipHistory: Awaited<ReturnType<typeof listOwnershipHistory>>;
  coOwners: Awaited<ReturnType<typeof cachedListCoOwners>>;
  ownershipRecord: OwnershipRecord | null;
  monthlyRentIncome: number;
  propertyFinancials: PropertyFinancials;
};

export async function getOwnershipPageData(
  propertyId: string,
  property: Property,
): Promise<OwnershipPageData> {
  const authCtx = await requireCtx();
  // All six list calls pass propertyId so the WHERE clause filters at the DB level.
  // cachedListDocuments is scoped to this property — verificationDocs then further filters by
  // verifies.entityType and verifies.entityId, which is NOT a propertyId filter and must
  // remain in JS (it matches by the specific ownership-record id, not by property).
  const [
    ownershipDocuments,
    ownershipHistory,
    coOwners,
    leases,
    ownershipRecords,
    allPropertyDocs,
  ] = await Promise.all([
    cachedListOwnershipDocuments(authCtx, propertyId),
    listOwnershipHistory(authCtx, propertyId),
    cachedListCoOwners(authCtx, propertyId),
    cachedListLeases(authCtx, propertyId),
    cachedListOwnershipRecords(authCtx, propertyId),
    cachedListDocuments(authCtx, propertyId),
  ]);

  const ownershipRecord = ownershipRecords[0] ?? null;

  // Central docs that verify this specific ownership record (de-duped from legacy docs).
  // This filter is NOT a propertyId filter — it matches by verifies.entityType and entityId.
  const verificationDocs: CentralDocument[] = ownershipRecord
    ? allPropertyDocs.filter(
        (doc) =>
          doc.verifies?.entityType === "ownership-record" &&
          doc.verifies.entityId === ownershipRecord.id,
      )
    : [];

  // Leases are already scoped to this property by the DB; only filter by stage here.
  const signedLeases = leases.filter((l) => l.stage === "Signed");
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
