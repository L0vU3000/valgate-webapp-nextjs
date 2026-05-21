"use server";

import { revalidateTag } from "next/cache";
import * as db from "@/lib/data/db/ownership-records";
import * as dbDocuments from "@/lib/data/db/documents";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import type { OwnershipRecord } from "@/lib/data/types/ownership-record";
import type { ActionResult } from "./properties.actions";
import { getOwnershipWizardInitial } from "@/lib/data/ownership-wizard";
import type { CoOwner } from "@/lib/data/types/co-owner";

export async function createOwnershipRecord(
  data: db.NewOwnershipRecord,
): Promise<ActionResult<OwnershipRecord>> {
  const userId = getCurrentUserId();
  const record = await db.create(userId, data);
  revalidateTag("ownership-records");
  return { ok: true, data: record };
}

export async function updateOwnershipRecord(
  id: string,
  patch: Partial<OwnershipRecord>,
): Promise<ActionResult<OwnershipRecord>> {
  const userId = getCurrentUserId();
  const updated = await db.update(userId, id, patch);
  if (!updated) return { ok: false, error: "Ownership record not found" };
  revalidateTag("ownership-records");
  return { ok: true, data: updated };
}

export async function deleteOwnershipRecord(
  id: string,
): Promise<ActionResult<void>> {
  const userId = getCurrentUserId();
  await db.remove(userId, id);
  revalidateTag("ownership-records");
  return { ok: true, data: undefined };
}

export async function verifyOwnership(
  id: string,
  evidenceDocIds: string[],
): Promise<ActionResult<OwnershipRecord>> {
  if (evidenceDocIds.length === 0) {
    return { ok: false, error: "At least one evidence document is required" };
  }
  const userId = getCurrentUserId();

  // Link each doc back to the ownership record
  for (const docId of evidenceDocIds) {
    await dbDocuments.update(userId, docId, {
      verifies: { entityType: "ownership-record", entityId: id },
    });
  }

  const updated = await db.update(userId, id, {
    verified: true,
    verifiedAt: Date.now(),
    evidenceDocIds,
  });
  if (!updated) return { ok: false, error: "Ownership record not found" };

  revalidateTag("ownership-records");
  revalidateTag("documents");
  return { ok: true, data: updated };
}

export async function revokeOwnershipVerification(
  id: string,
): Promise<ActionResult<OwnershipRecord>> {
  const userId = getCurrentUserId();
  const current = await db.get(userId, id);
  if (!current) return { ok: false, error: "Ownership record not found" };

  // Clear the verifies link on each evidence doc (docs are NOT deleted)
  if (current.evidenceDocIds && current.evidenceDocIds.length > 0) {
    for (const docId of current.evidenceDocIds) {
      await dbDocuments.update(userId, docId, { verifies: undefined });
    }
  }

  // Patch with undefined values — JSON.stringify omits undefined, so the fields
  // are absent in the written file (Zod strips them on next read).
  const updated = await db.update(userId, id, {
    verified: undefined,
    verifiedAt: undefined,
    evidenceDocIds: undefined,
  });
  if (!updated) return { ok: false, error: "Failed to update ownership record" };

  revalidateTag("ownership-records");
  revalidateTag("documents");
  return { ok: true, data: updated };
}

export async function getOwnershipWizardInitialAction(
  propertyId: string,
): Promise<ActionResult<{ record: OwnershipRecord | null; coOwners: CoOwner[] }>> {
  const data = await getOwnershipWizardInitial(propertyId);
  return { ok: true, data };
}
