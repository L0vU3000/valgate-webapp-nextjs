import "server-only"; // C1
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { landParcels } from "@/lib/db/schema";
import { LandParcelSchema, type LandParcel } from "@/lib/data/types/land-parcel";
import type { NewLandParcel, LandParcelPatch } from "@/lib/data/types/land-parcel";
import { toDomain, type Ctx } from "@/lib/services/_mapping";
import { scopedInsert, scopedUpdate, scopedDelete } from "@/lib/services/_crud";

const rowToLandParcel = (r: typeof landParcels.$inferSelect): LandParcel =>
  LandParcelSchema.parse(toDomain(landParcels, r)); // C6/C7

export async function listLandParcels(ctx: Ctx, propertyId?: string): Promise<LandParcel[]> {
  const rows = await db.select().from(landParcels)
    .where(propertyId
      ? and(eq(landParcels.orgId, ctx.orgId), eq(landParcels.propertyId, propertyId))
      : eq(landParcels.orgId, ctx.orgId)) // C3
    .orderBy(asc(landParcels.id))
    .limit(500)
  return rows.map(rowToLandParcel);
}

export async function getLandParcel(ctx: Ctx, id: string): Promise<LandParcel | null> {
  const [row] = await db.select().from(landParcels)
    .where(and(eq(landParcels.orgId, ctx.orgId), eq(landParcels.id, id))); // C3
  return row ? rowToLandParcel(row) : null;
}

export async function createLandParcel(ctx: Ctx, input: NewLandParcel): Promise<LandParcel> {
  return scopedInsert(ctx, landParcels, "LPAR", input, rowToLandParcel);
}

export async function updateLandParcel(ctx: Ctx, id: string, patch: LandParcelPatch): Promise<LandParcel | null> {
  return scopedUpdate(ctx, landParcels, id, patch, rowToLandParcel, false);
}

export async function deleteLandParcel(ctx: Ctx, id: string): Promise<void> {
  await scopedDelete(ctx, landParcels, id);
}
