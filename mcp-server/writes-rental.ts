// Phase 6 — rental-core write tools (leases, tenants, payments).
//
// A sibling of writes.ts, kept separate only because writes.ts + these 9 tools would cross the
// ~500-line readability line (design decision D2). Every design law from writes.ts still holds and
// the shared helpers are imported from it, NOT duplicated:
//   - Tools are THIN wrappers over lib/services/{leases,tenants,payments} — no new business logic.
//   - Inputs validate with the SAME Zod schemas the website uses (NewLeaseSchema, …).
//   - Authorization is NOT re-implemented: the service layer enforces org-scope, role
//     (requireMember), and demo read-only (assertCanMutate) on its own.
//   - Never leak err.message — log internally, return a generic string.
//   - Every write is AUDITED via audit()/logActivity.
//   - Writes resolve their Ctx with requireExplicitOrg=true (resolveWriteCtx), so a multi-org
//     caller must name the org.
//   - Destructive deletes are gated behind confirm + a blast-radius preview.
//
// Delete safety differs per entity because of the real FK rules (verified against lib/db/schema):
//   - payments.lease_id = ON DELETE CASCADE → deleting a lease ALSO deletes its payments; the
//     preview counts them.
//   - leases.tenant_id / payments.tenant_id = no ON DELETE = RESTRICT → deleting a referenced
//     tenant would error at the DB; we count the references and refuse with a clear message first.
//   - a payment is a leaf → a plain confirm gate, no cascade.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { leases as leasesTable, payments as paymentsTable } from "@/lib/db/schema";
import { NewLeaseSchema, LeasePatchSchema } from "@/lib/data/types/lease";
import { NewTenantSchema, TenantPatchSchema } from "@/lib/data/types/tenant";
import { NewPaymentSchema, PaymentPatchSchema } from "@/lib/data/types/payment";
import { createLease, updateLease, deleteLease, getLease } from "@/lib/services/leases";
import { createTenant, updateTenant, deleteTenant, getTenant } from "@/lib/services/tenants";
import { createPayment, updatePayment, deletePayment, getPayment } from "@/lib/services/payments";
import type { Ctx } from "@/lib/services/_mapping";
import type { GetCtx } from "./register";
import { orgIdArg, resolveWriteCtx, audit, toolOk, toolError } from "./writes";

// ── small scoped counters for delete previews ────────────────────────────────
// These mirror what countPropertyCascade does for properties, but inline (a single scoped count)
// rather than as a service function — there is only this one caller (design decision D3).
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

