// Change-request dispatcher (Pro-3.0 — generalized ops).
// Maps entityType → per-operation schema + service fn.
// proposedPatch is ALWAYS re-validated here before being applied.
import "server-only";
import { z } from "zod";

// Property
import { PropertyPatchSchema, NewPropertySchema } from "@/lib/data/types/property";
import { createProperty, updateProperty, deleteProperty } from "@/lib/services/properties";
import type { PropertyPatch } from "@/lib/data/types/property";

// Lease
import { NewLeaseSchema, LeasePatchSchema } from "@/lib/data/types/lease";
import { createLease, updateLease, deleteLease } from "@/lib/services/leases";
import type { LeasePatch } from "@/lib/data/types/lease";

// Tenant
import { NewTenantSchema, TenantPatchSchema } from "@/lib/data/types/tenant";
import { createTenant, updateTenant, deleteTenant } from "@/lib/services/tenants";
import type { TenantPatch } from "@/lib/data/types/tenant";

// Payment
import { NewPaymentSchema, PaymentPatchSchema } from "@/lib/data/types/payment";
import { createPayment, updatePayment, deletePayment } from "@/lib/services/payments";
import type { PaymentPatch } from "@/lib/data/types/payment";

import type { Ctx } from "@/lib/services/_mapping";
import type { ChangeRequest } from "@/lib/services/change-request-types";

// ─── Registry entry shape ─────────────────────────────────────────────────────

type RegistryEntry<TNew, TPatch> = {
  // Used for "create" operations — full required fields.
  createSchema: z.ZodType<TNew>;
  // Used for "update" operations — partial fields.
  updateSchema: z.ZodType<TPatch>;
  // Service functions invoked under the OWNER's admin ctx.
  create: (ctx: Ctx, input: TNew) => Promise<unknown>;
  update: (ctx: Ctx, id: string, patch: TPatch) => Promise<unknown>;
  delete: (ctx: Ctx, id: string) => Promise<void>;
};

// ponytail: all create/update fns typed as unknown — re-validation via createSchema/updateSchema
// at apply-time guarantees correctness; the cast is safe.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const REGISTRY: Record<string, RegistryEntry<any, any>> = {
  property: {
    createSchema: NewPropertySchema,
    updateSchema: PropertyPatchSchema,
    create: (ctx: Ctx, input: unknown) => createProperty(ctx, input as Parameters<typeof createProperty>[1]),
    update: (ctx: Ctx, id: string, patch: unknown) => updateProperty(ctx, id, patch as PropertyPatch),
    delete: (ctx: Ctx, id: string) => deleteProperty(ctx, id),
  },
  lease: {
    createSchema: NewLeaseSchema,
    updateSchema: LeasePatchSchema,
    create: (ctx: Ctx, input: unknown) => createLease(ctx, input as import("@/lib/data/types/lease").NewLease),
    update: (ctx: Ctx, id: string, patch: unknown) => updateLease(ctx, id, patch as LeasePatch),
    delete: (ctx: Ctx, id: string) => deleteLease(ctx, id),
  },
  tenant: {
    createSchema: NewTenantSchema,
    updateSchema: TenantPatchSchema,
    create: (ctx: Ctx, input: unknown) => createTenant(ctx, input as import("@/lib/data/types/tenant").NewTenant),
    update: (ctx: Ctx, id: string, patch: unknown) => updateTenant(ctx, id, patch as TenantPatch),
    delete: (ctx: Ctx, id: string) => deleteTenant(ctx, id),
  },
  payment: {
    createSchema: NewPaymentSchema,
    updateSchema: PaymentPatchSchema,
    create: (ctx: Ctx, input: unknown) => createPayment(ctx, input as import("@/lib/data/types/payment").NewPayment),
    update: (ctx: Ctx, id: string, patch: unknown) => updatePayment(ctx, id, patch as PaymentPatch),
    delete: (ctx: Ctx, id: string) => deletePayment(ctx, id),
  },
};

// ─── Exported helpers ─────────────────────────────────────────────────────────

// Returns true if this entityType is registered (and therefore proposable).
export function isEntityRegistered(entityType: string): boolean {
  return entityType in REGISTRY;
}

// Returns the list of proposable entity type strings for UI surface gating.
export function registeredEntityTypes(): string[] {
  return Object.keys(REGISTRY);
}

// ─── Apply ────────────────────────────────────────────────────────────────────

// Applies the change request under the OWNER's admin ctx (passed by the service).
// Re-validates proposedPatch against the correct schema every time — never trusts stored JSONB.
// Stale deletes (row already removed) are swallowed so the inbox doesn't get stuck.
export async function applyChangeRequest(ctx: Ctx, cr: ChangeRequest): Promise<void> {
  const entry = REGISTRY[cr.entityType];
  if (!entry) {
    throw new Error(`No dispatcher registered for entity type: "${cr.entityType}"`);
  }

  if (cr.operation === "create") {
    // Full New* validation — all required fields must be present.
    const validated = entry.createSchema.parse(cr.proposedPatch);
    await entry.create(ctx, validated);
  } else if (cr.operation === "update") {
    if (!cr.entityId) {
      throw new Error(`Change request ${cr.id} has operation "update" but no entityId`);
    }
    // Partial patch validation.
    const validated = entry.updateSchema.parse(cr.proposedPatch);
    await entry.update(ctx, cr.entityId, validated);
  } else {
    // delete
    if (!cr.entityId) {
      throw new Error(`Change request ${cr.id} has operation "delete" but no entityId`);
    }
    try {
      await entry.delete(ctx, cr.entityId);
    } catch (err) {
      // Stale delete: row was already removed by the owner — treat as success.
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("not found") || msg.includes("No rows") || msg.includes("forbidden")) {
        // "forbidden" is thrown by scopedDelete when orgId mismatches — means it's gone.
        // Re-throw forbidden; swallow not-found.
        if (!msg.includes("not found") && !msg.includes("No rows")) throw err;
        return;
      }
      throw err;
    }
  }
}
