// Phase 1 — the transport-neutral tool registry (see docs/plans/mcp-tools-in-app-ai.md).
//
// This file is the ONE definition of what each Valgate write tool does. It is a faithful lift of
// the bodies in writes.ts / writes-rental.ts: same service calls, same Zod schemas, same audit
// rows. The only things stripped out are ctx-resolution (orgId, requireExplicitOrg) and
// transport-specific result wrapping (MCP's toolOk/toolError, or the AI SDK's plain-object shape)
// — those stay in each adapter (mcp-server/register.ts for MCP, lib/actions/ai-tools.ts for the
// in-app AI).
//
// A tool body never sees `orgId` or `confirm` — the adapter resolves Ctx and (for destructive
// tools) decides when preview vs commit runs.
import { z } from "zod";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { leases as leasesTable, payments as paymentsTable } from "@/lib/db/schema";
import { NewPropertySchema, PropertyPatchSchema } from "@/lib/data/types/property";
import { NewMaintenanceItemSchema } from "@/lib/data/types/maintenance-item";
import { NewLeaseSchema, LeasePatchSchema } from "@/lib/data/types/lease";
import { NewTenantSchema, TenantPatchSchema } from "@/lib/data/types/tenant";
import { NewPaymentSchema, PaymentPatchSchema } from "@/lib/data/types/payment";
import {
  listProperties,
  createProperty,
  updateProperty,
  deleteProperty,
  getProperty,
  countPropertyCascade,
} from "@/lib/services/properties";
import { createMaintenanceItem } from "@/lib/services/maintenance-items";
import { createLease, updateLease, deleteLease, getLease } from "@/lib/services/leases";
import { createTenant, updateTenant, deleteTenant, getTenant } from "@/lib/services/tenants";
import { createPayment, updatePayment, deletePayment, getPayment } from "@/lib/services/payments";
import { logActivity, type LogActivityInput } from "@/lib/services/activity";
import type { Ctx } from "@/lib/services/_mapping";

// A tool body returns a discriminated result so BOTH adapters can map errors to their own shape
// (MCP's toolError, or a plain `{ error }` object for the AI SDK) without re-implementing the
// not-found / forbidden logic in two places.
export type ToolOutcome<T> = { ok: true; data: T } | { ok: false; message: string };

export type ReadOrWriteDef = {
  kind: "read" | "write";
  name: string;
  description: string;
  input: z.ZodObject<any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- each tool's schema shape differs
  run: (ctx: Ctx, args: any) => Promise<ToolOutcome<any>>; // eslint-disable-line @typescript-eslint/no-explicit-any -- args/data shape is per-tool
  audit?: (ctx: Ctx, args: any, data: any) => LogActivityInput; // eslint-disable-line @typescript-eslint/no-explicit-any -- see above
};

export type DestructiveDef = {
  kind: "destructive";
  name: string;
  description: string;
  input: z.ZodObject<any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- see above
  preview: (
    ctx: Ctx,
    args: any, // eslint-disable-line @typescript-eslint/no-explicit-any -- see above
  ) => Promise<ToolOutcome<{ consequence: string; cascade: unknown }>>;
  commit: (ctx: Ctx, args: any) => Promise<ToolOutcome<any>>; // eslint-disable-line @typescript-eslint/no-explicit-any -- see above
  audit?: (ctx: Ctx, args: any, data: any) => LogActivityInput; // eslint-disable-line @typescript-eslint/no-explicit-any -- see above
};

export type ValgateToolDef = ReadOrWriteDef | DestructiveDef;

// Write one audit row. Deliberately swallows its own errors: a failed audit must never roll back
// or mask a mutation that already succeeded (it is logged so we still notice). Shared by both
// adapters so a failed audit is handled identically everywhere.
export async function audit(ctx: Ctx, input: LogActivityInput): Promise<void> {
  try {
    await logActivity(ctx, input);
  } catch (err) {
    console.error("[valgate-tools] audit log failed (mutation already succeeded):", err);
  }
}

