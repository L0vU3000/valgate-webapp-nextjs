import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import {
  buildRiskAssessment,
  nowIso,
  validateCoordinates,
  upsertLocationDetail,
  vBoundaryRef,
  vCoordinates,
  vFeatureInfo,
} from "./helpers";

export const addPropertyRisk = internalMutation({
  args: {
    id: v.id("property"),
    status: v.union(v.literal("high"), v.literal("moderate"), v.literal("safe")),
    title: v.string(),
    description: v.string(),
  },
  handler: async (ctx, { id, status, title, description }) => {
    const row = await ctx.db.get(id);
    if (!row) throw new Error("Property not found");
    const timestamp = nowIso();
    const existing: any[] = Array.isArray((row as any).riskAssessment) ? ((row as any).riskAssessment as any[]) : [];
    const risk = { title, description, status, createdAt: timestamp, updatedAt: timestamp };
    await ctx.db.patch(id, { riskAssessment: [...existing, risk], updatedAt: timestamp });
    return { id } as any;
  },
});

export const updatePropertyRisk = internalMutation({
  args: {
    id: v.id("property"),
    index: v.number(),
    status: v.optional(v.union(v.literal("high"), v.literal("moderate"), v.literal("safe"))),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { id, index, status, title, description }) => {
    const row = await ctx.db.get(id);
    if (!row) throw new Error("Property not found");
    const timestamp = nowIso();
    const existing: any[] = Array.isArray((row as any).riskAssessment) ? ((row as any).riskAssessment as any[]) : [];
    if (index < 0 || index >= existing.length) throw new Error("Risk index out of range");
    const prev = existing[index] || {};
    const next = {
      title: title ?? prev.title ?? "",
      description: description ?? prev.description ?? "",
      status: status ?? prev.status ?? "safe",
      createdAt: prev.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
    const updatedArray = existing.slice();
    updatedArray[index] = next;
    await ctx.db.patch(id, { riskAssessment: updatedArray, updatedAt: timestamp });
    return { id } as any;
  },
});

export const removePropertyRisk = internalMutation({
  args: { id: v.id("property"), index: v.number() },
  handler: async (ctx, { id, index }) => {
    const row = await ctx.db.get(id);
    if (!row) throw new Error("Property not found");
    const timestamp = nowIso();
    const existing: any[] = Array.isArray((row as any).riskAssessment) ? ((row as any).riskAssessment as any[]) : [];
    if (index < 0 || index >= existing.length) throw new Error("Risk index out of range");
    const updatedArray = existing.slice(0, index).concat(existing.slice(index + 1));
    await ctx.db.patch(id, { riskAssessment: updatedArray, updatedAt: timestamp });
    return { id } as any;
  },
});

export const adjustPropertyRiskCounts = internalMutation({
  args: {
    id: v.id("property"),
    toSafe: v.optional(v.number()),
    toModerate: v.optional(v.number()),
    toHigh: v.optional(v.number()),
  },
  handler: async (ctx, { id, toSafe = 0, toModerate = 0, toHigh = 0 }) => {
    const row = await ctx.db.get(id);
    if (!row) throw new Error("Property not found");
    const timestamp = nowIso();
    const existing: any[] = Array.isArray((row as any).riskAssessment) ? ((row as any).riskAssessment as any[]) : [];
    const sortedIdx = existing
      .map((r, i) => ({ i, t: String(r.updatedAt || r.createdAt || "") }))
      .sort((a, b) => b.t.localeCompare(a.t))
      .map((x) => x.i);
    const updated = existing.slice();
    const apply = (count: number, status: "safe" | "moderate" | "high") => {
      for (const i of sortedIdx) {
        if (count <= 0) break;
        if (updated[i]?.status === status) continue;
        updated[i] = { ...updated[i], status, updatedAt: timestamp };
        count -= 1;
      }
    };
    apply(toSafe, "safe");
    apply(toModerate, "moderate");
    apply(toHigh, "high");
    await ctx.db.patch(id, { riskAssessment: updated, updatedAt: timestamp });
    return { id } as any;
  },
});

export const bulkMarkRiskSafe = internalMutation({
  args: {
    orgId: v.optional(v.id("orgs")),
    ids: v.optional(v.array(v.id("property"))),
    after: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { orgId, ids, after, limit = 100 }) => {
    let updated = 0;
    let checked = 0;
    let nextAfter: string | null = null;
    const timestamp = nowIso();

    if (ids && ids.length > 0) {
      for (const pid of ids) {
        const row = await ctx.db.get(pid);
        if (!row) continue;
        checked += 1;
        const existing: any[] = Array.isArray((row as any).riskAssessment) ? ((row as any).riskAssessment as any[]) : [];
        if (existing.length > 0) {
          const anyNotSafe = existing.some((r) => r.status !== "safe");
          if (anyNotSafe) {
            const next = existing.map((r) => ({ ...r, status: "safe", updatedAt: timestamp }));
            await ctx.db.patch(pid, { riskAssessment: next, updatedAt: timestamp });
            updated += 1;
          }
        }
      }
      return { updated, checked, nextAfter: null } as any;
    }

    if (!orgId) throw new Error("orgId is required when ids not provided");
    const page = await (await import("./helpers")).paginateByUpdatedAt(ctx, "property", orgId, after, limit);
    for (const row of page.items as any[]) {
      checked += 1;
      const existing: any[] = Array.isArray((row as any).riskAssessment) ? ((row as any).riskAssessment as any[]) : [];
      if (existing.length > 0) {
        const anyNotSafe = existing.some((r) => r.status !== "safe");
        if (anyNotSafe) {
          const next = existing.map((r) => ({ ...r, status: "safe", updatedAt: timestamp }));
          await ctx.db.patch(row._id, { riskAssessment: next, updatedAt: timestamp });
          updated += 1;
        }
      }
    }
    nextAfter = page.nextAfter;
    return { updated, checked, nextAfter } as any;
  },
});

export const setLocationProgress = internalMutation({
  args: { locationId: v.id("property_location") },
  handler: async (ctx, { locationId }) => {
    const location = await ctx.db.get(locationId);
    if (!location) throw new Error("Location not found");
    const before = (location as any).mappingStatus ?? null;
    await ctx.db.patch(locationId, { mappingStatus: "progress", updatedAt: nowIso() });
    return { id: locationId, before, after: "progress" } as any;
  },
});

export const bulkPromoteNoneToProgress = internalMutation({
  args: { orgId: v.optional(v.id("orgs")), after: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, { orgId, after, limit = 100 }) => {
    if (!orgId) throw new Error("orgId is required");
    const page = await (await import("./helpers")).paginateByUpdatedAt(ctx, "property_location", orgId, after, limit);
    let updated = 0;
    let checked = 0;
    const timestamp = nowIso();
    for (const loc of page.items as any[]) {
      checked += 1;
      const status = (loc.mappingStatus as string) || "none";
      if (status === "none") {
        await ctx.db.patch(loc._id, { mappingStatus: "progress", updatedAt: timestamp });
        updated += 1;
      }
    }
    return { updated, checked, nextAfter: page.nextAfter } as any;
  },
});

export const setLocationProvidedPoint = internalMutation({
  args: { locationId: v.id("property_location"), coordinates: vCoordinates },
  handler: async (ctx, { locationId, coordinates }) => {
    validateCoordinates(coordinates);
    const parent = await ctx.db.get(locationId);
    if (!parent) throw new Error("Location not found");
    const { detailId } = await upsertLocationDetail(
      ctx,
      { _id: locationId, orgId: parent.orgId, propertyId: parent.propertyId },
      "point",
      { coordinates },
    );
    return { id: locationId, detailId } as any;
  },
});

export const setLocationProvidedBoundary = internalMutation({
  args: { locationId: v.id("property_location"), boundaryRef: vBoundaryRef },
  handler: async (ctx, { locationId, boundaryRef }) => {
    const parent = await ctx.db.get(locationId);
    if (!parent) throw new Error("Location not found");
    const { detailId } = await upsertLocationDetail(
      ctx,
      { _id: locationId, orgId: parent.orgId, propertyId: parent.propertyId },
      "boundary",
      { boundaryRef },
    );
    return { id: locationId, detailId } as any;
  },
});

export const setLocationProvidedPolygon = internalMutation({
  args: { locationId: v.id("property_location"), geometryRef: v.string(), centroid: v.optional(vCoordinates) },
  handler: async (ctx, { locationId, geometryRef, centroid }) => {
    const parent = await ctx.db.get(locationId);
    if (!parent) throw new Error("Location not found");
    const { detailId } = await upsertLocationDetail(
      ctx,
      { _id: locationId, orgId: parent.orgId, propertyId: parent.propertyId },
      "polygon",
      { geometryRef },
    );
    // Optionally update the normalized coordinates on the parent location if provided
    const patch: any = { mappingStatus: "provided", kind: "polygon", updatedAt: nowIso() };
    if (centroid) {
      patch.coordinates = centroid;
    }
    await ctx.db.patch(locationId, patch);
    return { id: locationId, detailId } as any;
  },
});

export const setLocationProvidedFeature = internalMutation({
  args: { locationId: v.id("property_location"), featureInfo: vFeatureInfo },
  handler: async (ctx, { locationId, featureInfo }) => {
    const parent = await ctx.db.get(locationId);
    if (!parent) throw new Error("Location not found");
    const { detailId } = await upsertLocationDetail(
      ctx,
      { _id: locationId, orgId: parent.orgId, propertyId: parent.propertyId },
      "feature",
      { featureInfo },
    );
    return { id: locationId, detailId } as any;
  },
});

export const setLocationCoordinatesAndKind = internalMutation({
  args: {
    locationId: v.id("property_location"),
    kind: v.union(v.literal("point"), v.literal("feature"), v.literal("polygon")),
    coordinates: vCoordinates,
  },
  handler: async (ctx, { locationId, kind, coordinates }) => {
    const row = await ctx.db.get(locationId);
    if (!row) throw new Error("Location not found");
    validateCoordinates(coordinates);
    await ctx.db.patch(locationId, {
      kind,
      mappingStatus: "provided",
      coordinates,
      updatedAt: nowIso(),
    } as any);
    return { id: locationId } as any;
  },
});


