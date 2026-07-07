"use server";
// Manager-side change-request actions (Pro-3.0 — generalized ops).
// A manager proposes/acts a create/update/delete for any Tier 1 entity (property, lease,
// tenant, payment). The SERVER re-derives the manager's grant in the client's org and
// routes accordingly:
//   • viewer / no grant → createChangeRequest (pending; the client approves later).
//   • full (admin/owner) grant → recordAndApplyManagerChange (auto-approved + applied now).
// The owner approves/rejects pending rows via portfolio/change-requests.actions.ts.
import { revalidatePath } from "next/cache";
import { requireCtx } from "@/lib/auth/ctx";
import { PropertyPatchSchema } from "@/lib/data/types/property";
import { NewLeaseSchema, LeasePatchSchema } from "@/lib/data/types/lease";
import { NewTenantSchema, TenantPatchSchema } from "@/lib/data/types/tenant";
import { NewPaymentSchema, PaymentPatchSchema } from "@/lib/data/types/payment";
import { NewCertificationSchema, CertificationPatchSchema } from "@/lib/data/types/certification";
import { NewInspectionSchema, InspectionPatchSchema } from "@/lib/data/types/inspection";
import { NewSafetyRiskSchema, SafetyRiskPatchSchema } from "@/lib/data/types/safety-risk";
import { NewMaintenanceItemSchema, MaintenanceItemPatchSchema } from "@/lib/data/types/maintenance-item";
import { resolveClientOrgForManager } from "@/app/(pro)/pro/queries";
import {
  createChangeRequest,
  recordAndApplyManagerChange,
  findOwnerUserId,
} from "@/lib/services/change-requests";
import { getMembershipRole } from "@/lib/services/portfolio-members";
import { roleAtLeast } from "@/lib/services/_mapping";
import { insertAccessNotification } from "@/lib/services/client-onboarding";
import { isEntityRegistered } from "@/lib/services/_change-request-dispatcher";
import { bustCache } from "@/lib/cache/bust";
import type { z } from "zod";

// entityType → the Upstash cache tag its list read is stored under (see cached-reads.ts).
// Busting it after an auto-applied change lets the preview reflect the write immediately.
const ENTITY_CACHE_TAGS: Record<string, string> = {
  property: "properties",
  lease: "leases",
  tenant: "tenants",
  payment: "payments",
  certification: "certifications",
  inspection: "inspections",
  "safety-risk": "safety-risks",
  "maintenance-item": "maintenance-items",
};

// ─── Schema map ───────────────────────────────────────────────────────────────
// Used to validate the proposed patch before creating a CR row.
// "create" uses the full New* schema; "update" uses the partial Patch* schema.
// "delete" skips patch validation (patch is always {}).

type SchemaPair = {
  createSchema: z.ZodTypeAny;
  updateSchema: z.ZodTypeAny;
};

const ENTITY_SCHEMAS: Record<string, SchemaPair> = {
  property:           { createSchema: PropertyPatchSchema,    updateSchema: PropertyPatchSchema },
  lease:              { createSchema: NewLeaseSchema,         updateSchema: LeasePatchSchema },
  tenant:             { createSchema: NewTenantSchema,        updateSchema: TenantPatchSchema },
  payment:            { createSchema: NewPaymentSchema,       updateSchema: PaymentPatchSchema },
  certification:      { createSchema: NewCertificationSchema, updateSchema: CertificationPatchSchema },
  inspection:         { createSchema: NewInspectionSchema,    updateSchema: InspectionPatchSchema },
  "safety-risk":      { createSchema: NewSafetyRiskSchema,    updateSchema: SafetyRiskPatchSchema },
  "maintenance-item": { createSchema: NewMaintenanceItemSchema, updateSchema: MaintenanceItemPatchSchema },
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

  // Step 5: authorize — verify this manager actually manages this client (ownership check).
  const resolved = await resolveClientOrgForManager(input.clientId);
  if (!resolved) {
    return { ok: false, error: "Client not found or you do not manage this client." };
  }

  // Step 6: re-derive the manager's grant in the client's org, SERVER-SIDE. This is the
  // authorization boundary that decides propose vs. act — never trust anything from the
  // client. A full (admin/owner) grant applies now; viewer / no grant only proposes.
  const grantRole = await getMembershipRole(resolved.orgId, ctx.userId);
  const canWrite = roleAtLeast(grantRole ?? "viewer", "admin");

  if (canWrite) {
    // Full-grant path: record-approved + apply instantly under a ctx scoped to the client's
    // org with the manager's real (admin/owner) role. recordAndApplyManagerChange notifies
    // the client itself, so no extra notification here.
    try {
      await recordAndApplyManagerChange(
        { userId: ctx.userId, orgId: resolved.orgId, orgRole: grantRole! },
        {
          ownerOrgId: resolved.orgId,
          entityType: input.entityType,
          entityId: input.entityId ?? null,
          operation: input.operation,
          proposedPatch: validatedPatch,
        },
      );
    } catch (err) {
      console.error("proposeChangeAction: recordAndApplyManagerChange failed", err);
      return { ok: false, error: "Failed to apply the change. Please try again." };
    }

    // Reflect the applied change in the preview: bust the entity's cache tag (prod) and
    // revalidate the preview route tree so its Server Components re-read fresh data.
    const tag = ENTITY_CACHE_TAGS[input.entityType];
    if (tag) await bustCache(tag);
    revalidatePath(`/pro/clients/${input.clientId}/as-client`, "layout");

    return { ok: true };
  }

  // Viewer / no-grant path: create a pending change_request row (never writes the entity).
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

  // Notify the client owner (if they've accepted their invitation) to review the proposal.
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
