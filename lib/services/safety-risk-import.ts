import "server-only";
import { createSafetyRisk } from "@/lib/services/safety-risks";
import { persistCandidates } from "@/lib/services/ingestion/persist";
import { resolveProperty, type PropertyMatch } from "@/lib/services/import-property-link";
import type { FieldSpec, AssembledRow } from "@/lib/services/entity-import";
import type { Ctx } from "@/lib/services/_mapping";
import type { ReviewRow, BulkResult, IngestionCandidate } from "@/lib/services/ingestion/types";
import type { NewSafetyRisk } from "@/lib/data/types/safety-risk";

export const SAFETY_RISK_FIELDS: FieldSpec[] = [
  { field: "property", required: true, description: "The property this risk is associated with — its label, name, or ID." },
  { field: "severity", required: true, description: "Severity: Critical, High, Medium, or Low." },
  { field: "title", required: true, description: "Short title of the safety risk." },
  { field: "description", required: true, description: "Detailed description of the risk." },
  { field: "status", required: false, description: "Status: Open or Resolved. Defaults to Open." },
];

function normalizeRiskSeverity(raw: string): string {
  const v = raw.toLowerCase().trim();
  if (/critical|severe|life/.test(v)) return "Critical";
  if (/high|major|serious/.test(v)) return "High";
  if (/medium|moderate|minor/.test(v)) return "Medium";
  if (/low|minor|small/.test(v)) return "Low";
  return "Medium";
}

export function toSafetyRiskReviewRow(assembled: AssembledRow, matches: PropertyMatch[]): ReviewRow {
  const v = assembled.values;
  const issues: string[] = [...assembled.missing.map((m) => `Missing ${m}`)];
  const rawProperty = v.property ?? "";
  const propertyId = resolveProperty(rawProperty, matches);
  if (!propertyId && rawProperty) issues.push("No matching property — pick one");
  return {
    values: {
      propertyId,
      severity: normalizeRiskSeverity(v.severity ?? ""),
      title: v.title ?? "",
      description: v.description ?? "",
      status: v.status ?? "Open",
    },
    rawProperty,
    issues,
  };
}

export async function bulkCreateSafetyRisks(ctx: Ctx, rows: ReviewRow[]): Promise<BulkResult> {
  const candidates: IngestionCandidate<NewSafetyRisk>[] = rows.map((r, i) => {
    const entity: NewSafetyRisk = {
      propertyId: r.values.propertyId ?? "",
      severity: (r.values.severity || "Medium") as NewSafetyRisk["severity"],
      title: r.values.title ?? "",
      description: r.values.description ?? "",
      status: (r.values.status || "Open") as NewSafetyRisk["status"],
    };
    return { id: crypto.randomUUID(), entity, source: { type: "spreadsheet" as const, row: i + 1 }, issues: [], confidence: "high" as const };
  });
  return persistCandidates(ctx, candidates, createSafetyRisk, {
    entityName: (e) => e.title,
  });
}