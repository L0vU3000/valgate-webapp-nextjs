"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createPayment, updatePayment } from "@/lib/services/payments";
import { getLease, updateLease } from "@/lib/services/leases";
import { createMaintenanceItem, updateMaintenanceItem } from "@/lib/services/maintenance-items";
import { updateSafetyRisk } from "@/lib/services/safety-risks";
import * as clientsDb from "@/lib/data/db/clients";
import { getProperty, updateProperty } from "@/lib/services/properties";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import { requireCtx } from "@/lib/auth/ctx";
import { logger } from "@/lib/logger";

// Pro server actions — the inputs an asset manager gives Valgate.
// Every input is Zod-validated; failures return generic strings
// (details are logged server-side only).

export type ProActionResult =
  | { ok: true }
  | { ok: false; error: string };

// Refresh every pro route after a mutation — the dashboard, client pages,
// rent and work-order pages all derive from the same entities.
function revalidatePro(): void {
  revalidatePath("/pro", "layout");
}

// --- Rent & collections -----------------------------------------------------

const markRentPaidSchema = z.object({
  paymentId: z.string().min(1),
});

// Marks an existing Pending/Overdue rent record as Paid.
export async function markRentPaid(input: {
  paymentId: string;
}): Promise<ProActionResult> {
  const parsed = markRentPaidSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const authCtx = await requireCtx();
  const updated = await updatePayment(authCtx, parsed.data.paymentId, {
    status: "Paid",
  });
  if (!updated) {
    logger.error("markRentPaid: payment not found", input);
    return { ok: false, error: "Could not update payment." };
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

  const end = new Date(lease.endDate);
  end.setUTCMonth(end.getUTCMonth() + lease.termMonths);

  await updateLease(authCtx, lease.id, {
    endDate: end.getTime(),
    renewalStatus: "Renewed",
  });
  revalidatePro();
  return { ok: true };
}

// --- Work orders -------------------------------------------------------------

const createWorkOrderSchema = z.object({
  propertyId: z.string().min(1),
  title: z.string().min(3).max(200),
  severity: z.enum(["Emergency", "Urgent", "Standard"]),
  vendorId: z.string().min(1).optional(),
  cost: z.number().nonnegative().optional(),
});

export async function createWorkOrder(input: {
  propertyId: string;
  title: string;
  severity: "Emergency" | "Urgent" | "Standard";
  vendorId?: string;
  cost?: number;
}): Promise<ProActionResult> {
  const parsed = createWorkOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const authCtx = await requireCtx();
  const property = await getProperty(authCtx, parsed.data.propertyId);
  if (!property) {
    logger.error("createWorkOrder: property not found", input);
    return { ok: false, error: "Could not create work order." };
  }

  await createMaintenanceItem(authCtx, {
    propertyId: parsed.data.propertyId,
    title: parsed.data.title,
    severity: parsed.data.severity,
    status: "Open",
    vendorId: parsed.data.vendorId,
    cost: parsed.data.cost,
  });
  revalidatePro();
  return { ok: true };
}

const updateWorkOrderSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["Open", "InProgress", "Resolved"]).optional(),
  vendorId: z.string().min(1).nullable().optional(),
  cost: z.number().nonnegative().optional(),
});

export async function updateWorkOrder(input: {
  id: string;
  status?: "Open" | "InProgress" | "Resolved";
  vendorId?: string | null;
  cost?: number;
}): Promise<ProActionResult> {
  const parsed = updateWorkOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const authCtx = await requireCtx();
  const patch: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) patch.status = parsed.data.status;
  if (parsed.data.cost !== undefined) patch.cost = parsed.data.cost;
  if (parsed.data.vendorId !== undefined) {
    patch.vendorId = parsed.data.vendorId ?? undefined;
  }

  const updated = await updateMaintenanceItem(authCtx, parsed.data.id, patch);
  if (!updated) {
    logger.error("updateWorkOrder: item not found", input);
    return { ok: false, error: "Could not update work order." };
  }
  revalidatePro();
  return { ok: true };
}

