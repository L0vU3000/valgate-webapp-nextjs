"use server";
// Manager-side change-request actions (Pro-3.0 — generalized ops).
// A read-only org:viewer manager proposes a create/update/delete for any Tier 1
// entity (property, lease, tenant, payment) → creates a pending change_request row.
// The owner approves/rejects via portfolio/change-requests.actions.ts.
import { requireCtx } from "@/lib/auth/ctx";
import { PropertyPatchSchema } from "@/lib/data/types/property";
import { NewLeaseSchema, LeasePatchSchema } from "@/lib/data/types/lease";
import { NewTenantSchema, TenantPatchSchema } from "@/lib/data/types/tenant";
import { NewPaymentSchema, PaymentPatchSchema } from "@/lib/data/types/payment";
import { resolveClientOrgForManager } from "@/app/(pro)/pro/queries";
import {
  createChangeRequest,
  findOwnerUserId,
} from "@/lib/services/change-requests";
import { insertAccessNotification } from "@/lib/services/client-onboarding";
import { isEntityRegistered } from "@/lib/services/_change-request-dispatcher";
import type { z } from "zod";

// ─── Schema map ───────────────────────────────────────────────────────────────
// Used to validate the proposed patch before creating a CR row.
// "create" uses the full New* schema; "update" uses the partial Patch* schema.
// "delete" skips patch validation (patch is always {}).

type SchemaPair = {
  createSchema: z.ZodTypeAny;
  updateSchema: z.ZodTypeAny;
};

const ENTITY_SCHEMAS: Record<string, SchemaPair> = {
  property: { createSchema: PropertyPatchSchema, updateSchema: PropertyPatchSchema },
  lease:    { createSchema: NewLeaseSchema,       updateSchema: LeasePatchSchema },
  tenant:   { createSchema: NewTenantSchema,      updateSchema: TenantPatchSchema },
  payment:  { createSchema: NewPaymentSchema,     updateSchema: PaymentPatchSchema },
};

// ─── Main generalised action ──────────────────────────────────────────────────

// Proposes a create, update, or delete of any registered entity on behalf of the manager.
// - Validates the patch against the entity's schema (create → New*, update → Patch*).
// - Authorizes via resolveClientOrgForManager — ensures this manager owns this client.
// - Inserts a pending change_request row (never writes the entity directly).
// - Notifies the client owner so they can approve/reject from their pending-changes inbox.
export async function proposeChangeAction(input: {
  clientId: string;
  entityType: string;
  entityId?: string | null;
  operation: "create" | "update" | "delete";
  patch: Record<string, unknown>;
}): Promise<{ ok: boolean; error?: string }> {
  // Step 1: entity type must be registered in the dispatcher.
  if (!isEntityRegistered(input.entityType)) {
    return { ok: false, error: `Entity type "${input.entityType}" is not supported.` };
  }

  // Step 2: validate operation rules.
  if (input.operation === "update" && !input.entityId) {
    return { ok: false, error: "An entity ID is required for update proposals." };
  }
  if (input.operation === "delete" && !input.entityId) {
    return { ok: false, error: "An entity ID is required for delete proposals." };
  }

  // Step 3: validate the patch for create/update (delete needs no patch validation).
  let validatedPatch: Record<string, unknown> = {};
  if (input.operation !== "delete") {
    const schemas = ENTITY_SCHEMAS[input.entityType];
    if (!schemas) {
      return { ok: false, error: `No schema found for "${input.entityType}".` };
    }
    const schema = input.operation === "create" ? schemas.createSchema : schemas.updateSchema;
    const parsed = schema.safeParse(input.patch);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Invalid fields: " + parsed.error.issues.map((i: z.ZodIssue) => i.message).join(", "),
      };
    }
    if (input.operation === "update" && Object.keys(parsed.data as object).length === 0) {
      return { ok: false, error: "No changes were proposed." };
    }
    validatedPatch = parsed.data as Record<string, unknown>;
  }

  // Step 4: authenticate.
  const ctx = await requireCtx();

  // Step 5: authorize — verify this manager actually manages this client.
  const resolved = await resolveClientOrgForManager(input.clientId);
  if (!resolved) {
    return { ok: false, error: "Client not found or you do not manage this client." };
  }

  // Step 6: create the pending change_request row (never writes the entity directly).
  try {
    await createChangeRequest(ctx, {
      ownerOrgId: resolved.orgId,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      operation: input.operation,
      proposedPatch: validatedPatch,
    });
  } catch (err) {
    console.error("proposeChangeAction: createChangeRequest failed", err);
    return { ok: false, error: "Failed to submit change request. Please try again." };
  }

  // Step 7: notify the client owner if they have accepted their invitation.
  try {
    const ownerUserId = await findOwnerUserId(resolved.orgId, ctx.userId);
    if (ownerUserId) {
      const opLabel = input.operation === "create" ? "add" : input.operation === "delete" ? "remove" : "update";
      await insertAccessNotification({
        orgId: resolved.orgId,
        userId: ownerUserId,
        title: "A change has been proposed",
        description: `Your manager proposed to ${opLabel} a ${input.entityType}. Review it in your pending changes.`,
        linkTo: "/portfolio/pending-changes",
      });
    }
  } catch (err) {
    // Notification failure must never roll back the change request creation.
    console.error("proposeChangeAction: notification failed (non-fatal)", err);
  }

  return { ok: true };
}

// ─── Backwards-compatible thin wrapper (Phase 2 callers) ─────────────────────

// proposePropertyChangeAction is kept so any existing callers (e.g. other components)
// don't need immediate updates. It delegates to proposeChangeAction internally.
export async function proposePropertyChangeAction(input: {
  clientId: string;
  propertyId: string;
  patch: Record<string, unknown>;
}): Promise<{ ok: boolean; error?: string }> {
  return proposeChangeAction({
    clientId: input.clientId,
    entityType: "property",
    entityId: input.propertyId,
    operation: "update",
    patch: input.patch,
  });
}
