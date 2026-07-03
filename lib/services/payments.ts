import "server-only"; // C1
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { leases, payments } from "@/lib/db/schema";
import { PaymentSchema, type Payment } from "@/lib/data/types/payment";
import type { NewPayment, PaymentPatch } from "@/lib/data/types/payment";
import { toDomain, type Ctx } from "@/lib/services/_mapping";
import { scopedInsert, scopedUpdate, scopedDelete, requireMember } from "@/lib/services/_crud";

const rowToPayment = (r: typeof payments.$inferSelect): Payment =>
  PaymentSchema.parse(toDomain(payments, r)); // C6/C7 (propertyId/tenantId/dueDate stripped by parse)

// Lists payments for the org. When propertyId is given, the WHERE clause adds a filter on
// the payments.property_id column so only payments for that specific property come back.
// The property_id column is populated at create time and backfilled for older rows by
// scripts/backfill-payments-property-id.ts — safe to filter without a JOIN.
export async function listPayments(ctx: Ctx, propertyId?: string): Promise<Payment[]> {
  const rows = await db.select().from(payments)
    .where(propertyId
      ? and(eq(payments.orgId, ctx.orgId), eq(payments.propertyId, propertyId))
      : eq(payments.orgId, ctx.orgId)) // C3
    .orderBy(asc(payments.date), asc(payments.id))
    .limit(500)
  return rows.map(rowToPayment);
}

export async function getPayment(ctx: Ctx, id: string): Promise<Payment | null> {
  const [row] = await db.select().from(payments)
    .where(and(eq(payments.orgId, ctx.orgId), eq(payments.id, id))); // C3
  return row ? rowToPayment(row) : null;
}

export async function createPayment(ctx: Ctx, input: NewPayment): Promise<Payment> {
  requireMember(ctx);
  let propertyId: string | undefined;
  if (input.leaseId) {
    const [lease] = await db.select({ propertyId: leases.propertyId }).from(leases)
      .where(and(eq(leases.orgId, ctx.orgId), eq(leases.id, input.leaseId)));
    propertyId = lease?.propertyId;
  }
  return scopedInsert(ctx, payments, "PMT", input, rowToPayment, propertyId ? { propertyId } : undefined);
}

export async function updatePayment(ctx: Ctx, id: string, patch: PaymentPatch): Promise<Payment | null> {
  return scopedUpdate(ctx, payments, id, patch, rowToPayment);
}

export async function deletePayment(ctx: Ctx, id: string): Promise<void> {
  await scopedDelete(ctx, payments, id);
}