export function registerRentalWriteTools(server: McpServer, getCtx: GetCtx): void {
  // ── create_lease ─────────────────────────────────────────────────────────
  server.registerTool(
    "create_lease",
    {
      title: "Create lease",
      description:
        "Create a lease on a property (unit, stage, start/end dates, monthly rent, term). Optionally link an existing tenant. Requires member access or higher.",
      inputSchema: z.object({
        orgId: orgIdArg,
        lease: NewLeaseSchema.describe("The new lease's fields, validated on the server."),
      }),
    },
    async (args, extra) => {
      const resolved = await resolveWriteCtx(getCtx, extra, args.orgId, "create the lease");
      if ("error" in resolved) {
        return resolved.error;
      }
      try {
        const created = await createLease(resolved.ctx, args.lease);
        await audit(resolved.ctx, {
          entity: "lease",
          action: "created",
          entityId: created.id,
          propertyId: created.propertyId,
          summary: `Created lease ${created.id} on property ${created.propertyId} via MCP`,
        });
        return toolOk(created);
      } catch (err) {
        console.error("[valgate-mcp] create_lease failed:", err);
        return toolError("Could not create the lease.");
      }
    },
  );

  // ── update_lease ─────────────────────────────────────────────────────────
  server.registerTool(
    "update_lease",
    {
      title: "Update lease",
      description:
        "Change fields on an existing lease. Only the fields you pass in `patch` are updated; everything else is left as-is. Requires member access or higher.",
      inputSchema: z.object({
        orgId: orgIdArg,
        id: z.string().describe("The lease id to update, e.g. LEASE-0001."),
        patch: LeasePatchSchema.describe(
          "The subset of lease fields to change. Omitted fields are left unchanged.",
        ),
      }),
    },
    async (args, extra) => {
      const resolved = await resolveWriteCtx(getCtx, extra, args.orgId, "update the lease");
      if ("error" in resolved) {
        return resolved.error;
      }
      try {
        const updated = await updateLease(resolved.ctx, args.id, args.patch);
        if (!updated) {
          return toolError(`No lease ${args.id} exists in this workspace.`);
        }
        await audit(resolved.ctx, {
          entity: "lease",
          action: "updated",
          entityId: updated.id,
          propertyId: updated.propertyId,
          summary: `Updated lease ${updated.id} via MCP`,
        });
        return toolOk(updated);
      } catch (err) {
        console.error("[valgate-mcp] update_lease failed:", err);
        return toolError("Could not update the lease.");
      }
    },
  );

  // ── delete_lease ─────────────────────────────────────────────────────────
  // CASCADE: deleting a lease also permanently deletes its payments. Confirm gate + a preview
  // that counts those payments.
  server.registerTool(
    "delete_lease",
    {
      title: "Delete lease",
      description:
        "Permanently delete a lease. Its payments are deleted with it (cascade). Call with confirm: false first to see how many payments would be removed; call again with confirm: true to actually delete. Requires member access or higher.",
      inputSchema: z.object({
        orgId: orgIdArg,
        id: z.string().describe("The lease id to delete, e.g. LEASE-0001."),
        confirm: z
          .boolean()
          .optional()
          .describe(
            "Must be true to actually delete. When false or omitted, nothing is deleted and a preview of what WOULD be destroyed is returned instead.",
          ),
      }),
    },
    async (args, extra) => {
      const resolved = await resolveWriteCtx(getCtx, extra, args.orgId, "delete the lease");
      if ("error" in resolved) {
        return resolved.error;
      }
      try {
        const lease = await getLease(resolved.ctx, args.id);
        if (!lease) {
          return toolError(`No lease ${args.id} exists in this workspace.`);
        }
        const payments = await countPaymentsForLease(resolved.ctx, args.id);

        // Gate: no explicit confirmation → show the blast radius, delete nothing.
        if (args.confirm !== true) {
          return toolOk({
            lease: { id: lease.id, unit: lease.unit },
            cascade: { payments },
            confirmRequired: true,
            note: `Nothing was deleted. Deleting this lease will also permanently delete its ${payments} payment(s). Re-call delete_lease with confirm: true to proceed.`,
          });
        }

        await deleteLease(resolved.ctx, args.id);
        await audit(resolved.ctx, {
          entity: "lease",
          action: "deleted",
          entityId: args.id,
          propertyId: lease.propertyId,
          summary: `Deleted lease ${args.id} and its ${payments} payment(s) via MCP`,
        });
        return toolOk({ deleted: args.id, deletedPayments: payments });
      } catch (err) {
        console.error("[valgate-mcp] delete_lease failed:", err);
        return toolError("Could not delete that lease.");
      }
    },
  );

  // ── create_tenant ────────────────────────────────────────────────────────
  server.registerTool(
    "create_tenant",
    {
      title: "Create tenant",
      description:
        "Add a tenant to a property (name, unit, rent, status; optional email/phone). Requires member access or higher.",
      inputSchema: z.object({
        orgId: orgIdArg,
        tenant: NewTenantSchema.describe("The new tenant's fields, validated on the server."),
      }),
    },
    async (args, extra) => {
      const resolved = await resolveWriteCtx(getCtx, extra, args.orgId, "create the tenant");
      if ("error" in resolved) {
        return resolved.error;
      }
      try {
        const created = await createTenant(resolved.ctx, args.tenant);
        await audit(resolved.ctx, {
          entity: "tenant",
          action: "created",
          entityId: created.id,
          propertyId: created.propertyId,
          summary: `Created tenant "${created.name}" on property ${created.propertyId} via MCP`,
        });
        return toolOk(created);
      } catch (err) {
        console.error("[valgate-mcp] create_tenant failed:", err);
        return toolError("Could not create the tenant.");
      }
    },
  );

  // ── update_tenant ────────────────────────────────────────────────────────
  server.registerTool(
    "update_tenant",
    {
      title: "Update tenant",
      description:
        "Change fields on an existing tenant. Only the fields you pass in `patch` are updated; everything else is left as-is. Requires member access or higher.",
      inputSchema: z.object({
        orgId: orgIdArg,
        id: z.string().describe("The tenant id to update, e.g. TEN-0001."),
        patch: TenantPatchSchema.describe(
          "The subset of tenant fields to change. Omitted fields are left unchanged.",
        ),
      }),
    },
    async (args, extra) => {
      const resolved = await resolveWriteCtx(getCtx, extra, args.orgId, "update the tenant");
      if ("error" in resolved) {
        return resolved.error;
      }
      try {
        const updated = await updateTenant(resolved.ctx, args.id, args.patch);
        if (!updated) {
          return toolError(`No tenant ${args.id} exists in this workspace.`);
        }
        await audit(resolved.ctx, {
          entity: "tenant",
          action: "updated",
          entityId: updated.id,
          propertyId: updated.propertyId,
          summary: `Updated tenant ${updated.id} ("${updated.name}") via MCP`,
        });
        return toolOk(updated);
      } catch (err) {
        console.error("[valgate-mcp] update_tenant failed:", err);
        return toolError("Could not update the tenant.");
      }
    },
  );

  // ── delete_tenant ────────────────────────────────────────────────────────
  // RESTRICT: a tenant referenced by any lease or payment CANNOT be deleted (the FK has no
  // cascade). So the preview counts those references, and a confirmed delete is refused up front
  // with a clear message when references still exist — instead of surfacing a raw DB FK error.
  server.registerTool(
    "delete_tenant",
    {
      title: "Delete tenant",
      description:
        "Permanently delete a tenant. A tenant that is still referenced by any lease or payment cannot be deleted until those are reassigned or removed. Call with confirm: false first to see the references; call again with confirm: true to delete. Requires member access or higher.",
      inputSchema: z.object({
        orgId: orgIdArg,
        id: z.string().describe("The tenant id to delete, e.g. TEN-0001."),
        confirm: z
          .boolean()
          .optional()
          .describe(
            "Must be true to actually delete. When false or omitted, nothing is deleted and the tenant's references are returned instead.",
          ),
      }),
    },
    async (args, extra) => {
      const resolved = await resolveWriteCtx(getCtx, extra, args.orgId, "delete the tenant");
      if ("error" in resolved) {
        return resolved.error;
      }
      try {
        const tenant = await getTenant(resolved.ctx, args.id);
        if (!tenant) {
          return toolError(`No tenant ${args.id} exists in this workspace.`);
        }
        const leaseRefs = await countLeasesForTenant(resolved.ctx, args.id);
        const paymentRefs = await countPaymentsForTenant(resolved.ctx, args.id);

        // Gate: no explicit confirmation → show the references, delete nothing.
        if (args.confirm !== true) {
          return toolOk({
            tenant: { id: tenant.id, name: tenant.name },
            references: { leases: leaseRefs, payments: paymentRefs },
            confirmRequired: true,
            note:
              leaseRefs + paymentRefs > 0
                ? `Nothing was deleted. This tenant is still referenced by ${leaseRefs} lease(s) and ${paymentRefs} payment(s); the delete will be refused until those are reassigned or removed.`
                : "Nothing was deleted. This tenant has no references and can be deleted. Re-call delete_tenant with confirm: true to proceed.",
          });
        }

        // Confirmed, but RESTRICT means we must refuse if anything still points at the tenant.
        if (leaseRefs + paymentRefs > 0) {
          return toolError(
            `Cannot delete tenant ${args.id}: still referenced by ${leaseRefs} lease(s) and ${paymentRefs} payment(s). Reassign or delete those first.`,
          );
        }

        await deleteTenant(resolved.ctx, args.id);
        await audit(resolved.ctx, {
          entity: "tenant",
          action: "deleted",
          entityId: args.id,
          propertyId: tenant.propertyId,
          summary: `Deleted tenant ${args.id} ("${tenant.name}") via MCP`,
        });
        return toolOk({ deleted: args.id, name: tenant.name });
      } catch (err) {
        console.error("[valgate-mcp] delete_tenant failed:", err);
        return toolError("Could not delete that tenant.");
      }
    },
  );

  // ── record_payment ───────────────────────────────────────────────────────
  // Outcome-shaped create (named like record_maintenance, per design decision D4).
  server.registerTool(
    "record_payment",
    {
      title: "Record payment",
      description:
        "Record a payment (rent, fee, deposit, or refund) with its date, amount, method, and status. Optionally link it to a lease. Requires member access or higher.",
      inputSchema: z.object({
        orgId: orgIdArg,
        payment: NewPaymentSchema.describe("The payment's fields, validated on the server."),
      }),
    },
    async (args, extra) => {
      const resolved = await resolveWriteCtx(getCtx, extra, args.orgId, "record the payment");
      if ("error" in resolved) {
        return resolved.error;
      }
      try {
        const created = await createPayment(resolved.ctx, args.payment);
        await audit(resolved.ctx, {
          entity: "payment",
          action: "created",
          entityId: created.id,
          summary: `Recorded ${created.kind} payment ${created.id}${created.leaseId ? ` on lease ${created.leaseId}` : ""} via MCP`,
        });
        return toolOk(created);
      } catch (err) {
        console.error("[valgate-mcp] record_payment failed:", err);
        return toolError("Could not record the payment.");
      }
    },
  );

  // ── update_payment ───────────────────────────────────────────────────────
  server.registerTool(
    "update_payment",
    {
      title: "Update payment",
      description:
        "Change fields on an existing payment. Only the fields you pass in `patch` are updated; everything else is left as-is. Requires member access or higher.",
      inputSchema: z.object({
        orgId: orgIdArg,
        id: z.string().describe("The payment id to update, e.g. PMT-0001."),
        patch: PaymentPatchSchema.describe(
          "The subset of payment fields to change. Omitted fields are left unchanged.",
        ),
      }),
    },
    async (args, extra) => {
      const resolved = await resolveWriteCtx(getCtx, extra, args.orgId, "update the payment");
      if ("error" in resolved) {
        return resolved.error;
      }
      try {
        const updated = await updatePayment(resolved.ctx, args.id, args.patch);
        if (!updated) {
          return toolError(`No payment ${args.id} exists in this workspace.`);
        }
        await audit(resolved.ctx, {
          entity: "payment",
          action: "updated",
          entityId: updated.id,
          summary: `Updated payment ${updated.id} via MCP`,
        });
        return toolOk(updated);
      } catch (err) {
        console.error("[valgate-mcp] update_payment failed:", err);
        return toolError("Could not update the payment.");
      }
    },
  );

  // ── delete_payment ───────────────────────────────────────────────────────
  // A payment is a leaf (nothing references it), so the confirm gate has no cascade to preview —
  // the false branch just echoes the payment that would be removed.
  server.registerTool(
    "delete_payment",
    {
      title: "Delete payment",
      description:
        "Permanently delete a payment. Call with confirm: false first to see the payment; call again with confirm: true to actually delete. Requires member access or higher.",
      inputSchema: z.object({
        orgId: orgIdArg,
        id: z.string().describe("The payment id to delete, e.g. PMT-0001."),
        confirm: z
          .boolean()
          .optional()
          .describe(
            "Must be true to actually delete. When false or omitted, nothing is deleted and the payment is returned instead.",
          ),
      }),
    },
    async (args, extra) => {
      const resolved = await resolveWriteCtx(getCtx, extra, args.orgId, "delete the payment");
      if ("error" in resolved) {
        return resolved.error;
      }
      try {
        const payment = await getPayment(resolved.ctx, args.id);
        if (!payment) {
          return toolError(`No payment ${args.id} exists in this workspace.`);
        }

        if (args.confirm !== true) {
          return toolOk({
            payment: { id: payment.id, kind: payment.kind, amount: payment.amount },
            confirmRequired: true,
            note: "Nothing was deleted. This is permanent. Re-call delete_payment with confirm: true to proceed.",
          });
        }

        await deletePayment(resolved.ctx, args.id);
        await audit(resolved.ctx, {
          entity: "payment",
          action: "deleted",
          entityId: args.id,
          summary: `Deleted ${payment.kind} payment ${args.id} via MCP`,
        });
        return toolOk({ deleted: args.id });
      } catch (err) {
        console.error("[valgate-mcp] delete_payment failed:", err);
        return toolError("Could not delete that payment.");
      }
    },
  );
}
