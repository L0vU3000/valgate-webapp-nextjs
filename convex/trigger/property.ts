import type { Id } from "../_generated/dataModel";
import { Triggers } from "convex-helpers/server/triggers";

import type { DataModel } from "../_generated/dataModel";

export const propertyTriggers = new Triggers<DataModel>();

// Recalculate property.health (0..100) based on related data completeness
export async function recalculatePropertyHealth(
  ctx: any,
  propertyId: Id<"property"> | undefined | null,
): Promise<void> {
  if (!propertyId) return;

  const property = await ctx.db.get(propertyId);
  if (!property) return;

  const orgId = property.orgId as Id<"orgs">;

  // Fetch related records using indexed queries
  const [locations, documents, memberships, registries] = await Promise.all([
    ctx.db
      .query("property_location")
      .withIndex("by_org_property", (q: any) => q.eq("orgId", orgId).eq("propertyId", propertyId))
      .collect(),
    ctx.db
      .query("document")
      .withIndex("by_org_property_category", (q: any) => q.eq("orgId", orgId).eq("propertyId", propertyId))
      .collect(),
    ctx.db
      .query("property_owner_membership")
      .withIndex("by_org_property", (q: any) => q.eq("orgId", orgId).eq("propertyId", propertyId))
      .collect(),
    ctx.db
      .query("property_registry")
      .withIndex("by_org_property", (q: any) => q.eq("orgId", orgId).eq("propertyId", propertyId))
      .collect(),
  ]);

  // Weights (tunable): emphasize location & documents; owners moderate
  const WEIGHTS = {
    location: 45,
    documents: 40,
    owners: 15,
  } as const;

  // Location score: provided > progress > none
  let locationScore = 0;
  const hasProvided = locations.some((l: any) => l.mappingStatus === "provided");
  const hasProgress = locations.some((l: any) => l.mappingStatus === "progress");
  if (hasProvided) locationScore = WEIGHTS.location;
  else if (hasProgress) locationScore = Math.round(WEIGHTS.location * 0.5);

  // Documents score: prioritize title types; consider registry.titleType as strong signal
  const categories = new Set(
    documents
      .map((d: any) => String(d.category || "").toLowerCase().trim())
      .filter((c: string) => !!c),
  );
  const hasHardTitle = categories.has("hard") || categories.has("hard title") || categories.has("hard_title");
  const hasSoftTitle = categories.has("soft") || categories.has("soft title") || categories.has("soft_title");
  const hasGenericTitle = categories.has("title");

  const regTitleType = registries.find((r: any) => r.titleType)?.titleType as
    | "hard"
    | "soft"
    | "strata"
    | "other"
    | undefined;

  const effectiveHard = hasHardTitle || regTitleType === "hard";
  const effectiveSoft = hasSoftTitle || regTitleType === "soft";

  let documentsScore = 0;
  if (effectiveHard) documentsScore = WEIGHTS.documents; // strongest
  else if (effectiveSoft) documentsScore = Math.round(WEIGHTS.documents * 0.7);
  else if (hasGenericTitle) documentsScore = Math.round(WEIGHTS.documents * 0.5);

  // Secondary docs (finance | tax | sale) add a small bonus up to 20% of documents weight
  const hasSecondary = ["finance", "tax", "sale"].some((c) => categories.has(c));
  if (hasSecondary) {
    const bonus = Math.round(WEIGHTS.documents * 0.2);
    documentsScore = Math.min(WEIGHTS.documents, documentsScore + bonus);
  }

  // Owners score: any active membership counts
  const hasMembership = memberships.length > 0;
  const ownersScore = hasMembership ? WEIGHTS.owners : 0;

  let health = locationScore + documentsScore + ownersScore;
  if (health < 0) health = 0;
  if (health > 100) health = 100;

  if (property.health !== health) {
    await ctx.db.patch(propertyId, { health });
  }
}

// Register triggers on related tables
for (const table of [
  "property_location",
  "property_location_point",
  "property_location_boundary",
  "property_location_feature",
  "property_location_polygon",
  "document",
  "property_owner_membership",
  "property_registry",
]) {
  propertyTriggers.register(table as any, async (ctx: any, change: any) => {
    const propertyId: Id<"property"> | undefined = (change.newDoc?.propertyId || change.oldDoc?.propertyId) as any;
    if (!propertyId) return;
    await recalculatePropertyHealth(ctx, propertyId);
  });
}


