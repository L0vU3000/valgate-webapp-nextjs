import "server-only";
import { createInspection } from "@/lib/services/inspections";
import { persistCandidates } from "@/lib/services/ingestion/persist";
import { resolveProperty, type PropertyMatch } from "@/lib/services/import-property-link";
import { parseDateMs } from "@/app/_shared/add-property/map-to-property";
import type { FieldSpec, AssembledRow } from "@/lib/services/entity-import";
import type { Ctx } from "@/lib/services/_mapping";
import type { ReviewRow, BulkResult, IngestionCandidate } from "@/lib/services/ingestion/types";
import type { NewInspection } from "@/lib/data/types/inspection";

export const INSPECTION_FIELDS: FieldSpec[] = [
  { field: "property", required: true, description: "The property inspected — its label, name, or ID." },
  { field: "type", required: true, description: "Inspection type: Annual Fire Safety, Electrical, or Plumbing." },
  { field: "inspector", required: true, description: "Inspector name or ID." },
  { field: "status", required: true, description: "Result: Passed, Failed, or Satisfactory." },
  { field: "inspectedAt", required: true, description: "Date the inspection took place." },
  { field: "issues", required: true, description: "Number of issues found (a non-negative integer)." },
];

function normalizeInspectionType(raw: string): string {
  const v = raw.toLowerCase().trim();
  if (/fire/.test(v)) return "Annual Fire Safety";
  if (/electric/.test(v)) return "Electrical";
  if (/plumb/.test(v)) return "Plumbing";
  return "Electrical";
}
function normalizeInspectionStatus(raw: string): string {
  const v = raw.toLowerCase().trim();
  if (/pass|ok|good|clear/.test(v)) return "Passed";
  if (/fail|reject/.test(v)) return "Failed";
  if (/satisf|acceptable|minor/.test(v)) return "Satisfactory";
  return "Satisfactory";
}

export function toInspectionReviewRow(assembled: AssembledRow, matches: PropertyMatch[]): ReviewRow {
  const v = assembled.values;
  const issues: string[] = [...assembled.missing.map((m) => `Missing ${m}`)];
  const rawProperty = v.property ?? "";
  const propertyId = resolveProperty(rawProperty, matches);
  if (!propertyId && rawProperty) issues.push("No matching property — pick one");
  return {
    values: {
      propertyId,
      type: normalizeInspectionType(v.type ?? ""),
      inspector: v.inspector ?? "",
      status: normalizeInspectionStatus(v.status ?? ""),
      inspectedAt: v.inspectedAt ?? "",
      issues: v.issues ?? "0",
    },
    rawProperty,
    issues,
  };
}

export async function bulkCreateInspections(ctx: Ctx, rows: ReviewRow[]): Promise<BulkResult> {
  const candidates: IngestionCandidate<NewInspection>[] = rows.map((r, i) => {
    const entity: NewInspection = {
      propertyId: r.values.propertyId ?? "",
      type: r.values.type as NewInspection["type"],
      inspectorId: r.values.inspector ?? "",
      status: r.values.status as NewInspection["status"],
      inspectedAt: parseDateMs(r.values.inspectedAt) ?? Date.now(),
      issues: parseInt(r.values.issues?.replace(/[^0-9]/g, "") || "0", 10) || 0,
    };
    return { id: crypto.randomUUID(), entity, source: { type: "spreadsheet" as const, row: i + 1 }, issues: [], confidence: "high" as const };
  });
  return persistCandidates(ctx, candidates, createInspection, {
    entityName: (e) => `${e.type} inspection`,
  });
}