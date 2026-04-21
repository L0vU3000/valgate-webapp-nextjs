import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";

// Shared helpers for admin internal functions

export type RiskStatus = "high" | "moderate" | "safe";

export function nowIso(): string {
  return new Date().toISOString();
}

export function buildRiskAssessment(
  status: RiskStatus,
  title?: string,
  description?: string,
): { title: string; description: string; status: RiskStatus } | undefined {
  if (status === "safe") return undefined;
  return {
    title: title ?? "",
    description: description ?? "",
    status,
  };
}

export function validateCoordinates(coords: { lon: number; lat: number }): void {
  const { lon, lat } = coords;
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    throw new Error("Coordinates must be finite numbers");
  }
  if (lon < -180 || lon > 180) {
    throw new Error("Longitude must be between -180 and 180");
  }
  if (lat < -90 || lat > 90) {
    throw new Error("Latitude must be between -90 and 90");
  }
}

// Minimal shape for parent location needed by upsert
type ParentLocation = {
  _id: Id<"property_location">;
  orgId: Id<"orgs">;
  propertyId: Id<"property">;
};

type UpsertKind = "point" | "boundary" | "feature" | "polygon";

export async function upsertLocationDetail(
  ctx: any,
  parentLocation: ParentLocation,
  kind: UpsertKind,
  payload:
    | { coordinates: { lon: number; lat: number } }
    | { boundaryRef: { level: "ADM0" | "ADM1" | "ADM2" | "ADM3"; code: string; name?: string } }
    | { featureInfo: { id: number | string; target: { featuresetId: string; importId: string }; namespace?: string } }
    | { geometryRef: string },
): Promise<{ detailId: Id<any> }> {
  const timestamp = nowIso();

  if (kind === "point") {
    const { coordinates } = payload as { coordinates: { lon: number; lat: number } };
    validateCoordinates(coordinates);
    // Upsert point detail
    const existing = await ctx.db
      .query("property_location_point")
      .withIndex("by_location", (q: any) => q.eq("locationId", parentLocation._id))
      .first();
    let detailId: Id<"property_location_point">;
    if (existing) {
      await ctx.db.patch(existing._id, { coordinates, updatedAt: timestamp });
      detailId = existing._id as Id<"property_location_point">;
    } else {
      detailId = await ctx.db.insert("property_location_point", {
        orgId: parentLocation.orgId,
        propertyId: parentLocation.propertyId,
        locationId: parentLocation._id,
        coordinates,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
    // Update parent location
    await ctx.db.patch(parentLocation._id, {
      kind: "point",
      mappingStatus: "provided",
      coordinates,
      updatedAt: timestamp,
    });
    return { detailId } as any;
  }

  if (kind === "boundary") {
    const { boundaryRef } = payload as {
      boundaryRef: { level: "ADM0" | "ADM1" | "ADM2" | "ADM3"; code: string; name?: string };
    };
    const existing = await ctx.db
      .query("property_location_boundary")
      .withIndex("by_location", (q: any) => q.eq("locationId", parentLocation._id))
      .first();
    let detailId: Id<"property_location_boundary">;
    if (existing) {
      await ctx.db.patch(existing._id, { boundaryRef, updatedAt: timestamp });
      detailId = existing._id as Id<"property_location_boundary">;
    } else {
      detailId = await ctx.db.insert("property_location_boundary", {
        orgId: parentLocation.orgId,
        propertyId: parentLocation.propertyId,
        locationId: parentLocation._id,
        boundaryRef,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
    await ctx.db.patch(parentLocation._id, {
      kind: "boundary",
      mappingStatus: "provided",
      updatedAt: timestamp,
    });
    return { detailId } as any;
  }

  if (kind === "feature") {
    const { featureInfo } = payload as {
      featureInfo: { id: number | string; target: { featuresetId: string; importId: string }; namespace?: string };
    };
    const existing = await ctx.db
      .query("property_location_feature")
      .withIndex("by_location", (q: any) => q.eq("locationId", parentLocation._id))
      .first();
    let detailId: Id<"property_location_feature">;
    if (existing) {
      await ctx.db.patch(existing._id, { featureInfo, updatedAt: timestamp });
      detailId = existing._id as Id<"property_location_feature">;
    } else {
      detailId = await ctx.db.insert("property_location_feature", {
        orgId: parentLocation.orgId,
        propertyId: parentLocation.propertyId,
        locationId: parentLocation._id,
        featureInfo,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
    await ctx.db.patch(parentLocation._id, {
      kind: "feature",
      mappingStatus: "provided",
      updatedAt: timestamp,
    });
    return { detailId } as any;
  }

  if (kind === "polygon") {
    const { geometryRef } = payload as { geometryRef: string };
    const existing = await ctx.db
      .query("property_location_polygon")
      .withIndex("by_location", (q: any) => q.eq("locationId", parentLocation._id))
      .first();
    let detailId: Id<"property_location_polygon">;
    if (existing) {
      await ctx.db.patch(existing._id, { geometryRef, updatedAt: timestamp });
      detailId = existing._id as Id<"property_location_polygon">;
    } else {
      detailId = await ctx.db.insert("property_location_polygon", {
        orgId: parentLocation.orgId,
        propertyId: parentLocation.propertyId,
        locationId: parentLocation._id,
        geometryRef,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
    await ctx.db.patch(parentLocation._id, {
      kind: "polygon",
      mappingStatus: "provided",
      updatedAt: timestamp,
    });
    return { detailId } as any;
  }

  throw new Error("Unsupported location kind for upsert");
}

export async function paginateByUpdatedAt<T extends keyof any>(
  ctx: any,
  table: string,
  orgId?: Id<"orgs">,
  after?: string,
  limit: number = 100,
): Promise<{ items: any[]; nextAfter: string | null }> {
  let items: any[] = [];
  if (orgId) {
    const base = ctx.db
      .query(table)
      .withIndex("by_org_updatedAt", (q: any) => (after ? q.eq("orgId", orgId).gt("updatedAt", after) : q.eq("orgId", orgId)));
    items = await base.collect();
  } else {
    // Fallback: unindexed scan; keep it bounded and ordered by updatedAt
    const all = await ctx.db.query(table).collect();
    all.sort((a: any, b: any) => String(a.updatedAt).localeCompare(String(b.updatedAt)));
    items = after ? all.filter((r: any) => String(r.updatedAt) > after) : all;
  }
  const sliced = items.slice(0, limit);
  const nextAfter = sliced.length === limit ? String(sliced[sliced.length - 1].updatedAt) : null;
  return { items: sliced, nextAfter };
}

// Validators reused in admin layer (exported for args)
export const vCoordinates = v.object({ lon: v.number(), lat: v.number() });
export const vBoundaryRef = v.object({
  level: v.union(v.literal("ADM0"), v.literal("ADM1"), v.literal("ADM2"), v.literal("ADM3")),
  code: v.string(),
  name: v.optional(v.string()),
});
export const vFeatureInfo = v.object({
  id: v.union(v.number(), v.string()),
  target: v.object({ featuresetId: v.string(), importId: v.string() }),
  namespace: v.optional(v.string()),
});


