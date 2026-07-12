import "server-only";
import { createEmergencyContact } from "@/lib/services/emergency-contacts";
import { persistCandidates } from "@/lib/services/ingestion/persist";
import { resolveProperty, type PropertyMatch } from "@/lib/services/import-property-link";
import type { FieldSpec, AssembledRow } from "@/lib/services/entity-import";
import type { Ctx } from "@/lib/services/_mapping";
import type { ReviewRow, BulkResult, IngestionCandidate } from "@/lib/services/ingestion/types";
import type { NewEmergencyContact } from "@/lib/data/types/emergency-contact";

export const EMERGENCY_CONTACT_FIELDS: FieldSpec[] = [
  { field: "property", required: true, description: "The property this contact is for — its label, name, or ID." },
  { field: "name", required: true, description: "Contact's full name." },
  { field: "phone", required: true, description: "Phone number." },
  { field: "sub", required: false, description: "Sub-role or description (e.g. 'Plumber', 'Security')." },
];

export function toEmergencyContactReviewRow(assembled: AssembledRow, matches: PropertyMatch[]): ReviewRow {
  const v = assembled.values;
  const issues: string[] = [...assembled.missing.map((m) => `Missing ${m}`)];
  const rawProperty = v.property ?? "";
  const propertyId = resolveProperty(rawProperty, matches);
  if (!propertyId && rawProperty) issues.push("No matching property — pick one");
  return {
    values: {
      propertyId,
      name: v.name ?? "",
      phone: v.phone ?? "",
      sub: v.sub ?? "",
    },
    rawProperty,
    issues,
  };
}

export async function bulkCreateEmergencyContacts(ctx: Ctx, rows: ReviewRow[]): Promise<BulkResult> {
  const candidates: IngestionCandidate<NewEmergencyContact>[] = rows.map((r, i) => {
    const entity: NewEmergencyContact = {
      propertyId: r.values.propertyId ?? "",
      name: r.values.name ?? "",
      phone: r.values.phone ?? "",
      sub: r.values.sub || undefined,
    };
    return { id: crypto.randomUUID(), entity, source: { type: "spreadsheet" as const, row: i + 1 }, issues: [], confidence: "high" as const };
  });
  return persistCandidates(ctx, candidates, createEmergencyContact, {
    entityName: (e) => e.name,
  });
}