import "server-only";
import { createCoOwner } from "@/lib/services/co-owners";
import { persistCandidates } from "@/lib/services/ingestion/persist";
import { resolveProperty, type PropertyMatch } from "@/lib/services/import-property-link";
import { parseFloatSafe } from "@/app/_shared/add-property/map-to-property";
import type { FieldSpec, AssembledRow } from "@/lib/services/entity-import";
import type { Ctx } from "@/lib/services/_mapping";
import type { ReviewRow, BulkResult, IngestionCandidate } from "@/lib/services/ingestion/types";
import type { NewCoOwner } from "@/lib/data/types/co-owner";

export const CO_OWNER_FIELDS: FieldSpec[] = [
  { field: "property", required: true, description: "The property this co-owner is on — its label, name, or ID." },
  { field: "name", required: true, description: "Co-owner's full name." },
  { field: "role", required: true, description: "Ownership role: Primary or Minor." },
  { field: "sharePercent", required: true, description: "Ownership share as a percentage (0–100)." },
  { field: "email", required: false, description: "Email address." },
  { field: "phone", required: false, description: "Phone number." },
  { field: "address", required: false, description: "Mailing address." },
  { field: "taxEntity", required: false, description: "Tax entity: Individual, S-Corp, C-Corp, LLC, Partnership, Trust, or Other." },
  { field: "tax1099Status", required: false, description: "1099 tax status text." },
];

function normalizeRole(raw: string): string {
  const v = raw.toLowerCase().trim();
  if (/primary|main|principal/.test(v)) return "Primary";
  if (/minor|secondary|co-?owner/.test(v)) return "Minor";
  return "Minor";
}
function normalizeTaxEntity(raw: string): string | undefined {
  const v = raw.toLowerCase().trim();
  if (/individual|person/.test(v)) return "Individual";
  if (/s-?corp/.test(v)) return "S-Corp";
  if (/c-?corp/.test(v)) return "C-Corp";
  if (/llc/.test(v)) return "LLC";
  if (/partnership|partner/.test(v)) return "Partnership";
  if (/trust/.test(v)) return "Trust";
  if (/other/.test(v)) return "Other";
  return undefined;
}

export function toCoOwnerReviewRow(assembled: AssembledRow, matches: PropertyMatch[]): ReviewRow {
  const v = assembled.values;
  const issues: string[] = [...assembled.missing.map((m) => `Missing ${m}`)];
  const rawProperty = v.property ?? "";
  const propertyId = resolveProperty(rawProperty, matches);
  if (!propertyId && rawProperty) issues.push("No matching property — pick one");
  return {
    values: {
      propertyId,
      name: v.name ?? "",
      role: normalizeRole(v.role ?? ""),
      sharePercent: v.sharePercent ?? "",
      email: v.email ?? "",
      phone: v.phone ?? "",
      address: v.address ?? "",
      taxEntity: normalizeTaxEntity(v.taxEntity ?? "") ?? "",
      tax1099Status: v.tax1099Status ?? "",
    },
    rawProperty,
    issues,
  };
}

export async function bulkCreateCoOwners(ctx: Ctx, rows: ReviewRow[]): Promise<BulkResult> {
  const candidates: IngestionCandidate<NewCoOwner>[] = rows.map((r, i) => {
    const entity: NewCoOwner = {
      propertyId: r.values.propertyId ?? "",
      name: r.values.name ?? "",
      role: (r.values.role || "Minor") as NewCoOwner["role"],
      sharePercent: parseFloatSafe(r.values.sharePercent) ?? 0,
      email: r.values.email || undefined,
      phone: r.values.phone || undefined,
      address: r.values.address || undefined,
      taxEntity: (r.values.taxEntity as NewCoOwner["taxEntity"]) || undefined,
      tax1099Status: r.values.tax1099Status || undefined,
    };
    return { id: crypto.randomUUID(), entity, source: { type: "spreadsheet" as const, row: i + 1 }, issues: [], confidence: "high" as const };
  });
  return persistCandidates(ctx, candidates, createCoOwner, {
    entityName: (e) => e.name,
  });
}
