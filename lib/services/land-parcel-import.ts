import "server-only";
import { createLandParcel } from "@/lib/services/land-parcels";
import { persistCandidates } from "@/lib/services/ingestion/persist";
import { resolveProperty, type PropertyMatch } from "@/lib/services/import-property-link";
import { parseFloatSafe } from "@/app/_shared/add-property/map-to-property";
import type { FieldSpec, AssembledRow } from "@/lib/services/entity-import";
import type { Ctx } from "@/lib/services/_mapping";
import type { ReviewRow, BulkResult, IngestionCandidate } from "@/lib/services/ingestion/types";
import type { NewLandParcel } from "@/lib/data/types/land-parcel";

export const LAND_PARCEL_FIELDS: FieldSpec[] = [
  { field: "property", required: true, description: "The property this land parcel belongs to — its label, name, or ID." },
  { field: "sizeM2", required: true, description: "Land size in square meters." },
  { field: "widthM", required: false, description: "Width in meters." },
  { field: "lengthM", required: false, description: "Length in meters." },
  { field: "zoningCode", required: false, description: "Zoning code (e.g. R1, C2)." },
  { field: "zoningClass", required: false, description: "Zoning classification description." },
  { field: "elevationM", required: false, description: "Elevation in meters." },
  { field: "slopeAngleDeg", required: false, description: "Slope angle in degrees." },
  { field: "terrainType", required: false, description: "Terrain: Flat, Rolling, Hilly, Mountainous, or Mixed." },
];

function normalizeTerrain(raw: string): string | undefined {
  const v = raw.toLowerCase().trim();
  if (/flat|level/.test(v)) return "Flat";
  if (/roll|gentle/.test(v)) return "Rolling";
  if (/hill|slope/.test(v)) return "Hilly";
  if (/mountain|steep/.test(v)) return "Mountainous";
  if (/mix|varied/.test(v)) return "Mixed";
  return undefined;
}

export function toLandParcelReviewRow(assembled: AssembledRow, matches: PropertyMatch[]): ReviewRow {
  const v = assembled.values;
  const issues: string[] = [...assembled.missing.map((m) => `Missing ${m}`)];
  const rawProperty = v.property ?? "";
  const propertyId = resolveProperty(rawProperty, matches);
  if (!propertyId && rawProperty) issues.push("No matching property — pick one");
  return {
    values: {
      propertyId,
      sizeM2: v.sizeM2 ?? "",
      widthM: v.widthM ?? "",
      lengthM: v.lengthM ?? "",
      zoningCode: v.zoningCode ?? "",
      zoningClass: v.zoningClass ?? "",
      elevationM: v.elevationM ?? "",
      slopeAngleDeg: v.slopeAngleDeg ?? "",
      terrainType: normalizeTerrain(v.terrainType ?? "") ?? "",
    },
    rawProperty,
    issues,
  };
}

export async function bulkCreateLandParcels(ctx: Ctx, rows: ReviewRow[]): Promise<BulkResult> {
  const candidates: IngestionCandidate<NewLandParcel>[] = rows.map((r, i) => {
    const entity: NewLandParcel = {
      propertyId: r.values.propertyId ?? "",
      sizeM2: parseFloatSafe(r.values.sizeM2) ?? 0,
      widthM: parseFloatSafe(r.values.widthM),
      lengthM: parseFloatSafe(r.values.lengthM),
      zoningCode: r.values.zoningCode || undefined,
      zoningClass: r.values.zoningClass || undefined,
      elevationM: parseFloatSafe(r.values.elevationM),
      slopeAngleDeg: parseFloatSafe(r.values.slopeAngleDeg),
      terrainType: (r.values.terrainType as NewLandParcel["terrainType"]) || undefined,
    };
    return { id: crypto.randomUUID(), entity, source: { type: "spreadsheet" as const, row: i + 1 }, issues: [], confidence: "high" as const };
  });
  return persistCandidates(ctx, candidates, createLandParcel, {
    entityName: (e) => `${e.sizeM2}m² parcel`,
  });
}