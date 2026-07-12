import "server-only";
import { createCertification } from "@/lib/services/certifications";
import { persistCandidates } from "@/lib/services/ingestion/persist";
import { resolveProperty, type PropertyMatch } from "@/lib/services/import-property-link";
import { parseDateMs } from "@/app/_shared/add-property/map-to-property";
import type { FieldSpec, AssembledRow } from "@/lib/services/entity-import";
import type { Ctx } from "@/lib/services/_mapping";
import type { ReviewRow, BulkResult, IngestionCandidate } from "@/lib/services/ingestion/types";
import type { NewCertification } from "@/lib/data/types/certification";

export const CERTIFICATION_FIELDS: FieldSpec[] = [
  { field: "property", required: true, description: "The property this certification is for — its label, name, or ID." },
  { field: "name", required: true, description: "Certification name: Fire Safety Certificate, Electrical Compliance, or Plumbing Certificate." },
  { field: "status", required: true, description: "Status: Valid, Expiring, or Expired." },
  { field: "issuedAt", required: true, description: "Issue date." },
  { field: "expiresAt", required: true, description: "Expiry date." },
  { field: "inspector", required: true, description: "Inspector name or ID." },
];

function normalizeCertName(raw: string): string {
  const v = raw.toLowerCase().trim();
  if (/fire/.test(v)) return "Fire Safety Certificate";
  if (/electric/.test(v)) return "Electrical Compliance";
  if (/plumb/.test(v)) return "Plumbing Certificate";
  return "Fire Safety Certificate";
}
function normalizeCertStatus(raw: string): string {
  const v = raw.toLowerCase().trim();
  if (/valid|current|active/.test(v)) return "Valid";
  if (/expir|soon|warn/.test(v)) return "Expiring";
  if (/expired|lapsed|invalid/.test(v)) return "Expired";
  return "Valid";
}

export function toCertificationReviewRow(assembled: AssembledRow, matches: PropertyMatch[]): ReviewRow {
  const v = assembled.values;
  const issues: string[] = [...assembled.missing.map((m) => `Missing ${m}`)];
  const rawProperty = v.property ?? "";
  const propertyId = resolveProperty(rawProperty, matches);
  if (!propertyId && rawProperty) issues.push("No matching property — pick one");
  return {
    values: {
      propertyId,
      name: normalizeCertName(v.name ?? ""),
      status: normalizeCertStatus(v.status ?? ""),
      issuedAt: v.issuedAt ?? "",
      expiresAt: v.expiresAt ?? "",
      inspector: v.inspector ?? "",
    },
    rawProperty,
    issues,
  };
}

export async function bulkCreateCertifications(ctx: Ctx, rows: ReviewRow[]): Promise<BulkResult> {
  const candidates: IngestionCandidate<NewCertification>[] = rows.map((r, i) => {
    const entity: NewCertification = {
      propertyId: r.values.propertyId ?? "",
      name: r.values.name as NewCertification["name"],
      status: r.values.status as NewCertification["status"],
      issuedAt: parseDateMs(r.values.issuedAt) ?? Date.now(),
      expiresAt: parseDateMs(r.values.expiresAt) ?? Date.now(),
      inspectorId: r.values.inspector ?? "",
    };
    return { id: crypto.randomUUID(), entity, source: { type: "spreadsheet" as const, row: i + 1 }, issues: [], confidence: "high" as const };
  });
  return persistCandidates(ctx, candidates, createCertification, {
    entityName: (e) => e.name,
  });
}