// ── small scoped counters for delete previews ──────────────────────────────
// Mirror what countPropertyCascade does for properties, but inline (a single scoped count)
// rather than as a service function — lifted from writes-rental.ts, same reasoning (D3): there is
// only this one caller.
async function countPaymentsForLease(ctx: Ctx, leaseId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(paymentsTable)
    .where(and(eq(paymentsTable.orgId, ctx.orgId), eq(paymentsTable.leaseId, leaseId)));
  return row?.n ?? 0;
}

async function countLeasesForTenant(ctx: Ctx, tenantId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(leasesTable)
    .where(and(eq(leasesTable.orgId, ctx.orgId), eq(leasesTable.tenantId, tenantId)));
  return row?.n ?? 0;
}

async function countPaymentsForTenant(ctx: Ctx, tenantId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(paymentsTable)
    .where(and(eq(paymentsTable.orgId, ctx.orgId), eq(paymentsTable.tenantId, tenantId)));
  return row?.n ?? 0;
}

export const VALGATE_TOOLS: ValgateToolDef[] = [
  // ── search_properties ────────────────────────────────────────────────────
  {
    kind: "read",
    name: "search_properties",
    description:
      "Find the properties in this Valgate workspace. Returns each property's id, address, status, and key fields.",
    input: z.object({}),
    run: async (ctx: Ctx) => {
      try {
        const properties = await listProperties(ctx);
        // Drop the internal owner id (userId) from each row — an internal handle the AI never
        // needs, so it's just noise in the tool output.
        const data = properties.map(({ userId: _userId, ...rest }) => rest);
        return { ok: true, data };
      } catch (err) {
        console.error("[valgate-tools] search_properties failed:", err);
        return { ok: false, message: "Could not load properties." };
      }
    },
  },

  // ── create_property ──────────────────────────────────────────────────────
  {
    kind: "write",
    name: "create_property",
    description:
      "Add a new property to a workspace. Requires the core property fields (name, type, status, coordinates, purchase value, area, title). Requires member access or higher.",
    input: z.object({
      property: NewPropertySchema.describe("The new property's fields, validated on the server."),
    }),
    run: async (ctx: Ctx, args: { property: z.infer<typeof NewPropertySchema> }) => {
      try {
        const created = await createProperty(ctx, args.property);
        return { ok: true, data: created };
      } catch (err) {
        console.error("[valgate-tools] create_property failed:", err);
        return { ok: false, message: "Could not create the property." };
      }
    },
    audit: (_ctx, _args, data) => ({
      entity: "property",
      action: "created",
      entityId: data.id,
      propertyId: data.id,
      summary: `Created property "${data.name}"`,
    }),
  },

  // ── update_property ──────────────────────────────────────────────────────
  {
    kind: "write",
    name: "update_property",
    description:
      "Change fields on an existing property. Only the fields you pass in `patch` are updated; everything else is left as-is. Requires member access or higher.",
    input: z.object({
      id: z.string().describe("The property id to update, e.g. PROP-0001."),
      patch: PropertyPatchSchema.describe(
        "The subset of property fields to change. Omitted fields are left unchanged.",
      ),
    }),
    run: async (ctx: Ctx, args: { id: string; patch: z.infer<typeof PropertyPatchSchema> }) => {
      try {
        const updated = await updateProperty(ctx, args.id, args.patch);
        if (!updated) {
          return { ok: false, message: `No property ${args.id} exists in this workspace.` };
        }
        return { ok: true, data: updated };
      } catch (err) {
        console.error("[valgate-tools] update_property failed:", err);
        return { ok: false, message: "Could not update the property." };
      }
    },
    audit: (_ctx, _args, data) => ({
      entity: "property",
      action: "updated",
      entityId: data.id,
      propertyId: data.id,
      summary: `Updated property ${data.id} ("${data.name}")`,
    }),
  },

  // ── delete_property ──────────────────────────────────────────────────────
  // Permanent, irreversible, admin-only (enforced in the service). preview() shows the blast
  // radius WITHOUT deleting anything; commit() actually deletes. The adapter decides when each
  // runs (MCP: confirm flag; in-app: preview becomes the proposedAction, commit runs on Approve).
  {
    kind: "destructive",
    name: "delete_property",
    description:
      "Permanently delete a property and ALL of its linked records (leases, payments, documents, …). Irreversible and admin-only.",
    input: z.object({
      id: z.string().describe("The property id to delete, e.g. PROP-0001."),
    }),
    preview: async (ctx: Ctx, args: { id: string }) => {
      try {
        const property = await getProperty(ctx, args.id);
        if (!property) {
          return { ok: false, message: `No property ${args.id} exists in this workspace.` };
        }
        const cascade = await countPropertyCascade(ctx, args.id);
        return {
          ok: true,
          data: {
            consequence: `Permanently delete property "${property.name}" and all of its linked records (${cascade.leases} lease(s), ${cascade.payments} payment(s), ${cascade.documents} document(s), and ${cascade.otherTotal} other record(s)). This cannot be undone.`,
            cascade,
          },
        };
      } catch (err) {
        console.error("[valgate-tools] delete_property preview failed:", err);
        return { ok: false, message: "Could not preview that delete." };
      }
    },
    commit: async (ctx: Ctx, args: { id: string }) => {
      try {
        const property = await getProperty(ctx, args.id);
        if (!property) {
          return { ok: false, message: `No property ${args.id} exists in this workspace.` };
        }
        await deleteProperty(ctx, args.id);
        return { ok: true, data: { deleted: args.id, name: property.name } };
      } catch (err) {
        console.error("[valgate-tools] delete_property failed:", err);
        return { ok: false, message: "Could not delete that property." };
      }
    },
    audit: (_ctx, args, data) => ({
      entity: "property",
      action: "deleted",
      entityId: args.id,
      summary: `Deleted property ${args.id} ("${data.name}") and all linked records`,
    }),
  },

  // ── record_maintenance ───────────────────────────────────────────────────
  {
    kind: "write",
    name: "record_maintenance",
    description:
      "Log a maintenance issue against a property (its severity, title, and status). Requires member access or higher.",
    input: z.object({
      item: NewMaintenanceItemSchema.describe(
        "The maintenance item: which property, severity, title, and status.",
      ),
    }),
    run: async (ctx: Ctx, args: { item: z.infer<typeof NewMaintenanceItemSchema> }) => {
      try {
        const created = await createMaintenanceItem(ctx, args.item);
        return { ok: true, data: created };
      } catch (err) {
        console.error("[valgate-tools] record_maintenance failed:", err);
        return { ok: false, message: "Could not record that maintenance item." };
      }
    },
    audit: (_ctx, _args, data) => ({
      entity: "maintenance",
      action: "created",
      entityId: data.id,
      propertyId: data.propertyId,
      summary: `Logged maintenance "${data.title}"`,
    }),
  },

  // ── create_lease ─────────────────────────────────────────────────────────
  {
    kind: "write",
    name: "create_lease",
    description:
      "Create a lease on a property (unit, stage, start/end dates, monthly rent, term). Optionally link an existing tenant. Requires member access or higher.",
    input: z.object({
      lease: NewLeaseSchema.describe("The new lease's fields, validated on the server."),
    }),
    run: async (ctx: Ctx, args: { lease: z.infer<typeof NewLeaseSchema> }) => {
      try {
        const created = await createLease(ctx, args.lease);
        return { ok: true, data: created };
      } catch (err) {
        console.error("[valgate-tools] create_lease failed:", err);
        return { ok: false, message: "Could not create the lease." };
      }
    },
    audit: (_ctx, _args, data) => ({
      entity: "lease",
      action: "created",
      entityId: data.id,
      propertyId: data.propertyId,
      summary: `Created lease ${data.id} on property ${data.propertyId}`,
    }),
  },

  // ── update_lease ─────────────────────────────────────────────────────────
  {
    kind: "write",
    name: "update_lease",
    description:
      "Change fields on an existing lease. Only the fields you pass in `patch` are updated; everything else is left as-is. Requires member access or higher.",
    input: z.object({
      id: z.string().describe("The lease id to update, e.g. LEASE-0001."),
      patch: LeasePatchSchema.describe(
        "The subset of lease fields to change. Omitted fields are left unchanged.",
      ),
    }),
    run: async (ctx: Ctx, args: { id: string; patch: z.infer<typeof LeasePatchSchema> }) => {
      try {
        const updated = await updateLease(ctx, args.id, args.patch);
        if (!updated) {
          return { ok: false, message: `No lease ${args.id} exists in this workspace.` };
        }
        return { ok: true, data: updated };
      } catch (err) {
        console.error("[valgate-tools] update_lease failed:", err);
        return { ok: false, message: "Could not update the lease." };
      }
    },
    audit: (_ctx, _args, data) => ({
      entity: "lease",
      action: "updated",
      entityId: data.id,
      propertyId: data.propertyId,
      summary: `Updated lease ${data.id}`,
    }),
  },

  // ── delete_lease ─────────────────────────────────────────────────────────
  // CASCADE: deleting a lease also permanently deletes its payments.
  {
    kind: "destructive",
    name: "delete_lease",
    description:
      "Permanently delete a lease. Its payments are deleted with it (cascade). Requires member access or higher.",
    input: z.object({
      id: z.string().describe("The lease id to delete, e.g. LEASE-0001."),
    }),
    preview: async (ctx: Ctx, args: { id: string }) => {
      try {
        const lease = await getLease(ctx, args.id);
        if (!lease) {
          return { ok: false, message: `No lease ${args.id} exists in this workspace.` };
        }
        const payments = await countPaymentsForLease(ctx, args.id);
        return {
          ok: true,
          data: {
            consequence: `Permanently delete lease ${lease.id} (unit ${lease.unit}) and its ${payments} payment(s). This cannot be undone.`,
            cascade: { payments },
          },
        };
      } catch (err) {
        console.error("[valgate-tools] delete_lease preview failed:", err);
        return { ok: false, message: "Could not preview that delete." };
      }
    },
    commit: async (ctx: Ctx, args: { id: string }) => {
      try {
        const lease = await getLease(ctx, args.id);
        if (!lease) {
          return { ok: false, message: `No lease ${args.id} exists in this workspace.` };
        }
        const payments = await countPaymentsForLease(ctx, args.id);
        await deleteLease(ctx, args.id);
        return {
          ok: true,
          data: { deleted: args.id, deletedPayments: payments, propertyId: lease.propertyId },
        };
      } catch (err) {
        console.error("[valgate-tools] delete_lease failed:", err);
        return { ok: false, message: "Could not delete that lease." };
      }
    },
    audit: (_ctx, args, data) => ({
      entity: "lease",
      action: "deleted",
      entityId: args.id,
      propertyId: data.propertyId,
      summary: `Deleted lease ${args.id} and its ${data.deletedPayments} payment(s)`,
    }),
  },

  // ── create_tenant ────────────────────────────────────────────────────────
  {
    kind: "write",
    name: "create_tenant",
    description:
      "Add a tenant to a property (name, unit, rent, status; optional email/phone). Requires member access or higher.",
    input: z.object({
      tenant: NewTenantSchema.describe("The new tenant's fields, validated on the server."),
    }),
    run: async (ctx: Ctx, args: { tenant: z.infer<typeof NewTenantSchema> }) => {
      try {
        const created = await createTenant(ctx, args.tenant);
        return { ok: true, data: created };
      } catch (err) {
        console.error("[valgate-tools] create_tenant failed:", err);
        return { ok: false, message: "Could not create the tenant." };
      }
    },
    audit: (_ctx, _args, data) => ({
      entity: "tenant",
      action: "created",
      entityId: data.id,
      propertyId: data.propertyId,
      summary: `Created tenant "${data.name}" on property ${data.propertyId}`,
    }),
  },

  // ── update_tenant ────────────────────────────────────────────────────────
  {
    kind: "write",
    name: "update_tenant",
    description:
      "Change fields on an existing tenant. Only the fields you pass in `patch` are updated; everything else is left as-is. Requires member access or higher.",
    input: z.object({
      id: z.string().describe("The tenant id to update, e.g. TEN-0001."),
      patch: TenantPatchSchema.describe(
        "The subset of tenant fields to change. Omitted fields are left unchanged.",
      ),
    }),
    run: async (ctx: Ctx, args: { id: string; patch: z.infer<typeof TenantPatchSchema> }) => {
      try {
        const updated = await updateTenant(ctx, args.id, args.patch);
        if (!updated) {
          return { ok: false, message: `No tenant ${args.id} exists in this workspace.` };
        }
        return { ok: true, data: updated };
      } catch (err) {
        console.error("[valgate-tools] update_tenant failed:", err);
        return { ok: false, message: "Could not update the tenant." };
      }
    },
    audit: (_ctx, _args, data) => ({
      entity: "tenant",
      action: "updated",
      entityId: data.id,
      propertyId: data.propertyId,
      summary: `Updated tenant ${data.id} ("${data.name}")`,
    }),
  },

  // ── delete_tenant ────────────────────────────────────────────────────────
  // RESTRICT: a tenant referenced by any lease or payment CANNOT be deleted (the FK has no
  // cascade). preview() surfaces those references; commit() refuses with a clear message if any
  // still exist, instead of surfacing a raw DB FK error.
  {
    kind: "destructive",
    name: "delete_tenant",
    description:
      "Permanently delete a tenant. A tenant that is still referenced by any lease or payment cannot be deleted until those are reassigned or removed. Requires member access or higher.",
    input: z.object({
      id: z.string().describe("The tenant id to delete, e.g. TEN-0001."),
    }),
    preview: async (ctx: Ctx, args: { id: string }) => {
      try {
        const tenant = await getTenant(ctx, args.id);
        if (!tenant) {
          return { ok: false, message: `No tenant ${args.id} exists in this workspace.` };
        }
        const leaseRefs = await countLeasesForTenant(ctx, args.id);
        const paymentRefs = await countPaymentsForTenant(ctx, args.id);
        const blocked = leaseRefs + paymentRefs > 0;
        return {
          ok: true,
          data: {
            consequence: blocked
              ? `Cannot delete tenant "${tenant.name}": still referenced by ${leaseRefs} lease(s) and ${paymentRefs} payment(s). Reassign or delete those first.`
              : `Permanently delete tenant "${tenant.name}". No leases or payments reference this tenant. This cannot be undone.`,
            cascade: { leases: leaseRefs, payments: paymentRefs, blocked },
          },
        };
      } catch (err) {
        console.error("[valgate-tools] delete_tenant preview failed:", err);
        return { ok: false, message: "Could not preview that delete." };
      }
    },
    commit: async (ctx: Ctx, args: { id: string }) => {
      try {
        const tenant = await getTenant(ctx, args.id);
        if (!tenant) {
          return { ok: false, message: `No tenant ${args.id} exists in this workspace.` };
        }
        const leaseRefs = await countLeasesForTenant(ctx, args.id);
        const paymentRefs = await countPaymentsForTenant(ctx, args.id);
        if (leaseRefs + paymentRefs > 0) {
          return {
            ok: false,
            message: `Cannot delete tenant ${args.id}: still referenced by ${leaseRefs} lease(s) and ${paymentRefs} payment(s). Reassign or delete those first.`,
          };
        }
        await deleteTenant(ctx, args.id);
        return { ok: true, data: { deleted: args.id, name: tenant.name, propertyId: tenant.propertyId } };
      } catch (err) {
        console.error("[valgate-tools] delete_tenant failed:", err);
        return { ok: false, message: "Could not delete that tenant." };
      }
    },
    audit: (_ctx, args, data) => ({
      entity: "tenant",
      action: "deleted",
      entityId: args.id,
      propertyId: data.propertyId,
      summary: `Deleted tenant ${args.id} ("${data.name}")`,
    }),
  },

  // ── record_payment ───────────────────────────────────────────────────────
  {
    kind: "write",
    name: "record_payment",
    description:
      "Record a payment (rent, fee, deposit, or refund) with its date, amount, method, and status. Optionally link it to a lease. Requires member access or higher.",
    input: z.object({
      payment: NewPaymentSchema.describe("The payment's fields, validated on the server."),
    }),
    run: async (ctx: Ctx, args: { payment: z.infer<typeof NewPaymentSchema> }) => {
      try {
        const created = await createPayment(ctx, args.payment);
        return { ok: true, data: created };
      } catch (err) {
        console.error("[valgate-tools] record_payment failed:", err);
        return { ok: false, message: "Could not record the payment." };
      }
    },
    audit: (_ctx, _args, data) => ({
      entity: "payment",
      action: "created",
      entityId: data.id,
      summary: `Recorded ${data.kind} payment ${data.id}${data.leaseId ? ` on lease ${data.leaseId}` : ""}`,
    }),
  },

  // ── update_payment ───────────────────────────────────────────────────────
  {
    kind: "write",
    name: "update_payment",
    description:
      "Change fields on an existing payment. Only the fields you pass in `patch` are updated; everything else is left as-is. Requires member access or higher.",
    input: z.object({
      id: z.string().describe("The payment id to update, e.g. PMT-0001."),
      patch: PaymentPatchSchema.describe(
        "The subset of payment fields to change. Omitted fields are left unchanged.",
      ),
    }),
    run: async (ctx: Ctx, args: { id: string; patch: z.infer<typeof PaymentPatchSchema> }) => {
      try {
        const updated = await updatePayment(ctx, args.id, args.patch);
        if (!updated) {
          return { ok: false, message: `No payment ${args.id} exists in this workspace.` };
        }
        return { ok: true, data: updated };
      } catch (err) {
        console.error("[valgate-tools] update_payment failed:", err);
        return { ok: false, message: "Could not update the payment." };
      }
    },
    audit: (_ctx, _args, data) => ({
      entity: "payment",
      action: "updated",
      entityId: data.id,
      summary: `Updated payment ${data.id}`,
    }),
  },

  // ── delete_payment ───────────────────────────────────────────────────────
  // A payment is a leaf (nothing references it), so there is no cascade to preview.
  {
    kind: "destructive",
    name: "delete_payment",
    description: "Permanently delete a payment. Requires member access or higher.",
    input: z.object({
      id: z.string().describe("The payment id to delete, e.g. PMT-0001."),
    }),
    preview: async (ctx: Ctx, args: { id: string }) => {
      try {
        const payment = await getPayment(ctx, args.id);
        if (!payment) {
          return { ok: false, message: `No payment ${args.id} exists in this workspace.` };
        }
        return {
          ok: true,
          data: {
            consequence: `Permanently delete the ${payment.kind} payment ${args.id} (${payment.amount}). This cannot be undone.`,
            cascade: null,
          },
        };
      } catch (err) {
        console.error("[valgate-tools] delete_payment preview failed:", err);
        return { ok: false, message: "Could not preview that delete." };
      }
    },
    commit: async (ctx: Ctx, args: { id: string }) => {
      try {
        const payment = await getPayment(ctx, args.id);
        if (!payment) {
          return { ok: false, message: `No payment ${args.id} exists in this workspace.` };
        }
        await deletePayment(ctx, args.id);
        return { ok: true, data: { deleted: args.id, kind: payment.kind } };
      } catch (err) {
        console.error("[valgate-tools] delete_payment failed:", err);
        return { ok: false, message: "Could not delete that payment." };
      }
    },
    audit: (_ctx, args, data) => ({
      entity: "payment",
      action: "deleted",
      entityId: args.id,
      summary: `Deleted ${data.kind} payment ${args.id}`,
    }),
  },
];
