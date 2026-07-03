"use server";

import { z } from "zod";
import { createMaintenanceItem, updateMaintenanceItem } from "@/lib/services/maintenance-items";
import { getProfessional } from "@/lib/services/professionals";
import { getProperty } from "@/lib/services/properties";
import { requireCtx } from "@/lib/auth/ctx";
import { logger } from "@/lib/logger";
import { logActivity } from "@/lib/services/activity";
import { revalidatePro, type ProActionResult } from "./_lib/revalidate";

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
