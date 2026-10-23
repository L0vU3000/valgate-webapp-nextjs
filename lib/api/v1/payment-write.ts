import { z } from "zod";
import {
  NewPaymentSchema,
  PaymentPatchSchema,
  PaymentSchema,
  type NewPayment,
  type Payment,
  type PaymentPatch,
} from "@/lib/data/types/payment";

// HTTP API v1 payment bodies + DTO. propertyId always comes from the URL (never the body), ids are
// server-generated. The domain PaymentSchema already bounds every field (enums, nonnegative
// amount, int ms date); z.object strips unknown keys so they are never stored.

const fields = PaymentSchema.shape;

// The amount column is numeric(14,2): 12 integer digits and 2 decimals. "Non-negative" is not a
// bound, so a number with more decimals would be silently rounded by Postgres, and one past the
// column's range would fail the insert and surface as a generic 500. Both are client errors and
// both are a 400 here — silently changing an amount is the one thing a payments API must not do.
const MAX_AMOUNT = 999_999_999_999.99;
const amountSchema = z
  .number()
  .nonnegative()
  .max(MAX_AMOUNT)
  .refine((n) => Number(n.toFixed(2)) === n, { message: "amount must have at most 2 decimals" });

// The date column is a timestamp; the wire value is Unix ms. Bounded so a nonsense epoch is a 400
// at the boundary instead of an out-of-range Date reaching the driver.
const dateSchema = z.number().int().min(0).max(4_102_444_800_000); // 2100-01-01T00:00:00Z

export const PaymentCreateBodySchema = z.object({
  leaseId: fields.leaseId,
  date: dateSchema,
  kind: fields.kind,
  amount: amountSchema,
  method: fields.method,
  status: fields.status,
});
export type PaymentCreateBody = z.infer<typeof PaymentCreateBodySchema>;

// leaseId is deliberately NOT patchable: re-pointing a payment at another lease could move it to a
// property the PATCH route never checked. Delete + re-create instead.
export const PaymentPatchBodySchema = PaymentCreateBodySchema.omit({ leaseId: true })
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: "At least one field is required" });
export type PaymentPatchBody = z.infer<typeof PaymentPatchBodySchema>;

export function parsePaymentCreateBody(raw: unknown): { ok: true; body: PaymentCreateBody } | { ok: false } {
  const r = PaymentCreateBodySchema.safeParse(raw);
  return r.success ? { ok: true, body: r.data } : { ok: false };
}

export function parsePaymentPatchBody(raw: unknown): { ok: true; body: PaymentPatchBody } | { ok: false } {
  const r = PaymentPatchBodySchema.safeParse(raw);
  return r.success ? { ok: true, body: r.data } : { ok: false };
}

export function toNewPayment(body: PaymentCreateBody): NewPayment {
  return NewPaymentSchema.parse(body);
}

// Only copy keys actually sent — an `undefined` copied through would NULL a column.
export function toPaymentPatch(body: PaymentPatchBody): PaymentPatch {
  const patch: PaymentPatch = {};
  for (const key of ["date", "kind", "amount", "method", "status"] as const) {
    if (body[key] !== undefined) Object.assign(patch, { [key]: body[key] });
  }
  return PaymentPatchSchema.parse(patch);
}

// GET ?limit= — default 50, max 200.
export const PAYMENT_HISTORY_DEFAULT_LIMIT = 50;
export const PAYMENT_HISTORY_MAX_LIMIT = 200;
export function parsePaymentHistoryLimit(raw: string | null): number | null {
  if (raw === null) return PAYMENT_HISTORY_DEFAULT_LIMIT;
  const r = z.coerce.number().int().min(1).max(PAYMENT_HISTORY_MAX_LIMIT).safeParse(raw);
  return r.success ? r.data : null;
}

export type PaymentDtoV1 = {
  id: string;
  leaseId: string | null;
  /** Unix ms. */
  date: number;
  kind: Payment["kind"];
  amount: number;
  method: Payment["method"];
  status: Payment["status"];
};

// Hand-written field list, never a spread: org/user/tenant ids and internal columns stay off the wire.
export function toPaymentDto(p: Payment): PaymentDtoV1 {
  return {
    id: p.id,
    leaseId: p.leaseId ?? null,
    date: p.date,
    kind: p.kind,
    amount: p.amount,
    method: p.method,
    status: p.status,
  };
}
