"use server";

import { z } from "zod";
import { createPayment, updatePayment } from "@/lib/services/payments";
import { getLease, updateLease } from "@/lib/services/leases";
import { requireCtx } from "@/lib/auth/ctx";
import { logger } from "@/lib/logger";
import { addUtcMonths } from "@/lib/format";
import { logActivity } from "@/lib/services/activity";
import { revalidatePro, type ProActionResult } from "./_lib/revalidate";

// --- Rent & collections -----------------------------------------------------

// `markRentPaid` is reversible from the UI (the Phase 4 "undo" tier). To keep
// a single action for both directions, it takes an optional target `status`:
//   - normal use: omit it → the record flips to "Paid".
//   - undo: pass the record's PRIOR status (e.g. "Overdue") → it flips back.
// The status is constrained to the real Payment status enum so the undo can
// only ever restore a value the schema already allows.
const markRentPaidSchema = z.object({
  paymentId: z.string().min(1),
  status: z.enum(["Paid", "Pending", "Failed", "Overdue"]).optional(),
});

// Marks an existing Pending/Overdue rent record as Paid (or, on undo, sets it
// back to the status the caller supplies).
export async function markRentPaid(input: {
  paymentId: string;
  status?: "Paid" | "Pending" | "Failed" | "Overdue";
}): Promise<ProActionResult> {
  const parsed = markRentPaidSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const authCtx = await requireCtx();
  const updated = await updatePayment(authCtx, parsed.data.paymentId, {
    status: parsed.data.status ?? "Paid",
  });
  if (!updated) {
    logger.error("markRentPaid: payment not found", input);
    return { ok: false, error: "Could not update payment." };
  }
  try {
    await logActivity(authCtx, {
      entity: "payment",
      action: "updated",
      entityId: parsed.data.paymentId,
      summary: `Payment ${parsed.data.paymentId} marked as ${parsed.data.status ?? "Paid"}`,
    });
  } catch (err) {
    console.error("markRentPaid: audit log failed", err);
  }
  revalidatePro();
  return { ok: true };
}

const logRentPaymentSchema = z.object({
  leaseId: z.string().min(1),
  amount: z.number().positive(),
  method: z.enum(["ABA Bank", "Wing", "Wire transfer", "Cash"]),
});

// Records a rent payment received this month for a lease that has no
// payment record yet.
export async function logRentPayment(input: {
  leaseId: string;
  amount: number;
  method: "ABA Bank" | "Wing" | "Wire transfer" | "Cash";
}): Promise<ProActionResult> {
  const parsed = logRentPaymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const authCtx = await requireCtx();
  const lease = await getLease(authCtx, parsed.data.leaseId);
  if (!lease) {
    logger.error("logRentPayment: lease not found", input);
    return { ok: false, error: "Could not record payment." };
  }

  await createPayment(authCtx, {
    leaseId: lease.id,
    date: Date.now(),
    kind: "Rent",
    amount: parsed.data.amount,
    method: parsed.data.method,
    status: "Paid",
  });
  try {
    await logActivity(authCtx, {
      entity: "payment",
      action: "created",
      entityId: lease.id,
      summary: `Rent payment of ${parsed.data.amount} recorded for lease ${lease.id}`,
      propertyId: lease.propertyId,
    });
  } catch (err) {
    console.error("logRentPayment: audit log failed", err);
  }
  revalidatePro();
  return { ok: true };
}

const renewLeaseSchema = z.object({
  leaseId: z.string().min(1),
});

// Extends a lease by its own term length (e.g. 12 more months).
export async function renewLease(input: {
  leaseId: string;
}): Promise<ProActionResult> {
  const parsed = renewLeaseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const authCtx = await requireCtx();
  const lease = await getLease(authCtx, parsed.data.leaseId);
  if (!lease) {
    logger.error("renewLease: lease not found", input);
    return { ok: false, error: "Could not renew lease." };
  }

  // Advance the end date by one full lease term. addUtcMonths clamps the day
  // into the target month so a lease ending on the 31st can't silently drift
  // past its real anniversary (see lib/format.ts for the why).
  const newEndDate = addUtcMonths(lease.endDate, lease.termMonths);

  await updateLease(authCtx, lease.id, {
    endDate: newEndDate,
    renewalStatus: "Renewed",
  });
  revalidatePro();
  return { ok: true };
}
