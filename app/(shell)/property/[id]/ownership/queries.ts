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
import type { Ctx } from "@/lib/services/_mapping";
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
  overrideCtx?: Ctx,
): Promise<OwnershipPageData> {
  const authCtx = overrideCtx ?? await requireCtx();

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

  const verificationDocs: CentralDocument[] = ownershipRecord
    ? allPropertyDocs.filter(
        (doc) =>
          doc.verifies?.entityType === "ownership-record" &&
          doc.verifies.entityId === ownershipRecord.id,
      )
    : [];

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