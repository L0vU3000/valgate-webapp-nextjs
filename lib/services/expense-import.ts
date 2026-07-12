import "server-only";
import { createExpense } from "@/lib/services/expenses";
import { persistCandidates } from "@/lib/services/ingestion/persist";
import { resolveProperty, type PropertyMatch } from "@/lib/services/import-property-link";
import { parseCurrency, parseDateMs } from "@/app/_shared/add-property/map-to-property";
import type { FieldSpec, AssembledRow } from "@/lib/services/entity-import";
import type { Ctx } from "@/lib/services/_mapping";
import type { ReviewRow, BulkResult, IngestionCandidate } from "@/lib/services/ingestion/types";
import type { NewExpense } from "@/lib/data/types/expense";

export const EXPENSE_FIELDS: FieldSpec[] = [
  { field: "property", required: true, description: "The property this expense is for — its label, name, or ID." },
  { field: "date", required: true, description: "Expense date." },
  { field: "category", required: true, description: "Expense category: Maintenance, Utilities, Insurance, Tax, Management, or Other." },
  { field: "amount", required: true, description: "Expense amount as a number." },
  { field: "note", required: false, description: "Description or note about the expense." },
];

function normalizeCategory(raw: string): string {
  const v = raw.toLowerCase().trim();
  if (/maint|repair|fix/.test(v)) return "Maintenance";
  if (/util|electric|water|gas|internet/.test(v)) return "Utilities";
  if (/insur/.test(v)) return "Insurance";
  if (/tax/.test(v)) return "Tax";
  if (/manag|admin|fee/.test(v)) return "Management";
  return "Other";
}

export function toExpenseReviewRow(assembled: AssembledRow, matches: PropertyMatch[]): ReviewRow {
  const v = assembled.values;
  const issues: string[] = [...assembled.missing.map((m) => `Missing ${m}`)];
  const rawProperty = v.property ?? "";
  const propertyId = resolveProperty(rawProperty, matches);
  if (!propertyId && rawProperty) issues.push("No matching property — pick one");
  return {
    values: {
      propertyId,
      date: v.date ?? "",
      category: normalizeCategory(v.category ?? ""),
      amount: v.amount ?? "",
      note: v.note ?? "",
    },
    rawProperty,
    issues,
  };
}

export async function bulkCreateExpenses(ctx: Ctx, rows: ReviewRow[]): Promise<BulkResult> {
  const candidates: IngestionCandidate<NewExpense>[] = rows.map((r, i) => {
    const entity: NewExpense = {
      propertyId: r.values.propertyId ?? "",
      date: parseDateMs(r.values.date) ?? Date.now(),
      category: r.values.category as NewExpense["category"],
      amount: parseCurrency(r.values.amount) ?? 0,
      note: r.values.note || undefined,
    };
    return { id: crypto.randomUUID(), entity, source: { type: "spreadsheet" as const, row: i + 1 }, issues: [], confidence: "high" as const };
  });
  return persistCandidates(ctx, candidates, createExpense, {
    entityName: (e) => `${e.category} ${e.amount}`,
  });
}
