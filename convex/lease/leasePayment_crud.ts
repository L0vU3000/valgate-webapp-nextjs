import { v } from "convex/values";
import { mutationWithRLS, queryWithRLS } from "../rls";

const paymentKindV = v.union(
  v.literal("scheduled"),
  v.literal("posted"),
  v.literal("reversal"),
  v.literal("adjustment"),
  v.literal("fee"),
);

const paymentStatusV = v.union(
  v.literal("open"),
  v.literal("settled"),
  v.literal("void"),
);

const paymentMethodV = v.union(
  v.literal("aba"),
  v.literal("cash"),
  v.literal("bank"),
  v.literal("wallet"),
  v.literal("other"),
);

const leasePaymentInputValidator = v.object({
  leaseId: v.id("lease"),
  partyId: v.optional(v.id("party")),
  kind: paymentKindV,
  status: paymentStatusV,
  period: v.string(),
  dueDate: v.optional(v.string()),
  valueDate: v.optional(v.string()),
  paymentDate: v.optional(v.string()),
  amount: v.number(),
  currency: v.string(),
  method: paymentMethodV,
  methodRef: v.optional(v.string()),
  linkedPaymentId: v.optional(v.id("lease_payment")),
  evidenceFileId: v.optional(v.id("document")),
  notes: v.optional(v.string()),
});

const leasePaymentPatchValidator = v.object({
  partyId: v.optional(v.union(v.id("party"), v.null())),
  kind: v.optional(paymentKindV),
  status: v.optional(paymentStatusV),
  period: v.optional(v.string()),
  dueDate: v.optional(v.union(v.string(), v.null())),
  valueDate: v.optional(v.union(v.string(), v.null())),
  paymentDate: v.optional(v.union(v.string(), v.null())),
  amount: v.optional(v.number()),
  currency: v.optional(v.string()),
  method: v.optional(paymentMethodV),
  methodRef: v.optional(v.union(v.string(), v.null())),
  linkedPaymentId: v.optional(v.union(v.id("lease_payment"), v.null())),
  evidenceFileId: v.optional(v.union(v.id("document"), v.null())),
  notes: v.optional(v.union(v.string(), v.null())),
});

const leasePaymentRowValidator = v.object({
  _id: v.id("lease_payment"),
  _creationTime: v.optional(v.number()),
  orgId: v.id("orgs"),
  leaseId: v.id("lease"),
  partyId: v.optional(v.id("party")),
  kind: paymentKindV,
  status: paymentStatusV,
  period: v.string(),
  dueDate: v.optional(v.string()),
  valueDate: v.optional(v.string()),
  paymentDate: v.optional(v.string()),
  amount: v.number(),
  currency: v.string(),
  method: paymentMethodV,
  methodRef: v.optional(v.string()),
  linkedPaymentId: v.optional(v.id("lease_payment")),
  evidenceFileId: v.optional(v.id("_storage")),
  notes: v.optional(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
});

export const createLeasePayment = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    input: leasePaymentInputValidator,
  },
  returns: v.object({ leasePaymentId: v.id("lease_payment") }),
  handler: async (ctx, { orgId, input }) => {
    const now = new Date().toISOString();
    const leasePaymentId = await ctx.db.insert("lease_payment", {
      orgId,
      ...input,
      createdAt: now,
      updatedAt: now,
    } as any);
    return { leasePaymentId } as any;
  },
});

export const updateLeasePayment = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    leasePaymentId: v.id("lease_payment"),
    patch: leasePaymentPatchValidator,
  },
  returns: v.object({ leasePaymentId: v.id("lease_payment") }),
  handler: async (ctx, { orgId, leasePaymentId, patch }) => {
    const existing = await ctx.db.get(leasePaymentId);
    if (!existing) throw new Error("lease_payment_not_found");
    if (String((existing as any).orgId) !== String(orgId)) throw new Error("org_mismatch");

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      updates[key] = value === null ? undefined : value;
    }
    await ctx.db.patch(leasePaymentId, updates as any);
    return { leasePaymentId } as any;
  },
});

export const deleteLeasePayment = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    leasePaymentId: v.id("lease_payment"),
  },
  returns: v.object({ deleted: v.boolean() }),
  handler: async (ctx, { orgId, leasePaymentId }) => {
    const existing = await ctx.db.get(leasePaymentId);
    if (!existing) return { deleted: false };
    if (String((existing as any).orgId) !== String(orgId)) throw new Error("org_mismatch");
    await ctx.db.delete(leasePaymentId);
    return { deleted: true };
  },
});

export const listPaymentsByLeaseKindPeriod = queryWithRLS({
  args: {
    orgId: v.id("orgs"),
    leaseId: v.id("lease"),
    kind: paymentKindV,
    period: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(leasePaymentRowValidator),
  handler: async (ctx, { orgId, leaseId, kind, period, limit }) => {
    const take = Math.max(1, Math.min(200, limit ?? 50));
    const rows = await ctx.db
      .query("lease_payment")
      .withIndex("by_org_lease_kind_period", (q) => {
        let builder = (q as any).eq("orgId", orgId).eq("leaseId", leaseId).eq("kind", kind);
        if (period) builder = builder.eq("period", period);
        return builder;
      })
      .take(take);
    return rows as any;
  },
});

export const listPaymentsByLeaseKindStatus = queryWithRLS({
  args: {
    orgId: v.id("orgs"),
    leaseId: v.id("lease"),
    kind: paymentKindV,
    status: paymentStatusV,
    limit: v.optional(v.number()),
  },
  returns: v.array(leasePaymentRowValidator),
  handler: async (ctx, { orgId, leaseId, kind, status, limit }) => {
    const take = Math.max(1, Math.min(200, limit ?? 50));
    const rows = await ctx.db
      .query("lease_payment")
      .withIndex("by_org_lease_kind_status", (q) =>
        (q as any).eq("orgId", orgId).eq("leaseId", leaseId).eq("kind", kind).eq("status", status),
      )
      .take(take);
    return rows as any;
  },
});

export const listPaymentsByLeaseValueDate = queryWithRLS({
  args: {
    orgId: v.id("orgs"),
    leaseId: v.id("lease"),
    minValueDate: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(leasePaymentRowValidator),
  handler: async (ctx, { orgId, leaseId, minValueDate, limit }) => {
    const take = Math.max(1, Math.min(200, limit ?? 50));
    const rows = await ctx.db
      .query("lease_payment")
      .withIndex("by_org_lease_valueDate", (q) => {
        let builder = (q as any).eq("orgId", orgId).eq("leaseId", leaseId);
        if (minValueDate) builder = builder.gte("valueDate", minValueDate);
        return builder;
      })
      .order("asc")
      .take(take);
    return rows as any;
  },
});

export const listPaymentsByLease = queryWithRLS({
  args: {
    orgId: v.id("orgs"),
    leaseId: v.id("lease"),
    limit: v.optional(v.number()),
  },
  returns: v.array(leasePaymentRowValidator),
  handler: async (ctx, { orgId, leaseId, limit }) => {
    const take = Math.max(1, Math.min(200, limit ?? 200));
    const rows = await ctx.db
      .query("lease_payment")
      .withIndex("by_org_lease_valueDate", (q) => (q as any).eq("orgId", orgId).eq("leaseId", leaseId))
      .order("asc")
      .take(take);
    return rows as any;
  },
});


