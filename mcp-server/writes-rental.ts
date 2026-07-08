// Phase 6 — rental-core write tools (leases, tenants, payments).
//
// A sibling of writes.ts, kept separate only because writes.ts + these 9 tools would cross the
// ~500-line readability line (design decision D2). Every design law from writes.ts still holds and
// the shared helpers are imported from it, NOT duplicated:
//   - Tools are THIN wrappers over the shared VALGATE_TOOLS registry in tool-defs.ts.
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
//     tenant would error at the DB; countRefs checks and refuses with a clear message first.
//   - a payment is a leaf → a plain confirm gate, no cascade.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { NewLeaseSchema, LeasePatchSchema } from "@/lib/data/types/lease";
import { NewTenantSchema, TenantPatchSchema } from "@/lib/data/types/tenant";
import { NewPaymentSchema, PaymentPatchSchema } from "@/lib/data/types/payment";
import type { GetCtx } from "./register";
import { orgIdArg, resolveWriteCtx, audit, toolOk, toolError } from "./writes";
import { VALGATE_TOOLS, type ReadOrWriteDef, type DestructiveDef } from "./tool-defs";

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
      if ("error" in resolved) return resolved.error;
      const def = VALGATE_TOOLS.find((d) => d.name === "create_lease")! as ReadOrWriteDef;
      const result = await def.run(resolved.ctx, { lease: args.lease });
      if (!result.ok) return toolError(result.message);
      if (def.audit) {
        const entry = def.audit(resolved.ctx, { lease: args.lease }, result.data);
        await audit(resolved.ctx, { ...entry, summary: `${entry.summary} via MCP` });
      }
      return toolOk(result.data);
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
      if ("error" in resolved) return resolved.error;
      const def = VALGATE_TOOLS.find((d) => d.name === "update_lease")! as ReadOrWriteDef;
      const result = await def.run(resolved.ctx, { id: args.id, patch: args.patch });
      if (!result.ok) return toolError(result.message);
      if (def.audit) {
        const entry = def.audit(resolved.ctx, { id: args.id, patch: args.patch }, result.data);
        await audit(resolved.ctx, { ...entry, summary: `${entry.summary} via MCP` });
      }
      return toolOk(result.data);
    },
  );

  // ── delete_lease ─────────────────────────────────────────────────────────
  // CASCADE: deleting a lease also permanently deletes its payments. Confirm gate + a preview
  // that counts those payments. Delegates to VALGATE_TOOLS per design.md Decision 3.
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
      if ("error" in resolved) return resolved.error;
      const def = VALGATE_TOOLS.find((d) => d.name === "delete_lease")! as DestructiveDef;
      const preview = await def.preview(resolved.ctx, { id: args.id });
      if (!preview.ok) return toolError(preview.message);

      if (args.confirm !== true) {
        return toolOk({
          ...preview.data,
          confirmRequired: true,
          note: `Nothing was deleted. Re-call ${def.name} with confirm: true to proceed.`,
        });
      }

      const result = await def.commit(resolved.ctx, { id: args.id });
      if (!result.ok) return toolError(result.message);
      if (def.audit) {
        const entry = def.audit(resolved.ctx, { id: args.id }, result.data);
        await audit(resolved.ctx, { ...entry, summary: `${entry.summary} via MCP` });
      }
      return toolOk(result.data);
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
      if ("error" in resolved) return resolved.error;
      const def = VALGATE_TOOLS.find((d) => d.name === "create_tenant")! as ReadOrWriteDef;
      const result = await def.run(resolved.ctx, { tenant: args.tenant });
      if (!result.ok) return toolError(result.message);
      if (def.audit) {
        const entry = def.audit(resolved.ctx, { tenant: args.tenant }, result.data);
        await audit(resolved.ctx, { ...entry, summary: `${entry.summary} via MCP` });
      }
      return toolOk(result.data);
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
      if ("error" in resolved) return resolved.error;
      const def = VALGATE_TOOLS.find((d) => d.name === "update_tenant")! as ReadOrWriteDef;
      const result = await def.run(resolved.ctx, { id: args.id, patch: args.patch });
      if (!result.ok) return toolError(result.message);
      if (def.audit) {
        const entry = def.audit(resolved.ctx, { id: args.id, patch: args.patch }, result.data);
        await audit(resolved.ctx, { ...entry, summary: `${entry.summary} via MCP` });
      }
      return toolOk(result.data);
    },
  );

  // ── delete_tenant ────────────────────────────────────────────────────────
  // RESTRICT: a tenant referenced by any lease or payment CANNOT be deleted (the FK has no
  // cascade). VALGATE_TOOLS.delete_tenant.preview counts references; its commit refuses with a
  // clear message if any still exist.
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
      if ("error" in resolved) return resolved.error;
      const def = VALGATE_TOOLS.find((d) => d.name === "delete_tenant")! as DestructiveDef;
      const preview = await def.preview(resolved.ctx, { id: args.id });
      if (!preview.ok) return toolError(preview.message);

      if (args.confirm !== true) {
        return toolOk({
          ...preview.data,
          confirmRequired: true,
          note: `Nothing was deleted. Re-call ${def.name} with confirm: true to proceed.`,
        });
      }

      const result = await def.commit(resolved.ctx, { id: args.id });
      if (!result.ok) return toolError(result.message);
      if (def.audit) {
        const entry = def.audit(resolved.ctx, { id: args.id }, result.data);
        await audit(resolved.ctx, { ...entry, summary: `${entry.summary} via MCP` });
      }
      return toolOk(result.data);
    },
  );

  // ── record_payment ───────────────────────────────────────────────────────
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
      if ("error" in resolved) return resolved.error;
      const def = VALGATE_TOOLS.find((d) => d.name === "record_payment")! as ReadOrWriteDef;
      const result = await def.run(resolved.ctx, { payment: args.payment });
      if (!result.ok) return toolError(result.message);
      if (def.audit) {
        const entry = def.audit(resolved.ctx, { payment: args.payment }, result.data);
        await audit(resolved.ctx, { ...entry, summary: `${entry.summary} via MCP` });
      }
      return toolOk(result.data);
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
      if ("error" in resolved) return resolved.error;
      const def = VALGATE_TOOLS.find((d) => d.name === "update_payment")! as ReadOrWriteDef;
      const result = await def.run(resolved.ctx, { id: args.id, patch: args.patch });
      if (!result.ok) return toolError(result.message);
      if (def.audit) {
        const entry = def.audit(resolved.ctx, { id: args.id, patch: args.patch }, result.data);
        await audit(resolved.ctx, { ...entry, summary: `${entry.summary} via MCP` });
      }
      return toolOk(result.data);
    },
  );

  // ── delete_payment ───────────────────────────────────────────────────────
  // A payment is a leaf (nothing references it), so the confirm gate has no cascade to preview.
  // Delegates to VALGATE_TOOLS per design.md Decision 3.
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
      if ("error" in resolved) return resolved.error;
      const def = VALGATE_TOOLS.find((d) => d.name === "delete_payment")! as DestructiveDef;
      const preview = await def.preview(resolved.ctx, { id: args.id });
      if (!preview.ok) return toolError(preview.message);

      if (args.confirm !== true) {
        return toolOk({
          ...preview.data,
          confirmRequired: true,
          note: `Nothing was deleted. Re-call ${def.name} with confirm: true to proceed.`,
        });
      }

      const result = await def.commit(resolved.ctx, { id: args.id });
      if (!result.ok) return toolError(result.message);
      if (def.audit) {
        const entry = def.audit(resolved.ctx, { id: args.id }, result.data);
        await audit(resolved.ctx, { ...entry, summary: `${entry.summary} via MCP` });
      }
      return toolOk(result.data);
    },
  );
}
