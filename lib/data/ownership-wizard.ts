import "server-only";
import * as db from "@/lib/data/db";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import type { OwnershipRecord } from "@/lib/data/types/ownership-record";
import type { CoOwner } from "@/lib/data/types/co-owner";

export type OwnershipWizardInitial = {
  record: OwnershipRecord | null;
  coOwners: CoOwner[];
};

export async function getOwnershipWizardInitial(
  propertyId: string,
): Promise<OwnershipWizardInitial> {
  const userId = getCurrentUserId();
  const [records, coOwners] = await Promise.all([
    db.ownershipRecords.listByProperty(userId, propertyId),
    db.coOwners.listByProperty(userId, propertyId),
  ]);
  return {
    record: records[0] ?? null,
    coOwners,
  };
}

export async function listCoOwnersForProperty(
  propertyId: string,
): Promise<CoOwner[]> {
  const userId = getCurrentUserId();
  return db.coOwners.listByProperty(userId, propertyId);
}
