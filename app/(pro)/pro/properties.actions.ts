"use server";

import { z } from "zod";
import { createPayment, updatePayment } from "@/lib/services/payments";
import { getLease, updateLease } from "@/lib/services/leases";
import { createMaintenanceItem, updateMaintenanceItem } from "@/lib/services/maintenance-items";
import { updateSafetyRisk } from "@/lib/services/safety-risks";
import { getProfessional } from "@/lib/services/professionals";
import { getClientRecord } from "@/lib/services/client-records";
import { getProperty, updateProperty, createProperty as svcCreateProperty, bulkAssignProperties as svcBulkAssign, listPropertyNamesByClientId } from "@/lib/services/properties";
import { propertyTypeChoiceSchema, propertyStatusSchema, propertyTitleSchema } from "@/lib/data/types/property";
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
  // "Cancelled" is a terminal state added in Item 3 — work order is withdrawn
  // before completion, drops out of the active queue and cost rollups.
  status: z.enum(["Open", "InProgress", "Resolved", "Cancelled"]).optional(),
  vendorId: z.string().min(1).nullable().optional(),
  cost: z.number().nonnegative().optional(),
});

export async function updateWorkOrder(input: {
  id: string;
  status?: "Open" | "InProgress" | "Resolved" | "Cancelled";
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
    // Task 5 — vendor existence + ownership check. A vendor is a Professional
    // from the directory. Before we save a vendorId we look it up through the
    // org-scoped service: getProfessional only returns rows belonging to the
    // caller's org, so a missing OR cross-org id comes back null. Either way we
    // refuse with a generic error rather than trusting the client-supplied id.
    // (A null vendorId means "unassign", so it skips the check.)
    if (parsed.data.vendorId !== null) {
      const vendor = await getProfessional(authCtx, parsed.data.vendorId);
      if (!vendor) {
        logger.error("updateWorkOrder: vendor not found or cross-org", input);
        return { ok: false, error: "Could not assign that vendor." };
      }
    }
    patch.vendorId = parsed.data.vendorId ?? undefined;
  }

  const updated = await updateMaintenanceItem(authCtx, parsed.data.id, patch);
  if (!updated) {
    logger.error("updateWorkOrder: item not found", input);
    return { ok: false, error: "Could not update work order." };
  }
  try {
    await logActivity(authCtx, {
      entity: "workOrder",
      action: "updated",
      entityId: parsed.data.id,
      summary: `Work order ${parsed.data.id} updated`,
    });
  } catch (err) {
    console.error("updateWorkOrder: audit log failed", err);
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
  try {
    await logActivity(authCtx, {
      entity: "safetyRisk",
      action: "updated",
      entityId: parsed.data.riskId,
      summary: `Safety risk ${parsed.data.riskId} resolved`,
    });
  } catch (err) {
    console.error("resolveSafetyRisk: audit log failed", err);
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

  const authCtx = await requireCtx();
  // Ownership-scoped Drizzle read (IDOR guard) — the FS record is retired.
  const client = await getClientRecord(authCtx, parsed.data.clientId);
  if (!client) {
    logger.error("assignProperties: client not found", input);
    return { ok: false, error: "Could not assign properties." };
  }

  const result = await svcBulkAssign(authCtx, client.id, authCtx.orgId, parsed.data.propertyIds);
  if (result.conflicts.length > 0) {
    logger.warn("assignProperties: conflicts", { conflicts: result.conflicts });
  }

  revalidatePro();
  return { ok: true };
}

const csvPropertySchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: propertyTypeChoiceSchema,
  status: propertyStatusSchema,
  totalArea: z.string().min(1, "Total area is required"),
  title: propertyTitleSchema,
  buyNumeric: z.coerce.number().nonnegative("Buy numeric must be >= 0").default(0),
  lat: z.coerce.number().default(0),
  lng: z.coerce.number().default(0),
  addressLine: z.string().optional().default(""),
  city: z.string().optional().default(""),
  zip: z.string().optional().default(""),
  country: z.string().optional().default(""),
  province: z.string().optional().default(""),
  yearBuilt: z.string().optional().default(""),
  bedrooms: z.string().optional().default(""),
  bathrooms: z.string().optional().default(""),
  parkingSpaces: z.string().optional().default(""),
  purchasePrice: z.string().optional().default(""),
  currentMarketValue: z.coerce.number().optional().default(0),
});

const importCsvSchema = z.object({
  clientId: z.string().min(1),
  rows: z.array(csvPropertySchema).min(1),
});

export async function importCsvProperties(input: {
  clientId: string;
  rows: unknown[];
  // When true, skip the name-dedup check and import even if a property with
  // the same name already exists for this client. Useful when the manager
  // intentionally has two properties with the same name (e.g. two units called
  // "Apartment A").
  createAnyway?: boolean;
}): Promise<ProActionResult> {
  // Validate clientId + rows via Zod. createAnyway is a trusted boolean from
  // our own UI — no need to put it through the schema.
  const parsed = importCsvSchema.safeParse({ clientId: input.clientId, rows: input.rows });
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return { ok: false, error: `Invalid CSV data: ${issues}` };
  }

  const authCtx = await requireCtx();

  // Ownership-scoped Drizzle read (IDOR guard) — confirm the target client
  // actually belongs to this manager BEFORE we create any properties and stamp
  // that clientId onto them. Client ids are short and guessable (CLI-xxxx), so
  // without this check a manager could stamp their own new properties with
  // another manager's clientId. Mirrors the same guard in `assignProperties`.
  const client = await getClientRecord(authCtx, parsed.data.clientId);
  if (!client) {
    logger.error("importCsvProperties: client not found", { clientId: parsed.data.clientId });
    return { ok: false, error: "Could not import properties." };
  }

  // Pre-load existing property names for this client so we can detect duplicates
  // without a DB query per row (avoids N+1). Returns an empty Set when the client
  // has no properties yet, so first-time imports are unaffected.
  const existingNames = input.createAnyway
    ? new Set<string>()
    : await listPropertyNamesByClientId(authCtx, client.id);

  let createdCount = 0;
  const skippedRows: Array<{ row: number; reason: string }> = [];

  for (let i = 0; i < parsed.data.rows.length; i++) {
    const row = parsed.data.rows[i];
    const rowNumber = i + 1; // 1-based so the UI can say "Row 3: …"

    // Dedupe: skip rows whose name matches an existing property for this client
    // (case-insensitive). The createAnyway flag bypasses this when the manager
    // explicitly wants duplicates.
    if (!input.createAnyway && existingNames.has(row.name.toLowerCase())) {
      skippedRows.push({ row: rowNumber, reason: "duplicate of an existing property" });
      continue;
    }

    // Skip-don't-fail: a single bad row (e.g. invalid type string, DB constraint)
    // must never abort the whole batch. Log internally; surface a per-row reason.
    try {
      const result = await svcCreateProperty(authCtx, row);
      if (!result) {
        skippedRows.push({ row: rowNumber, reason: "could not create property" });
        continue;
      }
      await updateProperty(authCtx, result.id, { clientId: client.id });
      createdCount++;
    } catch (err) {
      logger.error("importCsvProperties: row failed", { row: rowNumber, error: String(err) });
      skippedRows.push({ row: rowNumber, reason: "could not create property" });
    }
  }

  revalidatePro();
  return { ok: true, count: createdCount, skipped: skippedRows };
}