// --- Clients -------------------------------------------------------------------

const onboardClientSchema = z.object({
  name: z.string().min(2).max(120),
  clientType: z.enum(["Individual", "Corporate"]),
  email: z.string().email().optional(),
  phone: z.string().max(40).optional(),
  managementFeePct: z.number().min(0).max(100).optional(),
  propertyIds: z.array(z.string().min(1)).default([]),
});

// Avatar palette cycled by client count — matches the seeded convention.
const AVATAR_PALETTE = [
  "bg-violet-400",
  "bg-rose-400",
  "bg-sky-400",
  "bg-amber-400",
  "bg-emerald-400",
  "bg-cyan-400",
  "bg-indigo-400",
  "bg-orange-400",
];

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "?";
  const second = parts.length > 1 ? (parts[1]?.[0] ?? "") : "";
  return (first + second).toUpperCase();
}

export async function onboardClient(input: {
  name: string;
  clientType: "Individual" | "Corporate";
  email?: string;
  phone?: string;
  managementFeePct?: number;
  propertyIds?: string[];
}): Promise<ProActionResult> {
  const parsed = onboardClientSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const userId = getCurrentUserId();
  const authCtx = await requireCtx();
  const existing = await clientsDb.list(userId);
  const now = Date.now();

  const client = await clientsDb.create(userId, {
    userId,
    name: parsed.data.name,
    clientType: parsed.data.clientType,
    initials: initialsFromName(parsed.data.name),
    avatarBg: AVATAR_PALETTE[existing.length % AVATAR_PALETTE.length],
    email: parsed.data.email,
    phone: parsed.data.phone,
    managementFeePct: parsed.data.managementFeePct,
    clientSince: now,
  });

  for (const propertyId of parsed.data.propertyIds) {
    const updated = await updateProperty(authCtx, propertyId, {
      clientId: client.id,
    });
    if (!updated) {
      logger.error("onboardClient: property not found", { propertyId });
      return { ok: false, error: "Client created, but a property assignment failed." };
    }
  }

  revalidatePro();
  return { ok: true };
}

// --- Compliance -------------------------------------------------------------

const resolveSafetyRiskSchema = z.object({
  riskId: z.string().min(1),
});

// Marks an open safety risk as Resolved and stamps the resolution time.
// One-way and one-click (no modal), matching "Mark paid" and the work-order
// status flips — a resolution captures no extra input.
export async function resolveSafetyRisk(input: {
  riskId: string;
}): Promise<ProActionResult> {
  const parsed = resolveSafetyRiskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const authCtx = await requireCtx();
  const updated = await updateSafetyRisk(authCtx, parsed.data.riskId, {
    status: "Resolved",
    resolvedAt: Date.now(),
  });
  if (!updated) {
    logger.error("resolveSafetyRisk: risk not found", input);
    return { ok: false, error: "Could not resolve this risk." };
  }
  revalidatePro();
  return { ok: true };
}

const assignPropertiesSchema = z.object({
  clientId: z.string().min(1),
  propertyIds: z.array(z.string().min(1)).min(1),
});

export async function assignProperties(input: {
  clientId: string;
  propertyIds: string[];
}): Promise<ProActionResult> {
  const parsed = assignPropertiesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const userId = getCurrentUserId();
  const authCtx = await requireCtx();
  const client = await clientsDb.get(userId, parsed.data.clientId);
  if (!client) {
    logger.error("assignProperties: client not found", input);
    return { ok: false, error: "Could not assign properties." };
  }

  for (const propertyId of parsed.data.propertyIds) {
    const updated = await updateProperty(authCtx, propertyId, {
      clientId: client.id,
    });
    if (!updated) {
      logger.error("assignProperties: property not found", { propertyId });
      return { ok: false, error: "Could not assign properties." };
    }
  }

  revalidatePro();
  return { ok: true };
}
