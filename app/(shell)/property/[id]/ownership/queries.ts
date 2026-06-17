import "server-only";
import { requireCtx } from "@/lib/auth/ctx";
import { listOwnershipDocuments } from "@/lib/services/ownership-documents";
import { listOwnershipHistory } from "@/lib/services/ownership-history";
import { listCoOwners } from "@/lib/services/co-owners";
import { listLeases } from "@/lib/services/leases";
import { listOwnershipRecords } from "@/lib/services/ownership-records";
import { listDocuments } from "@/lib/services/documents";
import type { OwnershipRecord } from "@/lib/data/types/ownership-record";
import type { Property } from "@/lib/data/types/property";
import type { Document as CentralDocument } from "@/lib/data/types/document";
import { buildPropertyFinancials, type PropertyFinancials } from "@/lib/data/derivations/property-financials";

export type { PropertyFinancials };

export type OwnershipPageData = {
  ownershipDocuments: Awaited<ReturnType<typeof listOwnershipDocuments>>;
  verificationDocs: CentralDocument[];
  ownershipHistory: Awaited<ReturnType<typeof listOwnershipHistory>>;
  coOwners: Awaited<ReturnType<typeof listCoOwners>>;
  ownershipRecord: OwnershipRecord | null;
  monthlyRentIncome: number;
  propertyFinancials: PropertyFinancials;
};

export async function getOwnershipPageData(
  propertyId: string,
  property: Property,
): Promise<OwnershipPageData> {
  const authCtx = await requireCtx();
  const [
    ownershipDocuments,
    ownershipHistory,
    coOwners,
    allLeases,
    ownershipRecords,
    allDocs,
  ] = await Promise.all([
    listOwnershipDocuments(authCtx, propertyId),
    listOwnershipHistory(authCtx, propertyId),
    listCoOwners(authCtx, propertyId),
    listLeases(authCtx),
    listOwnershipRecords(authCtx, propertyId),
    listDocuments(authCtx),
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
