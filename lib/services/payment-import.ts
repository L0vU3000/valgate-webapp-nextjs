import "server-only";
import { createPayment } from "@/lib/services/payments";
import { persistCandidates } from "@/lib/services/ingestion/persist";
import { resolveProperty, type PropertyMatch } from "@/lib/services/import-property-link";
import { parseCurrency, parseDateMs } from "@/app/_shared/add-property/map-to-property";
import type { FieldSpec, AssembledRow } from "@/lib/services/entity-import";
import type { Ctx } from "@/lib/services/_mapping";
import type { ReviewRow, BulkResult, IngestionCandidate } from "@/lib/services/ingestion/types";
import type { NewPayment } from "@/lib/data/types/payment";

export const PAYMENT_FIELDS: FieldSpec[] = [
  { field: "property", required: true, description: "The property this payment is for — its label, name, or ID." },
  { field: "date", required: true, description: "Payment date." },
  { field: "kind", required: true, description: "Payment type: Rent, Fee, Deposit, or Refund." },
  { field: "amount", required: true, description: "Payment amount as a number." },
  { field: "method", required: true, description: "Payment method: ABA Bank, Wing, Wire transfer, or Cash." },
  { field: "status", required: true, description: "Payment status: Paid, Pending, Failed, or Overdue." },
];

function normalizeKind(raw: string): string {
  const v = raw.toLowerCase().trim();
  if (/rent/.test(v)) return "Rent";
  if (/fee/.test(v)) return "Fee";
  if (/deposit/.test(v)) return "Deposit";
  if (/refund/.test(v)) return "Refund";
  return "Rent";
}
function normalizeMethod(raw: string): string {
  const v = raw.toLowerCase().trim();
  if (/aba/.test(v)) return "ABA Bank";
  if (/wing/.test(v)) return "Wing";
  if (/wire|transfer|bank transfer/.test(v)) return "Wire transfer";
  if (/cash/.test(v)) return "Cash";
  return "Cash";
}
function normalizePaymentStatus(raw: string): string {
  const v = raw.toLowerCase().trim();
  if (/paid|settled|complete/.test(v)) return "Paid";
  if (/pend|process|waiting/.test(v)) return "Pending";
  if (/fail|reject|bounc/.test(v)) return "Failed";
  if (/overdue|late|unpaid/.test(v)) return "Overdue";
  return "Pending";
}

export function toPaymentReviewRow(assembled: AssembledRow, matches: PropertyMatch[]): ReviewRow {
  const v = assembled.values;
  const issues: string[] = [...assembled.missing.map((m) => `Missing ${m}`)];
  const rawProperty = v.property ?? "";
  const propertyId = resolveProperty(rawProperty, matches);
  if (!propertyId && rawProperty) issues.push("No matching property — pick one");
  return {
    values: {
      propertyId,
      date: v.date ?? "",
      kind: normalizeKind(v.kind ?? ""),
      amount: v.amount ?? "",
      method: normalizeMethod(v.method ?? ""),
      status: normalizePaymentStatus(v.status ?? ""),
    },
    rawProperty,
    issues,
  };
}

export async function bulkCreatePayments(ctx: Ctx, rows: ReviewRow[]): Promise<BulkResult> {
  const candidates: IngestionCandidate<NewPayment>[] = rows.map((r, i) => {
    const entity: NewPayment = {
      date: parseDateMs(r.values.date) ?? Date.now(),
      kind: r.values.kind as NewPayment["kind"],
      amount: parseCurrency(r.values.amount) ?? 0,
      method: r.values.method as NewPayment["method"],
      status: r.values.status as NewPayment["status"],
    };
    return { id: crypto.randomUUID(), entity, source: { type: "spreadsheet" as const, row: i + 1 }, issues: [], confidence: "high" as const };
  });
  return persistCandidates(ctx, candidates, createPayment, {
    entityName: (e) => `${e.kind} ${e.amount}`,
  });
}
