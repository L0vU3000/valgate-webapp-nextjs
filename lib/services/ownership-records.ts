import "server-only"; // C1
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { ownershipRecords } from "@/lib/db/schema";
import { OwnershipRecordSchema, type OwnershipRecord } from "@/lib/data/types/ownership-record";
import type { NewOwnershipRecord, OwnershipRecordPatch } from "@/lib/data/types/ownership-record";
import { toDomain, type Ctx } from "@/lib/services/_mapping";
import { scopedInsert, scopedUpdate, scopedDelete } from "@/lib/services/_crud";
import { logActivity } from "@/lib/services/activity";

const rowToOwnershipRecord = (r: typeof ownershipRecords.$inferSelect): OwnershipRecord =>
  OwnershipRecordSchema.parse(toDomain(ownershipRecords, r)); // C6/C7

export async function listOwnershipRecords(ctx: Ctx, propertyId?: string): Promise<OwnershipRecord[]> {
  const rows = await db.select().from(ownershipRecords)
    .where(propertyId
      ? and(eq(ownershipRecords.orgId, ctx.orgId), eq(ownershipRecords.propertyId, propertyId))
      : eq(ownershipRecords.orgId, ctx.orgId)) // C3
    .orderBy(asc(ownershipRecords.createdAt), asc(ownershipRecords.id))
    .limit(500)
  return rows.map(rowToOwnershipRecord);
}

export async function getOwnershipRecord(ctx: Ctx, id: string): Promise<OwnershipRecord | null> {
  const [row] = await db.select().from(ownershipRecords)
    .where(and(eq(ownershipRecords.orgId, ctx.orgId), eq(ownershipRecords.id, id))); // C3
  return row ? rowToOwnershipRecord(row) : null;
}

export async function createOwnershipRecord(ctx: Ctx, input: NewOwnershipRecord): Promise<OwnershipRecord> {
  const now = Date.now();
  return scopedInsert(ctx, ownershipRecords, "OREC", { ...input, createdAt: now, updatedAt: now }, rowToOwnershipRecord);
}

export async function updateOwnershipRecord(ctx: Ctx, id: string, patch: OwnershipRecordPatch): Promise<OwnershipRecord | null> {
  const updated = await scopedUpdate(ctx, ownershipRecords, id, patch, rowToOwnershipRecord, true);

  // Best-effort activity log. Only fires on a definitive success (scopedUpdate returns null
  // for a missing / cross-org id), wrapped so a failed audit write can never fail the update.
  if (updated) {
    try {
      await logActivity(ctx, {
        entity: "ownership",
        action: "updated",
        entityId: updated.id,
        propertyId: updated.propertyId,
        summary: "Updated ownership details",
      });
    } catch (err) {
      console.error("logActivity failed (ownership.updated)", err);
    }
  }

  return updated;
}

export async function deleteOwnershipRecord(ctx: Ctx, id: string): Promise<void> {
  await scopedDelete(ctx, ownershipRecords, id);
}
