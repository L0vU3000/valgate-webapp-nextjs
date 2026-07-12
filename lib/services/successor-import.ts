import "server-only";
import { createSuccessor } from "@/lib/services/successors";
import { persistCandidates } from "@/lib/services/ingestion/persist";
import { parseFloatSafe } from "@/app/_shared/add-property/map-to-property";
import type { PropertyMatch } from "@/lib/services/import-property-link";
import type { FieldSpec, AssembledRow } from "@/lib/services/entity-import";
import type { Ctx } from "@/lib/services/_mapping";
import type { ReviewRow, BulkResult, IngestionCandidate } from "@/lib/services/ingestion/types";
import type { NewSuccessor } from "@/lib/data/types/successor";

export const SUCCESSOR_FIELDS: FieldSpec[] = [
  { field: "name", required: true, description: "Successor's full name." },
  { field: "relation", required: true, description: "Relationship: Spouse, Child, Sibling, Parent, or Other." },
  { field: "role", required: true, description: "Role: primary or contingent." },
  { field: "share", required: true, description: "Inheritance share as a number (percentage or fraction)." },
  { field: "email", required: false, description: "Email address." },
  { field: "phone", required: false, description: "Phone number." },
];

function normalizeRelation(raw: string): string {
  const v = raw.toLowerCase().trim();
  if (/spouse|wife|husband|partner/.test(v)) return "Spouse";
  if (/child|son|daughter|kid/.test(v)) return "Child";
  if (/sibling|brother|sister/.test(v)) return "Sibling";
  if (/parent|mother|father|mom|dad/.test(v)) return "Parent";
  return "Other";
}
function normalizeSuccessorRole(raw: string): string {
  const v = raw.toLowerCase().trim();
  if (/primary|main|first/.test(v)) return "primary";
  if (/contingent|secondary|backup/.test(v)) return "contingent";
  return "contingent";
}
function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

export function toSuccessorReviewRow(assembled: AssembledRow, _matches: PropertyMatch[]): ReviewRow {
  const v = assembled.values;
  const issues: string[] = [...assembled.missing.map((m) => `Missing ${m}`)];
  return {
    values: {
      name: v.name ?? "",
      relation: normalizeRelation(v.relation ?? ""),
      role: normalizeSuccessorRole(v.role ?? ""),
      share: v.share ?? "",
      email: v.email ?? "",
      phone: v.phone ?? "",
    },
    issues,
  };
}

export async function bulkCreateSuccessors(ctx: Ctx, rows: ReviewRow[]): Promise<BulkResult> {
  const candidates: IngestionCandidate<NewSuccessor>[] = rows.map((r, i) => {
    const entity: NewSuccessor = {
      name: r.values.name ?? "",
      initials: deriveInitials(r.values.name ?? ""),
      relation: (r.values.relation || "Other") as NewSuccessor["relation"],
      role: (r.values.role || "contingent") as NewSuccessor["role"],
      share: parseFloatSafe(r.values.share) ?? 0,
      verified: false,
      email: (r.values.email || "") as NewSuccessor["email"],
      phone: r.values.phone || undefined,
    };
    return { id: crypto.randomUUID(), entity, source: { type: "spreadsheet" as const, row: i + 1 }, issues: [], confidence: "high" as const };
  });
  return persistCandidates(ctx, candidates, createSuccessor, {
    entityName: (e) => e.name,
  });
}