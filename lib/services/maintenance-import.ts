import "server-only";
import { createMaintenanceItem } from "@/lib/services/maintenance-items";
import { persistCandidates } from "@/lib/services/ingestion/persist";
import { resolveProperty, type PropertyMatch } from "@/lib/services/import-property-link";
import { parseCurrency } from "@/app/_shared/add-property/map-to-property";
import type { FieldSpec, AssembledRow } from "@/lib/services/entity-import";
import type { Ctx } from "@/lib/services/_mapping";
import type { ReviewRow, BulkResult, IngestionCandidate } from "@/lib/services/ingestion/types";
import type { NewMaintenanceItem } from "@/lib/data/types/maintenance-item";

export const MAINTENANCE_FIELDS: FieldSpec[] = [
  { field: "property", required: true, description: "The property this maintenance item is for — its label, name, or ID." },
  { field: "severity", required: true, description: "Severity: Emergency, Urgent, or Standard." },
  { field: "title", required: true, description: "Short title describing the maintenance issue." },
  { field: "status", required: true, description: "Status: Open, InProgress, Resolved, or Cancelled." },
  { field: "cost", required: false, description: "Estimated or actual cost as a number." },
];

function normalizeSeverity(raw: string): string {
  const v = raw.toLowerCase().trim();
  if (/emergen|critical|life.?threat/.test(v)) return "Emergency";
  if (/urgent|high|asap/.test(v)) return "Urgent";
  return "Standard";
}
function normalizeMaintStatus(raw: string): string {
  const v = raw.toLowerCase().trim();
  if (/open|new|pending/.test(v)) return "Open";
  if (/progress|in.?progress|working|active/.test(v)) return "InProgress";
  if (/resolved|fixed|complete|done|closed/.test(v)) return "Resolved";
  if (/cancel|void|abandon/.test(v)) return "Cancelled";
  return "Open";
}

export function toMaintenanceReviewRow(assembled: AssembledRow, matches: PropertyMatch[]): ReviewRow {
  const v = assembled.values;
  const issues: string[] = [...assembled.missing.map((m) => `Missing ${m}`)];
  const rawProperty = v.property ?? "";
  const propertyId = resolveProperty(rawProperty, matches);
  if (!propertyId && rawProperty) issues.push("No matching property — pick one");
  return {
    values: {
      propertyId,
      severity: normalizeSeverity(v.severity ?? ""),
      title: v.title ?? "",
      status: normalizeMaintStatus(v.status ?? ""),
      cost: v.cost ?? "",
    },
    rawProperty,
    issues,
  };
}

export async function bulkCreateMaintenance(ctx: Ctx, rows: ReviewRow[]): Promise<BulkResult> {
  const candidates: IngestionCandidate<NewMaintenanceItem>[] = rows.map((r, i) => {
    const entity: NewMaintenanceItem = {
      propertyId: r.values.propertyId ?? "",
      severity: (r.values.severity || "Standard") as NewMaintenanceItem["severity"],
      title: r.values.title ?? "",
      status: (r.values.status || "Open") as NewMaintenanceItem["status"],
      cost: parseCurrency(r.values.cost),
    };
    return { id: crypto.randomUUID(), entity, source: { type: "spreadsheet" as const, row: i + 1 }, issues: [], confidence: "high" as const };
  });
  return persistCandidates(ctx, candidates, createMaintenanceItem, {
    entityName: (e) => e.title,
  });
}
