"use server";

import { z } from "zod";
import { createMaintenanceItem, updateMaintenanceItem } from "@/lib/services/maintenance-items";
import { getProfessional } from "@/lib/services/professionals";
import { getProperty } from "@/lib/services/properties";
import { properties, maintenanceItems } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
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

// --- Work orders -------------------------------------------------------------

// Phase 2 (align-client-manager-parity): each write resolves the row's owning org
// server-side. Own-portfolio / draft clients write directly; an accepted client's rows
// flow through the audited change_requests path (full grant applies, viewer proposes).

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

  // Route on the parent property — the new work order lands in the property's owning org.
  const routing = await resolveOnBehalfForRow(properties, parsed.data.propertyId);
  if (!routing) return { ok: false, error: "Could not create work order." };

  // Confirm the property exists under the resolved org (read scope).
  const property = await getProperty(readCtxOf(routing), parsed.data.propertyId);
  if (!property) {
    logger.error("createWorkOrder: property not found", input);
    return { ok: false, error: "Could not create work order." };
  }

  const patch = {
    propertyId: parsed.data.propertyId,
    title: parsed.data.title,
    severity: parsed.data.severity,
    status: "Open" as const,
    vendorId: parsed.data.vendorId,
    cost: parsed.data.cost,
  };

  if (routing.audited) {
    const result = await proposeChangeAction({
      clientId: routing.clientId,
      entityType: "maintenance-item",
      entityId: null,
      operation: "create",
      patch,
    });
    if (!result.ok) return { ok: false, error: result.error ?? "Could not create work order." };
    revalidatePro();
    return { ok: true };
  }

  await createMaintenanceItem(routing.ctx, patch);
  await bustCache("maintenance-items");
  revalidatePro();
  return { ok: true };
}

const updateWorkOrderSchema = z.object({
  id: z.string().min(1),
  // "Cancelled" is a terminal state — work order is withdrawn before completion,
  // drops out of the active queue and cost rollups.
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

  const routing = await resolveOnBehalfForRow(maintenanceItems, parsed.data.id);
  if (!routing) return { ok: false, error: "Could not update work order." };

  const patch: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) patch.status = parsed.data.status;
  if (parsed.data.cost !== undefined) patch.cost = parsed.data.cost;
  if (parsed.data.vendorId !== undefined) {
    // Vendor existence + ownership check. A vendor is a Professional from the directory;
    // getProfessional is org-scoped, so a missing OR cross-org id comes back null and we
    // refuse rather than trust the client-supplied id. The check runs under the work order's
    // OWNING org (read scope) so a vendor can only be assigned from that same org's directory.
    // (A null vendorId means "unassign", so it skips the check.)
    if (parsed.data.vendorId !== null) {
      const vendor = await getProfessional(readCtxOf(routing), parsed.data.vendorId);
      if (!vendor) {
        logger.error("updateWorkOrder: vendor not found or cross-org", input);
        return { ok: false, error: "Could not assign that vendor." };
      }
    }
    patch.vendorId = parsed.data.vendorId ?? undefined;
  }

  if (routing.audited) {
    const result = await proposeChangeAction({
      clientId: routing.clientId,
      entityType: "maintenance-item",
      entityId: parsed.data.id,
      operation: "update",
      patch,
    });
    if (!result.ok) return { ok: false, error: result.error ?? "Could not update work order." };
    revalidatePro();
    return { ok: true };
  }

  const updated = await updateMaintenanceItem(routing.ctx, parsed.data.id, patch);
  if (!updated) {
    logger.error("updateWorkOrder: item not found", input);
    return { ok: false, error: "Could not update work order." };
  }
  await bustCache("maintenance-items");
  try {
    await logActivity(routing.ctx, {
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
