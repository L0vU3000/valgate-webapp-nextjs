import { v } from "convex/values";
import { mutationWithRLS } from "../rls";

// ============
// Owner CRUD
// ============

export const createOwner = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    ownerType: v.union(v.literal("person"), v.literal("company")),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    displayName: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    nationalId: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    companyName: v.optional(v.string()),
    registrationNumber: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const id = await ctx.db.insert("owner", { ...args, createdAt: now, updatedAt: now } as any);
    return { id } as any;
  },
});

export const updateOwner = mutationWithRLS({
  args: { id: v.id("owner"), updates: v.any() },
  handler: async (ctx, args) => {
    const found = await ctx.db.get(args.id);
    if (!found) throw new Error("Owner not found");
    const now = new Date().toISOString();
    await ctx.db.patch(args.id, { ...(args.updates as any), updatedAt: now } as any);
    return { id: args.id } as any;
  },
});

export const deleteOwner = mutationWithRLS({
  args: { id: v.id("owner") },
  handler: async (ctx, args) => {
    const owner = await ctx.db.get(args.id);
    if (!owner) return { ok: true } as any;
    const orgId = (owner as any).orgId;
    const memberships = await ctx.db
      .query("property_owner_membership")
      .withIndex("by_org_owner", (q: any) => q.eq("orgId", orgId).eq("ownerId", args.id))
      .collect();
    if (memberships.length > 0) throw new Error("Cannot delete owner with memberships");
    const hasFrom = await ctx.db
      .query("property_ownership_transaction")
      .withIndex("by_org_from_owner", (q: any) => q.eq("orgId", orgId).eq("fromOwnerId", args.id))
      .first();
    const hasTo = await ctx.db
      .query("property_ownership_transaction")
      .withIndex("by_org_to_owner", (q: any) => q.eq("orgId", orgId).eq("toOwnerId", args.id))
      .first();
    if (hasFrom || hasTo) throw new Error("Cannot delete owner with transactions");
    await ctx.db.delete(args.id);
    return { ok: true } as any;
  },
});

// =============================
// Membership CRUD
// =============================

const relationshipV = v.union(
  v.literal("owner"),
  v.literal("co-owner"),
  v.literal("mortgagee"),
  v.literal("tenant"),
  v.literal("agent"),
);

const acquisitionTypeV = v.union(
  v.literal("purchase"),
  v.literal("sale"),
  v.literal("inheritance"),
  v.literal("gift"),
  v.literal("transfer"),
  v.literal("other"),
);

export const createMembership = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    propertyId: v.id("property"),
    ownerId: v.id("owner"),
    relationship: relationshipV,
    share: v.optional(v.number()),
    acquisitionType: v.optional(acquisitionTypeV),
    effectiveFrom: v.string(),
    effectiveTo: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const [prop, owner] = await Promise.all([
      ctx.db.get(args.propertyId),
      ctx.db.get(args.ownerId),
    ]);
    if (!prop) throw new Error("Property not found");
    if (!owner) throw new Error("Owner not found");
    if (String((prop as any).orgId) !== String(args.orgId)) throw new Error("Property/org mismatch");
    if (String((owner as any).orgId) !== String(args.orgId)) throw new Error("Owner/org mismatch");
    if (typeof args.share === "number" && (args.share < 0 || args.share > 100)) throw new Error("Share must be between 0 and 100");
    const id = await ctx.db.insert("property_owner_membership", { ...args, createdAt: now, updatedAt: now } as any);
    return { id } as any;
  },
});

export const updateMembership = mutationWithRLS({
  args: { id: v.id("property_owner_membership"), updates: v.any() },
  handler: async (ctx, args) => {
    const found = await ctx.db.get(args.id);
    if (!found) throw new Error("Membership not found");
    if (typeof (args.updates as any)?.share === "number") {
      const s = (args.updates as any).share;
      if (s < 0 || s > 100) throw new Error("Share must be between 0 and 100");
    }
    const now = new Date().toISOString();
    await ctx.db.patch(args.id, { ...(args.updates as any), updatedAt: now } as any);
    return { id: args.id } as any;
  },
});

export const deleteMembership = mutationWithRLS({
  args: { id: v.id("property_owner_membership") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { ok: true } as any;
  },
});

// =============================
// Transactions CRUD
// =============================

export const createOwnershipTransaction = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    propertyId: v.id("property"),
    transactedAt: v.string(),
    acquisitionType: acquisitionTypeV,
    amountValue: v.optional(v.number()),
    amountCurrency: v.optional(v.string()),
    shareTransferred: v.optional(v.number()),
    fromOwnerId: v.optional(v.id("owner")),
    toOwnerId: v.optional(v.id("owner")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const prop = await ctx.db.get(args.propertyId);
    if (!prop) throw new Error("Property not found");
    if (String((prop as any).orgId) !== String(args.orgId)) throw new Error("Property/org mismatch");

    const [from, to] = await Promise.all([
      args.fromOwnerId ? ctx.db.get(args.fromOwnerId) : Promise.resolve(null),
      args.toOwnerId ? ctx.db.get(args.toOwnerId) : Promise.resolve(null),
    ]);
    if (args.fromOwnerId && !from) throw new Error("fromOwner not found");
    if (args.toOwnerId && !to) throw new Error("toOwner not found");
    if (from && String((from as any).orgId) !== String(args.orgId)) throw new Error("fromOwner/org mismatch");
    if (to && String((to as any).orgId) !== String(args.orgId)) throw new Error("toOwner/org mismatch");
    if (typeof args.shareTransferred === "number" && (args.shareTransferred < 0 || args.shareTransferred > 100)) {
      throw new Error("shareTransferred must be between 0 and 100");
    }

    const now = new Date().toISOString();
    const amount = typeof args.amountValue === "number" && args.amountCurrency
      ? { value: args.amountValue, currency: args.amountCurrency }
      : undefined;
    const createdBy = (await ctx.auth.getUserIdentity())?.subject;
    const id = await ctx.db.insert("property_ownership_transaction", {
      orgId: args.orgId,
      propertyId: args.propertyId,
      transactedAt: args.transactedAt,
      acquisitionType: args.acquisitionType,
      amount,
      shareTransferred: args.shareTransferred,
      fromOwnerId: args.fromOwnerId,
      toOwnerId: args.toOwnerId,
      notes: args.notes,
      createdBy,
      createdAt: now,
      updatedAt: now,
    } as any);
    return { id } as any;
  },
});

export const updateOwnershipTransaction = mutationWithRLS({
  args: { id: v.id("property_ownership_transaction"), updates: v.any() },
  handler: async (ctx, args) => {
    const found = await ctx.db.get(args.id);
    if (!found) throw new Error("Transaction not found");
    if (typeof (args.updates as any)?.shareTransferred === "number") {
      const s = (args.updates as any).shareTransferred;
      if (s < 0 || s > 100) throw new Error("shareTransferred must be between 0 and 100");
    }
    const now = new Date().toISOString();
    await ctx.db.patch(args.id, { ...(args.updates as any), updatedAt: now } as any);
    return { id: args.id } as any;
  },
});

export const deleteOwnershipTransaction = mutationWithRLS({
  args: { id: v.id("property_ownership_transaction") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { ok: true } as any;
  },
});

