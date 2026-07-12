import "server-only";
import { createLease } from "@/lib/services/leases";
import { type LeaseStage, type NewLease } from "@/lib/data/types/lease";
import { persistCandidates } from "@/lib/services/ingestion/persist";
import { resolveProperty, type PropertyMatch } from "@/lib/services/import-property-link";
import { parseCurrency, parseDateMs } from "@/app/_shared/add-property/map-to-property";
import type { FieldSpec, AssembledRow } from "@/lib/services/entity-import";
import type { Ctx } from "@/lib/services/_mapping";
import type { ReviewRow, BulkResult, IngestionCandidate } from "@/lib/services/ingestion/types";

export const LEASE_FIELDS: FieldSpec[] = [
  { field: "property", required: true, description: "The property this lease is for — its label, name, or ID as it appears in the sheet." },
  { field: "unit", required: true, description: "The unit or property label the lease covers." },
  { field: "stage", required: true, description: "Lease stage: Approaching, Offered, Signed, or Declined." },
  { field: "startDate", required: true, description: "Lease start date." },
  { field: "endDate", required: true, description: "Lease end date." },
  { field: "monthlyRent", required: true, description: "Monthly rent as a number." },
  { field: "termMonths", required: true, description: "Lease term in months as a number." },
  { field: "renewalStatus", required: false, description: "Renewal status text, if any." },
  { field: "tenant", required: false, description: "Tenant name or ID, if referenced in the lease." },
];

function normalizeStage(raw: string): LeaseStage | "" {
  const v = raw.toLowerCase().trim();
  if (/approach|expir|ending soon/.test(v)) return "Approaching";
  if (/offer|propos|pending/.test(v)) return "Offered";
  if (/sign|active|current|leas/.test(v)) return "Signed";
  if (/declin|reject|cancel|void/.test(v)) return "Declined";
  return "";
}

export function toLeaseReviewRow(assembled: AssembledRow, matches: PropertyMatch[]): ReviewRow {
  const v = assembled.values;
  const issues: string[] = [...assembled.missing.map((m) => `Missing ${m}`)];
  const rawProperty = v.property ?? "";
  const propertyId = resolveProperty(rawProperty, matches);
  if (!propertyId && rawProperty) issues.push("No matching property — pick one");
  return {
    values: {
      propertyId,
      unit: v.unit ?? "",
      stage: normalizeStage(v.stage ?? ""),
      startDate: v.startDate ?? "",
      endDate: v.endDate ?? "",
      monthlyRent: v.monthlyRent ?? "",
      termMonths: v.termMonths ?? "",
      renewalStatus: v.renewalStatus ?? "",
    },
    rawProperty,
    issues,
  };
}

export async function bulkCreateLeases(ctx: Ctx, rows: ReviewRow[]): Promise<BulkResult> {
  const candidates: IngestionCandidate<NewLease>[] = rows.map((r, i) => {
    const entity = {
      propertyId: r.values.propertyId ?? "",
      unit: r.values.unit || "—",
      stage: (r.values.stage || "Signed") as LeaseStage,
      startDate: parseDateMs(r.values.startDate) ?? Date.now(),
      endDate: parseDateMs(r.values.endDate) ?? Date.now(),
      monthlyRent: parseCurrency(r.values.monthlyRent) ?? 0,
      termMonths: parseInt(r.values.termMonths?.replace(/[^0-9]/g, "") || "12", 10) || 12,
      renewalStatus: r.values.renewalStatus || undefined,
    };
    return { id: crypto.randomUUID(), entity, source: { type: "spreadsheet" as const, row: i + 1 }, issues: [], confidence: "high" as const };
  });
  return persistCandidates(ctx, candidates, createLease, {
    entityName: (e) => `${e.unit} lease`,
  });
}
