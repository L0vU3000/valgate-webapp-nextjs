"use server";

import { z } from "zod";
import { createPayment, updatePayment } from "@/lib/services/payments";
import { getLease, updateLease } from "@/lib/services/leases";
import { payments, leases } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { addUtcMonths } from "@/lib/format";
import { logActivity } from "@/lib/services/activity";
import { bustCache } from "@/lib/cache/bust";
import { resolveOnBehalfForRow, type OnBehalf } from "./_lib/on-behalf";
import { proposeChangeAction } from "./change-requests.actions";
import { revalidatePro, type ProActionResult } from "./_lib/revalidate";

// The ctx to READ entity data under: the client's org for accepted clients, the
// manager's own org otherwise.
function readCtxOf(routing: OnBehalf) {
  return routing.audited ? routing.readCtx : routing.ctx;
}

// --- Rent & collections -----------------------------------------------------

// Phase 2 (align-client-manager-parity): each write resolves the row's owning org
// server-side. Own-portfolio / draft clients write directly; an accepted client's rows
// flow through the audited change_requests path (full grant applies, viewer proposes).

// `markRentPaid` is reversible from the UI (the Phase 4 "undo" tier). To keep
// a single action for both directions, it takes an optional target `status`:
//   - normal use: omit it → the record flips to "Paid".
//   - undo: pass the record's PRIOR status (e.g. "Overdue") → it flips back.
const markRentPaidSchema = z.object({
  paymentId: z.string().min(1),
  status: z.enum(["Paid", "Pending", "Failed", "Overdue"]).optional(),
});

export async function markRentPaid(input: {
  paymentId: string;
  status?: "Paid" | "Pending" | "Failed" | "Overdue";
}): Promise<ProActionResult> {
  const parsed = markRentPaidSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const routing = await resolveOnBehalfForRow(payments, parsed.data.paymentId);
  if (!routing) return { ok: false, error: "Could not update payment." };

  const patch = { status: parsed.data.status ?? ("Paid" as const) };

  if (routing.audited) {
    const result = await proposeChangeAction({
      clientId: routing.clientId,
      entityType: "payment",
      entityId: parsed.data.paymentId,
      operation: "update",
      patch,
    });
    if (!result.ok) return { ok: false, error: result.error ?? "Could not update payment." };
    revalidatePro();
    return { ok: true };
  }

  const updated = await updatePayment(routing.ctx, parsed.data.paymentId, patch);
  if (!updated) {
    logger.error("markRentPaid: payment not found", input);
    return { ok: false, error: "Could not update payment." };
  }
  await bustCache("payments");
  try {
    await logActivity(routing.ctx, {
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

  // Route on the parent lease — the new payment lands in the lease's owning org.
  const routing = await resolveOnBehalfForRow(leases, parsed.data.leaseId);
  if (!routing) return { ok: false, error: "Could not record payment." };

  // Verify the lease exists under the resolved org (read scope).
  const lease = await getLease(readCtxOf(routing), parsed.data.leaseId);
  if (!lease) {
    logger.error("logRentPayment: lease not found", input);
    return { ok: false, error: "Could not record payment." };
  }

  const patch = {
    leaseId: lease.id,
    date: Date.now(),
    kind: "Rent" as const,
    amount: parsed.data.amount,
    method: parsed.data.method,
    status: "Paid" as const,
  };

  if (routing.audited) {
    const result = await proposeChangeAction({
      clientId: routing.clientId,
      entityType: "payment",
      entityId: null,
      operation: "create",
      patch,
    });
    if (!result.ok) return { ok: false, error: result.error ?? "Could not record payment." };
    revalidatePro();
    return { ok: true };
  }

  await createPayment(routing.ctx, patch);
  await bustCache("payments");
  try {
    await logActivity(routing.ctx, {
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

  const routing = await resolveOnBehalfForRow(leases, parsed.data.leaseId);
  if (!routing) return { ok: false, error: "Could not renew lease." };

  const lease = await getLease(readCtxOf(routing), parsed.data.leaseId);
  if (!lease) {
    logger.error("renewLease: lease not found", input);
    return { ok: false, error: "Could not renew lease." };
  }

  // Advance the end date by one full lease term. addUtcMonths clamps the day
  // into the target month so a lease ending on the 31st can't silently drift
  // past its real anniversary (see lib/format.ts for the why).
  const newEndDate = addUtcMonths(lease.endDate, lease.termMonths);
  const patch = { endDate: newEndDate, renewalStatus: "Renewed" as const };

  if (routing.audited) {
    const result = await proposeChangeAction({
      clientId: routing.clientId,
      entityType: "lease",
      entityId: parsed.data.leaseId,
      operation: "update",
      patch,
    });
    if (!result.ok) return { ok: false, error: result.error ?? "Could not renew lease." };
    revalidatePro();
    return { ok: true };
  }

  await updateLease(routing.ctx, lease.id, patch);
  await bustCache("leases");
  revalidatePro();
  return { ok: true };
}
