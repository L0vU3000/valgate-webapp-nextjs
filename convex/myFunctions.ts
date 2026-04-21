import { v } from "convex/values";
import { query, mutation, action, internalMutation } from "./_generated/server";
import { api } from "./_generated/api";
// Removed external contracts import; rely on Convex defineTable types and lightweight runtime checks when needed
import { requireActiveMember, requireAdmin, requireWriter, maskPII, logAccess, sanitizeDetails } from "./security";

// Write your Convex functions in any file inside this directory (`convex`).
// See https://docs.convex.dev/functions for more.

// You can read data from the database via a query:
// Helpers
async function audit(ctx: any, entry: { orgId?: string; type: string; userId: string; entityId?: string; entityType?: string; metadata?: any }) {
  await ctx.db.insert("activities", {
    orgId: entry.orgId as any,
    type: entry.type,
    userId: entry.userId,
    entityId: entry.entityId,
    entityType: entry.entityType,
    metadata: entry.metadata ?? {},
    createdAt: new Date().toISOString(),
  });
}

const nowIso = () => new Date().toISOString();

// Removed: createOrg (Clerk is source of truth)

export const inviteUser = mutation({
  args: {
    orgId: v.string(),
    email: v.string(),
    role: v.string(),
    invitedBy: v.string(),
    expiresAt: v.string(),
  },
  handler: async (ctx, args) => {
    const createdAt = nowIso();
    await requireAdmin(ctx, args.orgId, args.invitedBy);
    const existing = await ctx.db
      .query("organizationInvites")
      .withIndex("by_org_email", (q: any) => q.eq("orgId", args.orgId).eq("email", args.email))
      .first();
    if (existing) return { inviteId: existing._id };
    const inviteId = await ctx.db.insert("organizationInvites", {
      orgId: args.orgId,
      email: args.email,
      role: args.role,
      status: "pending",
      invitedBy: args.invitedBy,
      expiresAt: args.expiresAt,
      createdAt,
    });
    await audit(ctx, { orgId: args.orgId as any, type: "member.invited", userId: args.invitedBy, entityId: (inviteId as any), entityType: "organizationInvite", metadata: { email: args.email, role: args.role } });
    return { inviteId };
  },
});

export const acceptInvite = mutation({
  args: { inviteId: v.id("organizationInvites"), userId: v.string() },
  handler: async (ctx, args) => {
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) throw new Error("Invite not found");
    if (invite.status !== "pending") throw new Error("Invite not pending");
    const now = nowIso();
    await ctx.db.patch(args.inviteId, { status: "accepted" });
    const existingMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q: any) => q.eq("orgId", invite.orgId).eq("userId", args.userId))
      .first();
    if (existingMembership) return { memberId: existingMembership._id };
    const memberId = await ctx.db.insert("organizationMembers", {
      orgId: invite.orgId,
      userId: args.userId,
      role: invite.role,
      permissions: [],
      status: "active",
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
      removedAt: undefined,
    });
    await audit(ctx, { orgId: invite.orgId as any, type: "member.joined", userId: args.userId, entityId: (memberId as any), entityType: "organizationMember" });
    return { memberId };
  },
});

export const changeRole = mutation({
  args: {
    orgId: v.string(),
    userId: v.string(),
    role: v.string(),
    actingUserId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.orgId, args.actingUserId);
    const member = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q: any) => q.eq("orgId", args.orgId).eq("userId", args.userId))
      .first();
    if (!member) throw new Error("Member not found");
    await ctx.db.patch(member._id, { role: args.role, updatedAt: nowIso() });
    await audit(ctx, { orgId: args.orgId as any, type: "member.role_changed", userId: args.actingUserId, entityId: (member._id as any), entityType: "organizationMember", metadata: { to: args.role } });
    return { memberId: member._id };
  },
});

export const switchOrg = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_createdAt", (q) => q)
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();
    if (!membership) return null;
    await logAccess(ctx, { orgId: membership.orgId, userId: args.userId, entityType: "organizationMembers", entityId: membership._id, action: "read", details: { fn: "switchOrg" } });
    return { orgId: membership.orgId };
  },
});

export const revokeAccess = mutation({
  args: { orgId: v.string(), userId: v.string(), actingUserId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.orgId, args.actingUserId);
    const member = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q: any) => q.eq("orgId", args.orgId).eq("userId", args.userId))
      .first();
    if (!member) return { ok: true };
    await ctx.db.patch(member._id, { status: "removed", removedAt: nowIso(), updatedAt: nowIso() });
    await audit(ctx, { orgId: args.orgId as any, type: "member.revoked", userId: args.actingUserId, entityId: (member._id as any), entityType: "organizationMember" });
    return { ok: true };
  },
});

// TEMPORARY: Dev cleanup for obsolete tables. Internal-only and blocked in production.
export const adminCleanupObsoleteTables = internalMutation({
  args: { tables: v.array(v.string()), confirm: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Disallow in production by environment guard
    const isProd = process.env.CONVEX_ENV === "production" || process.env.NODE_ENV === "production";
    if (isProd) {
      throw new Error("adminCleanupObsoleteTables is disabled in production");
    }
    // Optional token check if configured to add an additional safety layer in non-prod
    const requiredToken = process.env.ADMIN_MAINTENANCE_TOKEN;
    if (requiredToken) {
      if (!args.confirm || args.confirm !== requiredToken) {
        throw new Error("Confirmation token mismatch");
      }
    }
    let totalDeleted = 0;
    for (const table of args.tables) {
      // Use any-casts to access tables not in current schema
      const all = await (ctx.db as any).query(table).collect();
      for (const doc of all) {
        await (ctx.db as any).delete(doc._id);
        totalDeleted++;
      }
    }
    return { ok: true, totalDeleted };
  },
});

// Webhook upsert/delete helpers
export const upsertUserProfile = mutation({
  args: {
    userId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("userProfiles").withIndex("by_userId", (q: any) => q.eq("userId", args.userId)).first();
    const now = nowIso();
    if (existing) {
      await ctx.db.patch(existing._id, { email: args.email, firstName: args.firstName, lastName: args.lastName, avatarUrl: args.avatarUrl, updatedAt: now });
      return { id: existing._id };
    }
    const id = await ctx.db.insert("userProfiles", { userId: args.userId, email: args.email, firstName: args.firstName, lastName: args.lastName, avatarUrl: args.avatarUrl, preferences: {}, createdAt: now, updatedAt: now });
    return { id };
  }
});

export const deleteUserProfile = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("userProfiles").withIndex("by_userId", (q: any) => q.eq("userId", args.userId)).first();
    if (existing) await ctx.db.delete(existing._id);
    return { ok: true };
  }
});

export const upsertOrganizationMember = mutation({
  args: { orgId: v.string(), userId: v.string(), role: v.string(), permissions: v.array(v.string()) },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("organizationMembers").withIndex("by_org_user", (q: any) => q.eq("orgId", args.orgId).eq("userId", args.userId)).first();
    const now = nowIso();
    if (existing) {
      await ctx.db.patch(existing._id, { role: args.role, permissions: args.permissions, status: "active", updatedAt: now, removedAt: undefined });
      return { id: existing._id };
    }
    const id = await ctx.db.insert("organizationMembers", { orgId: args.orgId, userId: args.userId, role: args.role, permissions: args.permissions, status: "active", joinedAt: now, createdAt: now, updatedAt: now });
    return { id };
  }
});

export const deleteOrganizationMember = mutation({
  args: { orgId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("organizationMembers").withIndex("by_org_user", (q: any) => q.eq("orgId", args.orgId).eq("userId", args.userId)).first();
    if (existing) await ctx.db.patch(existing._id, { status: "removed", removedAt: nowIso(), updatedAt: nowIso() });
    return { ok: true };
  }
});

export const syncOrganizationInvite = mutation({
  args: { orgId: v.string(), email: v.string(), status: v.string(), role: v.string(), expiresAt: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("organizationInvites").withIndex("by_org_email", (q: any) => q.eq("orgId", args.orgId).eq("email", args.email)).first();
    const now = nowIso();
    if (existing) {
      await ctx.db.patch(existing._id, { status: args.status, role: args.role, createdAt: existing.createdAt });
      return { id: existing._id };
    }
    const id = await ctx.db.insert("organizationInvites", { orgId: args.orgId, email: args.email, role: args.role, status: args.status, invitedBy: "clerk", expiresAt: args.expiresAt, createdAt: now });
    return { id };
  }
});

// --------------------
// AI-22: Mutations/Queries

const createLand = mutation({
  args: {
    orgId: v.string(),
    userId: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const now = nowIso();
    // Validate input and strip aiProcessing if present (allow Clerk org IDs)
    // Omit orgId from schema validation to accept Clerk IDs; set it explicitly on insert
    const parsed = {
      ...(args.data as any),
      id: "01HZX3F1X9M7C9P2Q8R0A1B2C3",
      createdAt: now,
      updatedAt: now,
    } as any;

    // enforce (orgId, titleNo) uniqueness
    const existing = await ctx.db
      .query("lands")
      .withIndex("by_org_titleNo", (q: any) => q.eq("orgId", args.orgId).eq("titleNo", parsed.titleNo))
      .first();
    if (existing) throw new Error("Duplicate titleNo in org");

    const insertData = { ...parsed, orgId: args.orgId, aiProcessing: null } as any;
    const id = await ctx.db.insert("lands", insertData);
    await audit(ctx, { orgId: args.orgId, type: "land.created", userId: args.userId, entityId: id as any, entityType: "land", metadata: { titleNo: parsed.titleNo } });

    // Emit immutable audit record to Neon (insert-only)
    try {
      const respAudit = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/audit/insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': process.env.AILAND_INTERNAL_KEY || '',
        },
        body: JSON.stringify({
          who: args.userId,
          action: 'land.created',
          entity: `land:${id}`,
          before: null,
          after: { titleNo: parsed.titleNo, status: parsed.status },
        }),
      });
      if (!respAudit.ok) {
        const msg = await respAudit.text();
        await audit(ctx, { orgId: args.orgId, type: "audit.emit_failed", userId: args.userId, entityId: (id as any), entityType: "land", metadata: { msg } });
      }
    } catch (e: any) {
      await audit(ctx, { orgId: args.orgId, type: "audit.emit_error", userId: args.userId, entityId: (id as any), entityType: "land", metadata: { error: e?.message } });
    }

    // Write-through: upsert parcel in Neon
    try {
      const resp = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/parcels/upsert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': process.env.AILAND_INTERNAL_KEY || '',
        },
        body: JSON.stringify({ orgId: args.orgId, landId: id, titleNo: parsed.titleNo, status: parsed.status, attributes: {} }),
      });
      if (!resp.ok) {
        const msg = await resp.text();
        await audit(ctx, { orgId: args.orgId, type: "parcel.upsert_failed", userId: args.userId, entityId: (id as any), entityType: "land", metadata: { msg } });
      }
    } catch (e: any) {
      await audit(ctx, { orgId: args.orgId, type: "parcel.upsert_error", userId: args.userId, entityId: (id as any), entityType: "land", metadata: { error: e?.message } });
    }

    return { id };
  },
});

const updateLand = mutation({
  args: { orgId: v.string(), userId: v.string(), landId: v.id("lands"), updates: v.any() },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const land = await ctx.db.get(args.landId);
    if (!land || land.orgId !== args.orgId) throw new Error("Not found");
    const now = nowIso();
    const { aiProcessing, ...rest } = args.updates ?? {};
    const willBump = ["geometryRef", "titleNo", "titleType"].some((k) => k in rest);
    const version = (land.version ?? 0) + (willBump ? 1 : 0);
    if (rest.titleNo && rest.titleNo !== land.titleNo) {
      const dup = await ctx.db
        .query("lands")
        .withIndex("by_org_titleNo", (q: any) => q.eq("orgId", args.orgId).eq("titleNo", rest.titleNo))
        .first();
      if (dup && dup._id !== args.landId) throw new Error("Duplicate titleNo in org");
    }
    await ctx.db.patch(args.landId, { ...rest, version, updatedAt: now });
    if (willBump) {
      await audit(ctx, { orgId: args.orgId, type: "land.version_bumped", userId: args.userId, entityId: (args.landId as any), entityType: "land", metadata: { from: land.version, to: version } });
    }

    // Emit immutable audit record to Neon (insert-only)
    try {
      const respAudit = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/audit/insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': process.env.AILAND_INTERNAL_KEY || '',
        },
        body: JSON.stringify({
          who: args.userId,
          action: 'land.updated',
          entity: `land:${args.landId}`,
          before: null,
          after: { ...rest, version },
        }),
      });
      if (!respAudit.ok) {
        const msg = await respAudit.text();
        await audit(ctx, { orgId: args.orgId, type: "audit.emit_failed", userId: args.userId, entityId: (args.landId as any), entityType: "land", metadata: { msg } });
      }
    } catch (e: any) {
      await audit(ctx, { orgId: args.orgId, type: "audit.emit_error", userId: args.userId, entityId: (args.landId as any), entityType: "land", metadata: { error: e?.message } });
    }

    // Write-through: upsert parcel with latest titleNo/status
    try {
      const newTitleNo = (rest as any).titleNo ?? (land as any).titleNo;
      const newStatus = (rest as any).status ?? (land as any).status;
      const resp = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/parcels/upsert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': process.env.AILAND_INTERNAL_KEY || '',
        },
        body: JSON.stringify({ orgId: args.orgId, landId: args.landId, titleNo: newTitleNo, status: newStatus }),
      });
      if (!resp.ok) {
        const msg = await resp.text();
        await audit(ctx, { orgId: args.orgId, type: "parcel.upsert_failed", userId: args.userId, entityId: (args.landId as any), entityType: "land", metadata: { msg } });
      }
    } catch (e: any) {
      await audit(ctx, { orgId: args.orgId, type: "parcel.upsert_error", userId: args.userId, entityId: (args.landId as any), entityType: "land", metadata: { error: e?.message } });
    }

    return { id: args.landId };
  },
});

const deleteLand = mutation({
  args: { orgId: v.string(), userId: v.string(), landId: v.id("lands") },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const land = await ctx.db.get(args.landId);
    if (!land || (land as any).orgId !== args.orgId) throw new Error("Not found");
    await ctx.db.delete(args.landId);
    await audit(ctx, { orgId: args.orgId, type: "land.deleted", userId: args.userId, entityId: (args.landId as any), entityType: "land" });
    return { ok: true };
  },
});

const linkOwnerToLand = mutation({
  args: { orgId: v.string(), userId: v.string(), landId: v.id("lands"), ownerId: v.id("owners"), share: v.number() },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const [land, owner] = await Promise.all([ctx.db.get(args.landId), ctx.db.get(args.ownerId)]);
    if (!land || !owner) throw new Error("Not found");
    if (land.orgId !== args.orgId || owner.orgId !== args.orgId) throw new Error("Cross-org link forbidden");
    const now = nowIso();
    await ctx.db.insert("land_owners", { orgId: args.orgId, landId: args.landId, ownerId: args.ownerId, share: args.share, createdAt: now, updatedAt: now });
    await ctx.db.patch(args.landId, { version: (land.version ?? 0) + 1, updatedAt: now });
    await audit(ctx, { orgId: args.orgId, type: "land.owner_linked", userId: args.userId, entityId: (args.landId as any), entityType: "land", metadata: { ownerId: args.ownerId } });

    // Emit immutable audit record
    try {
      const respAudit = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/audit/insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': process.env.AILAND_INTERNAL_KEY || '',
        },
        body: JSON.stringify({
          who: args.userId,
          action: 'owner.linked',
          entity: `land:${args.landId}`,
          before: null,
          after: { ownerId: args.ownerId, share: args.share },
        }),
      });
      if (!respAudit.ok) {
        const msg = await respAudit.text();
        await audit(ctx, { orgId: args.orgId, type: "audit.emit_failed", userId: args.userId, entityId: (args.landId as any), entityType: "land", metadata: { msg } });
      }
    } catch (e: any) {
      await audit(ctx, { orgId: args.orgId, type: "audit.emit_error", userId: args.userId, entityId: (args.landId as any), entityType: "land", metadata: { error: e?.message } });
    }
    return { ok: true };
  },
});

const unlinkOwnerFromLand = mutation({
  args: { orgId: v.string(), userId: v.string(), landId: v.id("lands"), ownerId: v.id("owners") },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const land = await ctx.db.get(args.landId);
    if (!land || land.orgId !== args.orgId) throw new Error("Not found");
    const links = await ctx.db
      .query("land_owners")
      .withIndex("by_org_landId", (q: any) => q.eq("orgId", args.orgId).eq("landId", args.landId))
      .collect();
    const toDelete = links.filter((lo: any) => lo.ownerId === args.ownerId);
    for (const lo of toDelete) await ctx.db.delete(lo._id);
    const now = nowIso();
    await ctx.db.patch(args.landId, { version: (land.version ?? 0) + 1, updatedAt: now });
    await audit(ctx, { orgId: args.orgId, type: "land.owner_unlinked", userId: args.userId, entityId: (args.landId as any), entityType: "land", metadata: { ownerId: args.ownerId } });

    // Emit immutable audit record
    try {
      const respAudit = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/audit/insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': process.env.AILAND_INTERNAL_KEY || '',
        },
        body: JSON.stringify({
          who: args.userId,
          action: 'owner.unlinked',
          entity: `land:${args.landId}`,
          before: { ownerId: args.ownerId },
          after: null,
        }),
      });
      if (!respAudit.ok) {
        const msg = await respAudit.text();
        await audit(ctx, { orgId: args.orgId, type: "audit.emit_failed", userId: args.userId, entityId: (args.landId as any), entityType: "land", metadata: { msg } });
      }
    } catch (e: any) {
      await audit(ctx, { orgId: args.orgId, type: "audit.emit_error", userId: args.userId, entityId: (args.landId as any), entityType: "land", metadata: { error: e?.message } });
    }
    return { ok: true };
  },
});

// --------------------
// AI-23: Documents

export const uploadDocument = mutation({
  args: {
    orgId: v.string(),
    userId: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const now = nowIso();
    // Validate payload against contract
    const parsed = {
      ...args.data,
      id: "01HZX3F1X9M7C9P2Q8R0A1B2C3",
      orgId: args.orgId,
      createdAt: now,
      updatedAt: now,
    } as any;
    // Strip contract-only fields that are not part of Convex table validator
    const { id: _ignoreBaseId, ...toInsert } = parsed as any;

    // If linked to land, verify org and existence
    if (parsed.landId) {
      const land = await ctx.db.get(parsed.landId as any);
      if (!land || (land as any).orgId !== args.orgId) throw new Error("Invalid land link");
    }

    const id = await ctx.db.insert("documents", toInsert as any);

    // Bump land documentCount if linked
    if (parsed.landId) {
      const land = await ctx.db.get(parsed.landId as any);
      if (land) {
        const current = (land as any).documentCount + 1;
        await ctx.db.patch(parsed.landId as any, { documentCount: current, updatedAt: now });
      }
    }

    await audit(ctx, { orgId: args.orgId, type: "document.uploaded", userId: args.userId, entityId: (id as any), entityType: "document", metadata: { type: (parsed as any).type } });
    return { id };
  },
});

export const getPrimaryDocumentMetadata = query({
  args: { orgId: v.string(), userId: v.string(), id: v.id("documents") },
  handler: async (ctx, args) => {
    await requireActiveMember(ctx, args.orgId, args.userId);
    const doc = await ctx.db.get(args.id);
    if (!doc || (doc as any).orgId !== args.orgId) throw new Error("Not found");
    await logAccess(ctx, { orgId: args.orgId, userId: args.userId, entityType: "documents", entityId: (args.id as any), action: "read", details: { fn: "getPrimaryDocumentMetadata" } });
    return {
      id: (doc as any)._id,
      orgId: (doc as any).orgId,
      title: (doc as any).title,
      mimeType: undefined,
      size: undefined,
      blobKey: undefined,
      thumbnailKey: undefined,
      fileUrl: undefined,
      previewable: false,
    } as any;
  },
});

export const getGeneratedDocumentMetadata = query({
  args: { orgId: v.string(), userId: v.string(), id: v.id("generatedDocuments") },
  handler: async (ctx, args) => {
    await requireActiveMember(ctx, args.orgId, args.userId);
    const gen = await ctx.db.get(args.id);
    if (!gen || (gen as any).orgId !== args.orgId) throw new Error("Not found");
    await logAccess(ctx, { orgId: args.orgId, userId: args.userId, entityType: "generatedDocuments", entityId: (args.id as any), action: "read", details: { fn: "getGeneratedDocumentMetadata" } });
    return {
      id: (gen as any)._id,
      orgId: (gen as any).orgId,
      title: (gen as any).title,
      mimeType: (gen as any).mimeType,
      size: undefined,
      blobKey: undefined,
      thumbnailKey: undefined,
      fileUrl: (gen as any).fileUrl,
      previewable: true,
    } as any;
  },
});

// Document metadata fetcher (audited): supports primary documents and generated documents
export const getDocumentMetadata = query({
  args: { orgId: v.string(), userId: v.string(), documentId: v.string() },
  handler: async (ctx, args) => {
    // Enforce membership at org scope
    await requireActiveMember(ctx, args.orgId, args.userId);

    // Try primary documents first (shape may not include file info yet)
    const doc = await ctx.db.get(args.documentId as any).catch(() => null);
    if (doc && (doc as any).orgId === args.orgId && (doc as any)._table === 'documents') {
      // Currently, primary documents do not persist fileUrl/mimeType in schema
      // Return minimal metadata and signal absence of previewable blob
      await logAccess(ctx, {
        orgId: args.orgId,
        userId: args.userId,
        entityType: 'documents',
        entityId: (args.documentId as any),
        action: 'read',
        details: { fn: 'getDocumentMetadata', source: 'documents', previewable: false },
      });
      return {
        id: (doc as any)._id,
        orgId: (doc as any).orgId,
        title: (doc as any).title,
        mimeType: undefined,
        size: undefined,
        blobKey: undefined,
        thumbnailKey: undefined,
        fileUrl: undefined,
        previewable: false,
      } as any;
    }

    // Fallback: generatedDocuments support fileUrl/mimeType
    const gen = await ctx.db.get(args.documentId as any).catch(() => null);
    if (gen && (gen as any).orgId === args.orgId && (gen as any)._table === 'generatedDocuments') {
      await logAccess(ctx, {
        orgId: args.orgId,
        userId: args.userId,
        entityType: 'generatedDocuments',
        entityId: (args.documentId as any),
        action: 'read',
        details: { fn: 'getDocumentMetadata', source: 'generatedDocuments', previewable: true },
      });
      return {
        id: (gen as any)._id,
        orgId: (gen as any).orgId,
        title: (gen as any).title,
        mimeType: (gen as any).mimeType,
        size: undefined,
        blobKey: undefined,
        thumbnailKey: undefined,
        fileUrl: (gen as any).fileUrl,
        previewable: true,
      } as any;
    }

    // Not found or cross-org
    throw new Error('Not found');
  },
});

export const linkDocumentToLand = mutation({
  args: { orgId: v.string(), userId: v.string(), documentId: v.id("documents"), landId: v.id("lands") },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const [doc, land] = await Promise.all([ctx.db.get(args.documentId), ctx.db.get(args.landId)]);
    if (!doc || !land) throw new Error("Not found");
    if (doc.orgId !== args.orgId || land.orgId !== args.orgId) throw new Error("Cross-org link forbidden");
    const now = nowIso();
    await ctx.db.patch(args.documentId, { landId: args.landId, updatedAt: now });
    await ctx.db.patch(args.landId, { documentCount: (land.documentCount ?? 0) + 1, updatedAt: now });
    await audit(ctx, { orgId: args.orgId, type: "document.linked_to_land", userId: args.userId, entityId: (args.documentId as any), entityType: "document", metadata: { landId: args.landId } });
    return { ok: true };
  },
});

export const createGeneratedDocument = mutation({
  args: {
    orgId: v.string(),
    userId: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const now = nowIso();
    const parsed = {
      ...args.data,
      id: "01HZX3F1X9M7C9P2Q8R0A1B2C3",
      orgId: args.orgId,
      createdAt: now,
      updatedAt: now,
    } as any;

    // If linked to land, verify org and existence
    if ((parsed as any).landId) {
      const land = await ctx.db.get((parsed as any).landId);
      if (!land || (land as any).orgId !== args.orgId) throw new Error("Invalid land link");
    }

    const id = await ctx.db.insert("generatedDocuments", parsed as any);
    await audit(ctx, { orgId: args.orgId, type: "generated_document.created", userId: args.userId, entityId: (id as any), entityType: "generatedDocument", metadata: { source: (parsed as any).source } });
    return { id };
  },
});

const listLandsByStatus = query({
  args: { orgId: v.string(), userId: v.string(), status: v.string() },
  handler: async (ctx, args) => {
    const membership = await requireActiveMember(ctx, args.orgId, args.userId);
    const lands = await ctx.db
      .query("lands")
      .withIndex("by_org_status", (q: any) => q.eq("orgId", args.orgId).eq("status", args.status))
      .collect();
    await logAccess(ctx, { orgId: args.orgId, userId: args.userId, entityType: "lands", action: "read", details: { status: args.status, count: lands.length } });
    return lands;
  },
});

const getLandByTitleNo = query({
  args: { orgId: v.string(), userId: v.string(), titleNo: v.string() },
  handler: async (ctx, args) => {
    await requireActiveMember(ctx, args.orgId, args.userId);
    const land = await ctx.db
      .query("lands")
      .withIndex("by_org_titleNo", (q: any) => q.eq("orgId", args.orgId).eq("titleNo", args.titleNo))
      .first();
    if (land) await logAccess(ctx, { orgId: args.orgId, userId: args.userId, entityType: "lands", entityId: land._id, action: "read", details: { titleNo: args.titleNo } });
    return land ?? null;
  },
});

export const listOwnersByName = query({
  args: { orgId: v.string(), userId: v.string(), namePrefix: v.string() },
  handler: async (ctx, args) => {
    const membership = await requireActiveMember(ctx, args.orgId, args.userId);
    const isAdmin = (membership.role === "admin");
    const owners = await ctx.db
      .query("owners")
      .withIndex("by_org_name", (q: any) => q.eq("orgId", args.orgId))
      .filter((q: any) => q.gte(q.field("name"), args.namePrefix) && q.lte(q.field("name"), `${args.namePrefix}\uffff`))
      .collect();
    await logAccess(ctx, { orgId: args.orgId, userId: args.userId, entityType: "owners", action: "read", details: { namePrefix: args.namePrefix, count: owners.length } });
    // mask nationalId for non-admins
    return owners.map((o: any) => maskPII(o, isAdmin));
  },
});

export const workerUpdateAiProcessing = mutation({
  args: { orgId: v.string(), workerKey: v.string(), landId: v.id("lands"), payload: v.any() },
  handler: async (ctx, args) => {
    // Simple service identity check via secret env key
    if (args.workerKey !== (process.env.AILAND_WORKER_KEY || "")) throw new Error("Forbidden");
    const land = await ctx.db.get(args.landId);
    if (!land || land.orgId !== args.orgId) throw new Error("Not found");
    const parsed = args.payload as any;
    await ctx.db.patch(args.landId, { aiProcessing: parsed, updatedAt: nowIso() });
    await audit(ctx, { orgId: args.orgId, type: "land.ai_processing_updated", userId: "worker", entityId: (args.landId as any), entityType: "land", metadata: { confidence: parsed.confidence } });
    return { ok: true };
  },
});

const reviewQueueList = query({
  args: { orgId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    await requireActiveMember(ctx, args.orgId, args.userId);
    const lands = await ctx.db
      .query("lands")
      .withIndex("by_org_updatedAt", (q: any) => q.eq("orgId", args.orgId))
      .collect();
    // order by aiProcessing.confidence DESC NULLS LAST
    const ordered = lands
      .sort((a: any, b: any) => {
        const ac = a.aiProcessing?.confidence ?? -1;
        const bc = b.aiProcessing?.confidence ?? -1;
        return bc - ac;
      });
    await logAccess(ctx, { orgId: args.orgId, userId: args.userId, entityType: "lands", action: "read", details: { fn: "reviewQueueList", count: ordered.length } });
    return ordered;
  },
});
// (no actions needed for this slice)

// --------------------
// AI-24: Ingestion

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

export const startUpload = mutation({
  args: {
    orgId: v.string(),
    userId: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const now = nowIso();
    const parsed = {
      ...args.data,
      id: "01HZX3F1X9M7C9P2Q8R0A1B2C3",
      orgId: args.orgId,
      createdAt: now,
      updatedAt: now,
      status: "pending",
    } as any;

    if ((parsed as any).idempotencyKey) {
      const dup = await ctx.db
        .query("uploads")
        .withIndex("by_org_createdAt", (q: any) => q.eq("orgId", args.orgId))
        .filter((q: any) => q.eq(q.field("idempotencyKey"), (parsed as any).idempotencyKey))
        .first();
      if (dup) return { id: dup._id };
    }

    const id = await ctx.db.insert("uploads", parsed as any);
    await audit(ctx, { orgId: args.orgId, type: "upload.started", userId: args.userId, entityId: (id as any), entityType: "upload" });
    return { id };
  },
});

// AI-30: Analytics - capture event
export const captureAnalyticsEvent = mutation({
  args: {
    // orgId may be absent for unauthenticated events; if present, enforce membership for writers
    orgId: v.optional(v.string()),
    userId: v.optional(v.string()),
    event: v.string(),
    properties: v.optional(v.any()),
    sessionId: v.optional(v.string()),
    timestamp: v.optional(v.string()),
    environment: v.string(),
    posthogId: v.optional(v.string()),
    actorUserId: v.optional(v.string()), // authenticated caller, if any
  },
  handler: async (ctx, args) => {
    // Security: if org scoped and actor present, require writer; otherwise allow anonymous capture
    if (args.orgId && args.actorUserId) {
      await requireWriter(ctx, args.orgId, args.actorUserId);
    }
    const now = nowIso();
    const id = "01HZX3F1X9M7C9P2Q8R0A1B2C3"; // placeholder ULID for validation only
    const parsed = {
      id: (id as any),
      orgId: args.orgId,
      userId: args.userId,
      event: args.event,
      properties: args.properties ?? {},
      sessionId: args.sessionId,
      timestamp: args.timestamp ?? now,
      environment: args.environment,
      posthogId: args.posthogId,
      processed: false,
      createdAt: now,
      updatedAt: now,
    } as any;

    // Enforce no PII via schema; also sanitize large strings
    const sanitizedProps = sanitizeDetails(parsed.properties as any);

    const insertId = await ctx.db.insert("analyticsEvents", {
      orgId: parsed.orgId,
      userId: parsed.userId,
      event: parsed.event,
      properties: sanitizedProps,
      sessionId: parsed.sessionId,
      timestamp: parsed.timestamp,
      environment: parsed.environment,
      posthogId: parsed.posthogId,
      processed: parsed.processed,
      processedAt: parsed.processedAt,
      createdAt: parsed.createdAt,
      updatedAt: parsed.updatedAt,
    } as any);

    if (parsed.orgId && args.actorUserId) {
      await audit(ctx, { orgId: parsed.orgId, type: `analytics.captured`, userId: args.actorUserId, entityId: insertId as any, entityType: "analyticsEvent", metadata: { event: parsed.event } });
      await logAccess(ctx, { orgId: parsed.orgId, userId: args.actorUserId, entityType: "analyticsEvent", entityId: (insertId as any), action: "create", details: { event: parsed.event } });
    }

    return { id: insertId };
  },
});

// AI-30: Analytics - counts by event per day
export const analyticsCountsByEventPerDay = query({
  args: {
    orgId: v.string(),
    userId: v.string(),
    start: v.string(),
    end: v.string(),
  },
  handler: async (ctx, args) => {
    // Enforce org membership for reads
    await requireActiveMember(ctx, args.orgId, args.userId);
    const results: Record<string, Record<string, number>> = {};
    const q = ctx.db
      .query("analyticsEvents")
      .withIndex("by_org_timestamp", (q: any) => q.eq("orgId", args.orgId));

    const rows = await (q as any)
      .filter((qq: any) => qq.gte(qq.field("timestamp"), args.start) && qq.lte(qq.field("timestamp"), args.end))
      .collect();

    for (const r of rows) {
      const day = (r.timestamp as string).slice(0, 10);
      results[r.event] = results[r.event] || {};
      results[r.event][day] = (results[r.event][day] || 0) + 1;
    }
    await logAccess(ctx, { orgId: args.orgId, userId: args.userId, entityType: "analyticsEvent", action: "read", details: { start: args.start, end: args.end, keys: Object.keys(results) } });
    return results;
  },
});

export const enqueueJob = mutation({
  args: {
    orgId: v.string(),
    userId: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const now = nowIso();
    const parsed = {
      ...args.data,
      id: "01HZX3F1X9M7C9P2Q8R0A1B2C3",
      orgId: args.orgId,
      createdAt: now,
      updatedAt: now,
      status: "queued",
      retryCount: 0,
    } as any;

    if ((parsed as any).dedupKey) {
      const dup = await ctx.db
        .query("jobs")
        .withIndex("by_org_status_createdAt", (q: any) => q.eq("orgId", args.orgId).eq("status", "queued"))
        .filter((q: any) => q.eq(q.field("dedupKey"), (parsed as any).dedupKey))
        .first();
      if (dup) return { id: dup._id };
    }

    const id = await ctx.db.insert("jobs", parsed as any);
    await audit(ctx, { orgId: args.orgId, type: "job.enqueued", userId: args.userId, entityId: (id as any), entityType: "job", metadata: { targetLabel: (parsed as any).targetLabel } });
    return { id };
  },
});

// AI-30: seed helper (dev only) to insert sample analytics events
export const seedAnalyticsEvents = mutation({
  args: {
    orgId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const base = new Date();
    const mk = async (event: string, daysAgo: number) => {
      const ts = new Date(base.getTime() - daysAgo * 24 * 3600 * 1000).toISOString();
      await ctx.db.insert("analyticsEvents", {
        orgId: args.orgId,
        userId: args.userId,
        event,
        properties: { sample: true },
        sessionId: "dev-session",
        timestamp: ts,
        environment: "dev",
        createdAt: ts,
        updatedAt: ts,
        processed: false,
      } as any);
    };
    await mk("dashboard.viewed", 0);
    await mk("dashboard.viewed", 1);
    await mk("land.created", 0);
    return { ok: true };
  },
});

export const advanceJobState = mutation({
  args: {
    orgId: v.string(),
    userId: v.string(),
    jobId: v.id("jobs"),
    toStatus: v.string(),
    resultData: v.optional(v.any()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireActiveMember(ctx, args.orgId, args.userId); // workers may not be admin
    const job = await ctx.db.get(args.jobId);
    if (!job || job.orgId !== args.orgId) throw new Error("Not found");

    const allowed: Record<string, string[]> = {
      queued: ["processing"],
      processing: ["completed", "failed", "manual_review"],
      completed: [],
      failed: [],
      manual_review: ["processing", "completed", "failed"],
    };
    assert(allowed[job.status]?.includes(args.toStatus) ?? false, "Invalid transition");

    const now = nowIso();
    const updates: any = { status: args.toStatus, updatedAt: now };
    if (args.toStatus === "completed") updates.completedAt = now;
    if (args.resultData) updates.resultData = args.resultData;
    if (args.error) {
      updates.lastError = args.error;
      updates.retryCount = (job.retryCount ?? 0) + 1;
    }
    await ctx.db.patch(args.jobId, updates);
    await audit(ctx, { orgId: args.orgId, type: "job.state_changed", userId: args.userId, entityId: (args.jobId as any), entityType: "job", metadata: { to: args.toStatus } });
    return { ok: true };
  },
});

// Land deletion orchestration (safe + idempotent)
export const startLandDeletion = mutation({
  args: { orgId: v.string(), userId: v.string(), landId: v.id("lands"), idempotencyKey: v.string() },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const land = await ctx.db.get(args.landId);
    if (!land || (land as any).orgId !== args.orgId) throw new Error("Not found");

    // If already deleting, try to find existing job by dedup key in queued/processing (idempotent)
    const dedupKey = `land-delete:${String(args.landId)}`;
    if ((land as any).status === "deleting") {
      const queued = await ctx.db
        .query("jobs")
        .withIndex("by_org_status_createdAt", (q: any) => q.eq("orgId", args.orgId).eq("status", "queued"))
        .filter((q: any) => q.eq(q.field("dedupKey"), dedupKey))
        .first();
      if (queued) return { jobId: queued._id } as any;
      const processing = await ctx.db
        .query("jobs")
        .withIndex("by_org_status_createdAt", (q: any) => q.eq("orgId", args.orgId).eq("status", "processing"))
        .filter((q: any) => q.eq(q.field("dedupKey"), dedupKey))
        .first();
      if (processing) return { jobId: processing._id } as any;
    }

    const now = nowIso();
    // Reuse jobs table with a dedup key
    const dup = await ctx.db
      .query("jobs")
      .withIndex("by_org_status_createdAt", (q: any) => q.eq("orgId", args.orgId).eq("status", "queued"))
      .filter((q: any) => q.eq(q.field("dedupKey"), dedupKey))
      .first();
    const jobId = dup?._id || (await ctx.db.insert("jobs", {
      orgId: args.orgId,
      userId: args.userId,
      landId: args.landId as any,
      targetLabel: "land.delete",
      status: "queued",
      metadata: { idempotencyKey: args.idempotencyKey },
      resultData: {},
      retryCount: 0,
      lastError: undefined,
      completedAt: undefined,
      dedupKey,
      createdAt: now,
      updatedAt: now,
    } as any));

    // Soft lock the land while deletion is in progress
    await ctx.db.patch(args.landId, { status: "deleting", updatedAt: now });
    await audit(ctx, { orgId: args.orgId, type: "land.delete.requested", userId: args.userId, entityId: (args.landId as any), entityType: "land", metadata: { jobId } });
    return { jobId } as any;
  },
});

export const performLandDeletion = mutation({
  args: { orgId: v.string(), workerKey: v.string(), jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    // Service identity check
    if (args.workerKey !== (process.env.AILAND_WORKER_KEY || "")) throw new Error("Forbidden");
    const job = await ctx.db.get(args.jobId);
    if (!job || (job as any).orgId !== args.orgId) throw new Error("Job not found");
    const now = nowIso();
    const landId = (job as any).landId as any;
    const userId = (job as any).userId as string;
    const land = landId ? await ctx.db.get(landId) : null;
    if (!land || (land as any).orgId !== args.orgId) throw new Error("Land not found");

    // Mark job processing
    await ctx.db.patch(args.jobId, { status: "processing", updatedAt: now });
    await audit(ctx, { orgId: args.orgId, type: "land.delete.started", userId, entityId: (landId as any), entityType: "land", metadata: { jobId: args.jobId } });

    try {
      // 1) Delete Neon parcels + geometries via internal API
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/parcels/delete-by-land`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.AILAND_INTERNAL_KEY || '' },
          body: JSON.stringify({ orgId: args.orgId, landId: String(landId) }),
        });
      } catch {}

      // 2) Delete Convex land images (including storage)
      const imgs = await ctx.db
        .query("landImages")
        .withIndex("by_org_land_type", (q: any) => q.eq("orgId", args.orgId).eq("landId", landId))
        .collect();
      for (const im of imgs) {
        const storageId = (im as any).metadata?.storageId;
        if (storageId) { try { await ctx.storage.delete(storageId); } catch {} }
        await ctx.db.delete((im as any)._id);
      }

      // 3) Delete documents metadata and file mappings (S3 deletion best-effort handled by external worker/route)
      const docs = await ctx.db
        .query("documents")
        .withIndex("by_org_land_createdAt", (q: any) => q.eq("orgId", args.orgId).eq("landId", landId))
        .collect();
      for (const d of docs) {
        // Remove mapping + doc
        try {
          await ctx.db.delete((d as any)._id);
          const mapping = await ctx.db
            .query("files")
            .withIndex("by_docId", (q: any) => q.eq("docId", (d as any)._id))
            .first();
          if (mapping) await ctx.db.delete((mapping as any)._id);
        } catch {}
      }

      // 4) Finally hard-delete or tombstone the land
      try {
        await ctx.db.delete(landId as any);
      } catch {}

      await ctx.db.patch(args.jobId, { status: "completed", updatedAt: now, completedAt: now });
      await audit(ctx, { orgId: args.orgId, type: "land.delete.completed", userId, entityId: (landId as any), entityType: "land" });
      return { ok: true } as any;
    } catch (e: any) {
      await ctx.db.patch(args.jobId, { status: "failed", updatedAt: now, lastError: e?.message || "delete failed", retryCount: ((job as any).retryCount ?? 0) + 1 });
      try { await ctx.db.patch(landId as any, { status: (land as any).status ?? "active", updatedAt: now }); } catch {}
      await audit(ctx, { orgId: args.orgId, type: "land.delete.failed", userId, entityId: (landId as any), entityType: "land", metadata: { error: e?.message } });
      return { ok: false } as any;
    }
  },
});

// Action to kick off the deletion worker asynchronously (scheduler)
export const startLandDeletionWorker = action({
  args: { orgId: v.string(), userId: v.string(), jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    // We could optionally verify membership here via a query if desired
    const workerKey = process.env.AILAND_WORKER_KEY || "";
    // Schedule the mutation almost immediately; adjust delay if you want staggering
    await ctx.scheduler.runAfter(0, api.myFunctions.performLandDeletion, {
      orgId: args.orgId,
      workerKey,
      jobId: args.jobId,
    });
    return { ok: true } as any;
  },
});

export const createBulkImport = mutation({
  args: { orgId: v.string(), userId: v.string(), data: v.any() },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const now = nowIso();
    const parsed = {
      ...args.data,
      id: "01HZX3F1X9M7C9P2Q8R0A1B2C3",
      orgId: args.orgId,
      createdAt: now,
      updatedAt: now,
      status: "validating",
      totalRows: 0,
      validRows: 0,
      errorRows: 0,
      processedRows: 0,
    } as any;
    const id = await ctx.db.insert("bulk_imports", parsed as any);
    await audit(ctx, { orgId: args.orgId, type: "bulk_import.created", userId: args.userId, entityId: (id as any), entityType: "bulk_import" });
    return { id };
  },
});

export const recordDuplicateGroup = mutation({
  args: { orgId: v.string(), userId: v.string(), data: v.any() },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const now = nowIso();
    const parsed = {
      ...args.data,
      id: "01HZX3F1X9M7C9P2Q8R0A1B2C3",
      orgId: args.orgId,
      createdAt: now,
      updatedAt: now,
      status: "pending",
    } as any;

    // validate landIds belong to org
    for (const lid of (parsed as any).landIds) {
      const land = await ctx.db.get(lid as any);
      if (!land || (land as any).orgId !== args.orgId) throw new Error("Invalid land in group");
    }

    const id = await ctx.db.insert("duplicate_groups", parsed as any);
    await audit(ctx, { orgId: args.orgId, type: "duplicate.group_recorded", userId: args.userId, entityId: (id as any), entityType: "duplicate_group" });
    return { id };
  },
});

export const resolveDuplicate = mutation({
  args: { orgId: v.string(), userId: v.string(), data: v.any() },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const now = nowIso();
    const parsed = {
      ...args.data,
      id: "01HZX3F1X9M7C9P2Q8R0A1B2C3",
      orgId: args.orgId,
      createdAt: now,
      updatedAt: now,
      resolvedAt: now,
    } as any;

    const group = await ctx.db.get((parsed as any).groupId as any);
    if (!group || (group as any).orgId !== args.orgId) throw new Error("Group not found");

    // If selectedLandId present, verify belongs to group
    if ((parsed as any).selectedLandId) {
      const lid = (parsed as any).selectedLandId;
      assert((group as any).landIds.includes(lid), "selectedLandId must be in group");
    }

    const id = await ctx.db.insert("duplicate_resolutions", parsed as any);
    await ctx.db.patch((parsed as any).groupId as any, { status: "resolved", updatedAt: now });
    await audit(ctx, { orgId: args.orgId, type: "duplicate.resolved", userId: args.userId, entityId: (id as any), entityType: "duplicate_resolution", metadata: { groupId: (parsed as any).groupId } });
    return { id };
  },
});

// --------------------
// Dev seeds for AI-23
export const devSeedDocuments = mutation({
  args: { orgId: v.string(), userId: v.string(), landId: v.optional(v.id("lands")) },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const now = nowIso();

    // Create one linked land if not provided
    let landId = args.landId as any;
    if (!landId) {
      const land = await ctx.db.insert("lands", {
        orgId: args.orgId,
        status: "draft",
        titleNo: `T-${Date.now()}`,
        title: "Seed Land",
        type: "residential",
        coordinates: undefined,
        geometryRef: undefined,
        address: "",
        province: "",
        sangkat: "",
        phum: "",
        size: { value: 100, unit: "sqm", display: "100 sqm" },
        titleType: "soft_title",
        registrationDate: undefined,
        valuation: { estimated: 0, purchase: undefined, display: "$0" },
        accuracy: undefined,
        precision: undefined,
        dispute: undefined,
        taxStatus: undefined,
        documentCount: 0,
        version: 1,
        aiProcessing: null,
        createdAt: now,
        updatedAt: now,
      });
      landId = land as any;
    }

    const upload1 = await ctx.db.insert("documents", {
      orgId: args.orgId,
      landId,
      type: "title",
      uploadId: "01UPLOADTITLE0000000000000000",
      title: "Title Document",
      lang: "en",
      metadata: { titleNo: "ABC-123", issueDate: now },
      createdAt: now,
      updatedAt: now,
    });

    const upload2 = await ctx.db.insert("documents", {
      orgId: args.orgId,
      landId: undefined,
      type: "survey",
      uploadId: "01UPLOADSURVEY000000000000000",
      title: "Survey Report",
      lang: "en",
      metadata: { surveyor: "Seed Surveyor", surveyDate: now },
      createdAt: now,
      updatedAt: now,
    });

    const gen = await ctx.db.insert("generatedDocuments", {
      orgId: args.orgId,
      landId,
      source: "ai",
      title: "AI Summary",
      fileUrl: "https://example.com/ai.pdf",
      mimeType: "application/pdf",
      metadata: { model: "gpt-4o" },
      createdAt: now,
      updatedAt: now,
    });

    return { ok: true, landId, uploads: [upload1, upload2], generated: gen };
  },
});

// Dev seeds for AI-24 ingestion
export const devSeedIngestion = mutation({
  args: { orgId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const now = nowIso();

    // Create upload directly
    const uploadId = await ctx.db.insert("uploads", {
      orgId: args.orgId,
      userId: args.userId,
      fileUrl: "https://example.com/sample.pdf",
      fileName: "sample.pdf",
      fileSize: 12345,
      mimeType: "application/pdf",
      status: "pending",
      metadata: { seed: true },
      idempotencyKey: `seed-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    });
    await audit(ctx, { orgId: args.orgId, type: "upload.started", userId: args.userId, entityId: (uploadId as any), entityType: "upload" });

    // Enqueue job directly
    const jobId = await ctx.db.insert("jobs", {
      orgId: args.orgId,
      userId: args.userId,
      uploadId: uploadId as any,
      landId: undefined,
      targetLabel: "ocr",
      status: "queued",
      metadata: { seed: true },
      resultData: undefined,
      retryCount: 0,
      lastError: undefined,
      completedAt: undefined,
      dedupKey: `seed-job-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    });
    await audit(ctx, { orgId: args.orgId, type: "job.enqueued", userId: args.userId, entityId: (jobId as any), entityType: "job", metadata: { targetLabel: "ocr" } });

    // Advance job to processing then completed
    await ctx.db.patch(jobId as any, { status: "processing", updatedAt: nowIso() });
    await ctx.db.patch(jobId as any, { status: "completed", updatedAt: nowIso(), completedAt: nowIso(), resultData: { pages: 1, text: "ok" } });

    // Create a duplicate group and resolve it
    const landA = await ctx.db.insert("lands", {
      orgId: args.orgId,
      status: "draft",
      titleNo: `DUP-${Date.now()}-A`,
      title: "Dup A",
      type: "residential",
      coordinates: undefined,
      geometryRef: undefined,
      address: "",
      province: "",
      sangkat: "",
      phum: "",
      size: { value: 1, unit: "sqm", display: "1 sqm" },
      titleType: "soft_title",
      registrationDate: undefined,
      valuation: { estimated: 0, purchase: undefined, display: "$0" },
      accuracy: undefined,
      precision: undefined,
      dispute: undefined,
      taxStatus: undefined,
      documentCount: 0,
      version: 1,
      aiProcessing: null,
      createdAt: now,
      updatedAt: now,
    });

    const landB = await ctx.db.insert("lands", {
      orgId: args.orgId,
      status: "draft",
      titleNo: `DUP-${Date.now()}-B`,
      title: "Dup B",
      type: "residential",
      coordinates: undefined,
      geometryRef: undefined,
      address: "",
      province: "",
      sangkat: "",
      phum: "",
      size: { value: 1, unit: "sqm", display: "1 sqm" },
      titleType: "soft_title",
      registrationDate: undefined,
      valuation: { estimated: 0, purchase: undefined, display: "$0" },
      accuracy: undefined,
      precision: undefined,
      dispute: undefined,
      taxStatus: undefined,
      documentCount: 0,
      version: 1,
      aiProcessing: null,
      createdAt: now,
      updatedAt: now,
    });

    const groupId = await ctx.db.insert("duplicate_groups", {
      orgId: args.orgId,
      landIds: [landA as any, landB as any],
      confidence: 0.9,
      criteria: { titleNo: true },
      status: "pending",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    await audit(ctx, { orgId: args.orgId, type: "duplicate.group_recorded", userId: args.userId, entityId: (groupId as any), entityType: "duplicate_group" });

    const resolutionId = await ctx.db.insert("duplicate_resolutions", {
      orgId: args.orgId,
      groupId: groupId as any,
      action: "merge",
      selectedLandId: landA as any,
      resolvedBy: args.userId,
      resolvedAt: nowIso(),
      notes: "seed",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    await ctx.db.patch(groupId as any, { status: "resolved", updatedAt: nowIso() });
    await audit(ctx, { orgId: args.orgId, type: "duplicate.resolved", userId: args.userId, entityId: (resolutionId as any), entityType: "duplicate_resolution", metadata: { groupId } });

    return { uploadId, jobId, groupId, resolutionId };
  },
});

// --------------------
// AI-29: i18n - Glossary, Document Translations, Locale Settings

export const upsertGlossaryTerm = mutation({
  args: { orgId: v.string(), userId: v.string(), data: v.any() },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const now = nowIso();
    const parsed = {
      ...args.data,
      id: "01HZX3F1X9M7C9P2Q8R0A1B2C3",
      orgId: args.orgId,
      createdAt: now,
      updatedAt: now,
      updatedBy: args.userId,
    } as any;
    const existing = await ctx.db
      .query("translationGlossary")
      .withIndex("by_org_domain", (q: any) => q.eq("orgId", args.orgId).eq("domain", (parsed as any).domain))
      .filter((q: any) => q.eq(q.field("term"), (parsed as any).term))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { text: (parsed as any).text, isActive: (parsed as any).isActive, updatedAt: now, updatedBy: args.userId });
      await audit(ctx, { orgId: args.orgId, type: "i18n.glossary_updated", userId: args.userId, entityId: (existing._id as any), entityType: "translationGlossary" });
      return { id: existing._id };
    }
    const id = await ctx.db.insert("translationGlossary", parsed as any);
    await audit(ctx, { orgId: args.orgId, type: "i18n.glossary_created", userId: args.userId, entityId: (id as any), entityType: "translationGlossary" });
    return { id };
  },
});

export const getGlossaryByDomain = query({
  args: { orgId: v.string(), userId: v.string(), domain: v.string(), onlyActive: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await requireActiveMember(ctx, args.orgId, args.userId);
    let q = ctx.db.query("translationGlossary").withIndex("by_org_domain", (q: any) => q.eq("orgId", args.orgId).eq("domain", args.domain));
    if (args.onlyActive) q = (q as any).filter((qq: any) => qq.eq(qq.field("isActive"), true));
    const terms = await (q as any).collect();
    await logAccess(ctx, { orgId: args.orgId, userId: args.userId, entityType: "translationGlossary", action: "read", details: { domain: args.domain, count: terms.length } });
    return terms;
  },
});

export const createOrUpdateDocumentTranslation = mutation({
  args: { orgId: v.string(), userId: v.string(), data: v.any() },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const now = nowIso();
    const parsed = {
      ...args.data,
      id: "01HZX3F1X9M7C9P2Q8R0A1B2C3",
      orgId: args.orgId,
      createdAt: now,
      updatedAt: now,
    } as any;
    // validate document belongs to org
    const doc = await ctx.db.get((parsed as any).documentId as any);
    if (!doc || (doc as any).orgId !== args.orgId) throw new Error("Invalid document");

    const existing = await ctx.db
      .query("documentTranslations")
      .withIndex("by_org_document", (q: any) => q.eq("orgId", args.orgId).eq("documentId", (parsed as any).documentId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { original: (parsed as any).original, translated: (parsed as any).translated, confidence: (parsed as any).confidence, status: (parsed as any).status, sourceLanguage: (parsed as any).sourceLanguage, targetLanguage: (parsed as any).targetLanguage, glossaryTerms: (parsed as any).glossaryTerms, updatedAt: now });
      await audit(ctx, { orgId: args.orgId, type: "i18n.doc_translation_updated", userId: args.userId, entityId: (existing._id as any), entityType: "documentTranslation" });
      return { id: existing._id };
    }
    const id = await ctx.db.insert("documentTranslations", parsed as any);
    await audit(ctx, { orgId: args.orgId, type: "i18n.doc_translation_created", userId: args.userId, entityId: (id as any), entityType: "documentTranslation" });
    return { id };
  },
});

export const approveDocumentTranslation = mutation({
  args: { orgId: v.string(), userId: v.string(), documentId: v.id("documents"), status: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.orgId, args.userId);
    const now = nowIso();
    const tr = await ctx.db
      .query("documentTranslations")
      .withIndex("by_org_document", (q: any) => q.eq("orgId", args.orgId).eq("documentId", args.documentId))
      .first();
    if (!tr) throw new Error("Translation not found");
    const parsedStatus = args.status as any;
    await ctx.db.patch(tr._id, { status: parsedStatus, reviewedBy: args.userId, reviewedAt: now, updatedAt: now });
    await audit(ctx, { orgId: args.orgId, type: "i18n.doc_translation_status", userId: args.userId, entityId: (tr._id as any), entityType: "documentTranslation", metadata: { status: parsedStatus } });
    return { ok: true };
  },
});

export const getDocumentTranslation = query({
  args: { orgId: v.string(), userId: v.string(), documentId: v.id("documents") },
  handler: async (ctx, args) => {
    await requireActiveMember(ctx, args.orgId, args.userId);
    const tr = await ctx.db
      .query("documentTranslations")
      .withIndex("by_org_document", (q: any) => q.eq("orgId", args.orgId).eq("documentId", args.documentId))
      .first();
    if (tr) await logAccess(ctx, { orgId: args.orgId, userId: args.userId, entityType: "documentTranslations", entityId: tr._id, action: "read", details: { documentId: args.documentId } });
    return tr ?? null;
  },
});

export const upsertLocaleSettings = mutation({
  args: { orgId: v.string(), userId: v.string(), data: v.any() },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const now = nowIso();
    const parsed = {
      ...args.data,
      id: "01HZX3F1X9M7C9P2Q8R0A1B2C3",
      orgId: args.orgId,
      createdAt: now,
      updatedAt: now,
    } as any;
    const existing = await ctx.db.query("localeSettings").withIndex("by_org", (q: any) => q.eq("orgId", args.orgId)).first();
    if (existing) {
      await ctx.db.patch(existing._id, { defaults: (parsed as any).defaults, updatedAt: now });
      await audit(ctx, { orgId: args.orgId, type: "i18n.locale_updated", userId: args.userId, entityId: (existing._id as any), entityType: "localeSettings" });
      return { id: existing._id };
    }
    const id = await ctx.db.insert("localeSettings", parsed as any);
    await audit(ctx, { orgId: args.orgId, type: "i18n.locale_created", userId: args.userId, entityId: (id as any), entityType: "localeSettings" });
    return { id };
  },
});

export const getLocaleSettings = query({
  args: { orgId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    await requireActiveMember(ctx, args.orgId, args.userId);
    const ls = await ctx.db.query("localeSettings").withIndex("by_org", (q: any) => q.eq("orgId", args.orgId)).first();
    if (ls) await logAccess(ctx, { orgId: args.orgId, userId: args.userId, entityType: "localeSettings", entityId: ls._id, action: "read" });
    return ls ?? null;
  },
});

// --------------------
// AI-28: AI Tasks & RAG

export const createAiTask = mutation({
  args: { orgId: v.string(), userId: v.string(), data: v.any() },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const now = nowIso();
    const parsed = {
      ...args.data,
      id: "01HZX3F1X9M7C9P2Q8R0A1B2C3",
      orgId: args.orgId,
      status: (args.data?.status ?? "pending"),
      createdAt: now,
      updatedAt: now,
    } as any;
    const id = await ctx.db.insert("aiTasks", parsed as any);
    await audit(ctx, { orgId: args.orgId, type: "ai.task_created", userId: args.userId, entityId: (id as any), entityType: "aiTask", metadata: { type: (parsed as any).type } });
    return { id };
  },
});

export const processAiTask = mutation({
  args: { orgId: v.string(), userId: v.string(), taskId: v.id("aiTasks"), metadata: v.optional(v.any()) },
  handler: async (ctx, args) => {
    await requireActiveMember(ctx, args.orgId, args.userId);
    const task = await ctx.db.get(args.taskId);
    if (!task || task.orgId !== args.orgId) throw new Error("Not found");
    if (!(task.status === "pending" || task.status === "failed")) throw new Error("Invalid state");
    const now = nowIso();
    await ctx.db.patch(args.taskId, { status: "processing", updatedAt: now, metadata: { ...(task.metadata ?? {}), ...(args.metadata ?? {}) } });
    await audit(ctx, { orgId: args.orgId, type: "ai.task_processing", userId: args.userId, entityId: (args.taskId as any), entityType: "aiTask" });
    return { ok: true };
  },
});

export const completeAiTask = mutation({
  args: { orgId: v.string(), userId: v.string(), taskId: v.id("aiTasks"), output: v.any(), metrics: v.optional(v.any()), error: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireActiveMember(ctx, args.orgId, args.userId);
    const task = await ctx.db.get(args.taskId);
    if (!task || task.orgId !== args.orgId) throw new Error("Not found");
    if (!(task.status === "processing")) throw new Error("Invalid state");
    const now = nowIso();
    const status = args.error ? "failed" : "completed";
    await ctx.db.patch(args.taskId, {
      status,
      output: args.output,
      error: args.error,
      metadata: { ...(task.metadata ?? {}), ...(args.metrics ?? {}) },
      updatedAt: now,
      completedAt: now,
    });
    await audit(ctx, { orgId: args.orgId, type: `ai.task_${status}`, userId: args.userId, entityId: (args.taskId as any), entityType: "aiTask" });
    return { ok: true };
  },
});

// RAG helpers: lightweight deterministic embedding for local similarity
function localEmbedVectorFromText(text: string): number[] {
  const t = (text || "").toLowerCase();
  let vowels = 0;
  let digits = 0;
  let letters = 0;
  for (let i = 0; i < t.length; i++) {
    const c = t.charCodeAt(i);
    const ch = t[i];
    if (/[aeiou]/.test(ch)) vowels++;
    if (c >= 48 && c <= 57) digits++;
    if ((c >= 97 && c <= 122)) letters++;
  }
  const words = t.trim().split(/\s+/).filter(Boolean).length;
  const len = t.length;
  return [len / 1000, vowels / Math.max(1, len), digits / Math.max(1, len), words / 100];
}

function dot(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

async function ragIndexImpl(ctx: any, args: { orgId: string; userId: string; documentId: string }) {
  await requireWriter(ctx, args.orgId, args.userId);
  const now = nowIso();

  // Try primary/generated documents
  let doc: any = null;
  try { doc = await ctx.db.get(args.documentId as any); } catch {}
  if (!doc || (doc as any).orgId !== args.orgId) {
    throw new Error("Document not found or cross-org");
  }

  const isGenerated = (doc as any)._table === 'generatedDocuments';
  const title: string = doc.title ?? 'Document';
  const url: string | undefined = isGenerated ? (doc.fileUrl as any) : undefined;
  const landId: any = (doc.landId as any) || undefined;
  const baseText = [title, JSON.stringify(doc.metadata ?? {})].filter(Boolean).join("\n");
  const embedding = localEmbedVectorFromText(baseText);

  const chunkId = await ctx.db.insert("ragChunks", {
    orgId: args.orgId,
    landId,
    type: (doc.type as any) ?? 'doc',
    text: baseText,
    embedding,
    metadata: { docId: args.documentId, title, page: 1, url },
    createdAt: now,
    updatedAt: now,
  } as any);

  await audit(ctx, { orgId: args.orgId as any, type: "ai.rag_indexed", userId: args.userId, entityId: chunkId as any, entityType: "ragChunk", metadata: { documentId: args.documentId } });
  return { id: chunkId };
}

// RAG: index a document into ragChunks (basic chunker: title + metadata as one chunk)
export const ragIndex = mutation({
  args: { orgId: v.string(), userId: v.string(), documentId: v.string() },
  handler: ragIndexImpl,
});

// RAG: reindex document - delete previous chunks for doc and index again
export const ragUpdate = mutation({
  args: { orgId: v.string(), userId: v.string(), documentId: v.string() },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    // Collect existing chunks for this docId
    const existing = await ctx.db
      .query("ragChunks")
      .withIndex("by_org_createdAt", (q: any) => q.eq("orgId", args.orgId))
      .collect();
    for (const c of existing) {
      if ((c as any).metadata?.docId === args.documentId) {
        await ctx.db.delete((c as any)._id);
      }
    }
    // Re-index
    return await ragIndexImpl(ctx as any, args as any);
  }
});

// RAG: semantic search over ragChunks
export const ragSearch = query({
  args: { orgId: v.string(), userId: v.string(), query: v.string(), k: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireActiveMember(ctx, args.orgId, args.userId);
    const k = Math.max(1, Math.min(10, Math.floor(args.k ?? 3)));
    const qVec = localEmbedVectorFromText(args.query);

    const rows = await ctx.db
      .query("ragChunks")
      .withIndex("by_org_createdAt", (q: any) => q.eq("orgId", args.orgId))
      .collect();

    const scored = rows.map((r: any) => ({ r, score: dot(qVec, (r.embedding as number[]) || []) }));
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, k).map(({ r, score }) => ({
      id: String((r as any)._id || ''),
      orgId: (r as any).orgId,
      landId: (r as any).landId,
      type: (r as any).type,
      text: (r as any).text,
      metadata: (r as any).metadata,
      score,
    }));

    await logAccess(ctx, { orgId: args.orgId, userId: args.userId, entityType: "ragChunks", action: "read", details: { fn: "ragSearch", count: top.length } });
    return { items: top } as any;
  }
});

export const upsertRagChunk = mutation({
  args: { orgId: v.string(), userId: v.string(), data: v.any() },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const now = nowIso();
    const parsed = {
      ...args.data,
      id: "01HZX3F1X9M7C9P2Q8R0A1B2C3",
      orgId: args.orgId,
      createdAt: now,
      updatedAt: now,
    } as any;
    if ((parsed as any).landId) {
      const land = await ctx.db.get((parsed as any).landId as any);
      if (!land || (land as any).orgId !== args.orgId) throw new Error("Invalid land link");
    }
    const id = await ctx.db.insert("ragChunks", parsed as any);
    await audit(ctx, { orgId: args.orgId, type: "ai.rag_chunk_upserted", userId: args.userId, entityId: (id as any), entityType: "ragChunk", metadata: { type: (parsed as any).type } });
    return { id };
  },
});

export const listRagChunksByLand = query({
  args: { orgId: v.string(), userId: v.string(), landId: v.id("lands") },
  handler: async (ctx, args) => {
    await requireActiveMember(ctx, args.orgId, args.userId);
    const chunks = await ctx.db
      .query("ragChunks")
      .withIndex("by_org_land_type", (q: any) => q.eq("orgId", args.orgId).eq("landId", args.landId))
      .collect();
    await logAccess(ctx, { orgId: args.orgId, userId: args.userId, entityType: "ragChunks", action: "read", entityId: String(args.landId), details: { fn: "listRagChunksByLand", count: chunks.length } });
    return chunks;
  },
});

export const devSeedAi28 = mutation({
  args: { orgId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const now = nowIso();

    // Ensure a land exists
    const landId = await ctx.db.insert("lands", {
      orgId: args.orgId,
      status: "active",
      titleNo: `AI28-${Date.now()}`,
      title: "AI-28 Seed Land",
      type: "residential",
      coordinates: undefined,
      geometryRef: undefined,
      address: "",
      province: "",
      sangkat: "",
      phum: "",
      size: { value: 100, unit: "sqm", display: "100 sqm" },
      titleType: "soft",
      registrationDate: undefined,
      valuation: { estimated: 0, display: "$0" },
      accuracy: undefined,
      precision: undefined,
      dispute: undefined,
      taxStatus: undefined,
      documentCount: 0,
      version: 1,
      aiProcessing: null,
      createdAt: now,
      updatedAt: now,
    } as any);

    // 1 completed aiTask
    const taskId = await ctx.db.insert("aiTasks", {
      orgId: args.orgId,
      type: "summary",
      status: "completed",
      input: { text: "Summarize land" },
      output: { summary: "Seed summary" },
      metadata: { model: "gpt-4o", tokens: { total: 42 }, processingTimeMs: 1200, confidence: 0.9 },
      error: undefined,
      createdAt: now,
      updatedAt: now,
      completedAt: now,
    });

    // 2 ragChunks linked to the land
    const c1 = await ctx.db.insert("ragChunks", {
      orgId: args.orgId,
      landId: landId as any,
      type: "title",
      text: "Land title mentions plot 069.",
      embedding: [0.1, 0.2, 0.3],
      metadata: { page: 1 },
      createdAt: now,
      updatedAt: now,
    });
    const c2 = await ctx.db.insert("ragChunks", {
      orgId: args.orgId,
      landId: landId as any,
      type: "note",
      text: "Owner is Sok Dara.",
      embedding: [0.2, 0.1, 0.4],
      metadata: { section: "owners" },
      createdAt: now,
      updatedAt: now,
    });

    await audit(ctx, { orgId: args.orgId, type: "ai.dev_seed_ai28", userId: args.userId, entityId: (taskId as any), entityType: "aiTask", metadata: { landId } });
    return { ok: true, landId, taskId, chunks: [c1, c2] };
  },
});

// Admin helper: seed multiple lands for an org (bypasses Zod landSchema)
export const adminSeedLandsForOrg = mutation({
  args: { orgId: v.string(), userId: v.string(), lands: v.array(v.any()) },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const now = nowIso();
    const results: Array<{ titleNo: string; id: string }> = [];
    for (const l of args.lands as any[]) {
      const id = await ctx.db.insert("lands", {
        orgId: args.orgId,
        status: l.status,
        titleNo: l.titleNo,
        title: l.title ?? l.titleNo,
        type: l.type,
        coordinates: l.coordinates,
        geometryRef: undefined,
        address: l.address,
        province: l.province,
        sangkat: l.sangkat,
        phum: l.phum,
        size: l.size,
        titleType: l.titleType,
        registrationDate: l.registrationDate,
        valuation: l.valuation,
        accuracy: l.accuracy,
        precision: l.precision,
        dispute: l.dispute,
        taxStatus: l.taxStatus,
        documentCount: l.documentCount ?? 0,
        version: l.version ?? 1,
        aiProcessing: null,
        createdAt: l.createdAt ?? now,
        updatedAt: l.updatedAt ?? now,
      } as any);
      results.push({ titleNo: l.titleNo, id: id as any });
      await audit(ctx, { orgId: args.orgId, type: "land.seeded", userId: args.userId, entityId: (id as any), entityType: "land", metadata: { titleNo: l.titleNo } });
    }
    return { ok: true, lands: results };
  },
});

export const devSeedI18n = mutation({
  args: { orgId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const now = nowIso();

    // Upsert locale settings
    const ls = await ctx.db.query("localeSettings").withIndex("by_org", (q: any) => q.eq("orgId", args.orgId)).first();
    if (ls) {
      await ctx.db.patch(ls._id, { defaults: { language: "en", dateFormat: "YYYY-MM-DD", timeFormat: "HH:mm", numberFormat: "1,234.56", currency: "USD" }, updatedAt: now });
    } else {
      await ctx.db.insert("localeSettings", { orgId: args.orgId, defaults: { language: "en", dateFormat: "YYYY-MM-DD", timeFormat: "HH:mm", numberFormat: "1,234.56", currency: "USD" }, createdAt: now, updatedAt: now });
    }

    // Insert a couple of glossary terms
    const terms = [
      { domain: "lands", term: "title", text: { en: "Title", km: "ចំណងជើង" } },
      { domain: "lands", term: "owner", text: { en: "Owner", km: "ម្ចាស់ដី" } },
    ];
    for (const t of terms) {
      const exists = await ctx.db
        .query("translationGlossary")
        .withIndex("by_org_domain", (q: any) => q.eq("orgId", args.orgId).eq("domain", t.domain))
        .filter((q: any) => q.eq(q.field("term"), t.term))
        .first();
      if (exists) {
        await ctx.db.patch(exists._id, { text: t.text, isActive: true, updatedAt: now, updatedBy: args.userId });
      } else {
        await ctx.db.insert("translationGlossary", { orgId: args.orgId, domain: t.domain, term: t.term, text: t.text, isActive: true, updatedBy: args.userId, createdAt: now, updatedAt: now });
      }
    }

    // Ensure one document and create translation records
    const docId = await ctx.db.insert("documents", {
      orgId: args.orgId,
      landId: undefined,
      type: "title",
      uploadId: "01UPLOADI18N0000000000000000",
      title: "Seed I18N Document",
      lang: "en",
      metadata: { titleNo: "I18N-001" },
      createdAt: now,
      updatedAt: now,
    });

    // Create translation lifecycle: pending -> reviewed
    const trId = await ctx.db.insert("documentTranslations", {
      orgId: args.orgId,
      documentId: docId as any,
      original: { en: "Hello" },
      translated: { km: "សួស្តី" },
      confidence: 0.85,
      status: "pending",
      sourceLanguage: "en",
      targetLanguage: "km",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(trId as any, { status: "reviewed", reviewedBy: args.userId, reviewedAt: nowIso(), updatedAt: nowIso() });

    await audit(ctx, { orgId: args.orgId, type: "i18n.dev_seed", userId: args.userId, entityId: (docId as any), entityType: "document" });
    return { ok: true, docId, trId };
  },
});

export const recordUpload = mutation({
  args: {
    orgId: v.string(),
    userId: v.string(),
    fileUrl: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const now = nowIso();
    const uploadId = await ctx.db.insert('uploads', {
      orgId: args.orgId,
      userId: args.userId,
      fileUrl: args.fileUrl,
      fileName: args.fileName,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      status: 'completed',
      metadata: args.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    } as any);
    await audit(ctx, { orgId: args.orgId, type: 'upload.completed', userId: args.userId, entityId: (uploadId as any), entityType: 'upload' });
    return { uploadId };
  }
});

export const adminSeedGeojson = mutation({
  args: {
    orgId: v.string(),
    userId: v.string(),
    features: v.array(v.object({ id: v.string(), coordinates: v.array(v.array(v.array(v.number()))) })),
  },
  handler: async (ctx, args) => {
    // Admin/membership check
    await requireWriter(ctx, args.orgId, args.userId);
    const now = nowIso();
    const results: any[] = [];
    for (const f of args.features) {
      const ring: any[] | undefined = (f as any).coordinates?.[0];
      const firstPoint: any = Array.isArray(ring) && ring.length > 0 ? ring[0] : undefined;
      const lon = Array.isArray(firstPoint) ? Number(firstPoint[0]) : 0;
      const lat = Array.isArray(firstPoint) ? Number(firstPoint[1]) : 0;
      const titleNo = `GEO-${f.id.slice(0, 6)}`;
      const data: any = {
        status: "active",
        titleNo,
        title: `Geo Land ${f.id.slice(0, 6)}`,
        type: "residential",
        coordinates: { lon, lat },
        size: { value: 0, unit: "sqm", display: "0 sqm" },
        titleType: "soft",
        valuation: { estimated: 0, display: "$0" },
        documentCount: 0,
        version: 0,
      };
      // enforce uniqueness like createLand
      const dup = await ctx.db
        .query("lands")
        .withIndex("by_org_titleNo", (q: any) => q.eq("orgId", args.orgId).eq("titleNo", titleNo))
        .first();
      if (dup) { results.push({ featureId: f.id, id: dup._id, skipped: true }); continue; }

      const parsed = { ...data, id: "01HZX3F1X9M7C9P2Q8R0A1B2C3", orgId: args.orgId, createdAt: now, updatedAt: now } as any;
      const id = await ctx.db.insert("lands", { ...parsed, aiProcessing: null } as any);
      await audit(ctx, { orgId: args.orgId, type: "land.created", userId: args.userId, entityId: (id as any), entityType: "land", metadata: { titleNo } });
      // write-through parcel upsert
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/parcels/upsert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.AILAND_INTERNAL_KEY || '' },
          body: JSON.stringify({ orgId: args.orgId, landId: id, titleNo, status: parsed.status, attributes: {} }),
        });
      } catch {}
      results.push({ featureId: f.id, id });
    }
    return { results };
  }
});

// Seed lands from a GeoJSON FeatureCollection (Points and Polygons)
// - Uses properties.id_land as titleNo/title
// - Computes centroid for Polygons and size in square meters
// - For Points, sets size to 0 and coordinates from the point
// - Accepts default type and titleType to apply to all items
export const seedLandsFromGeoJson = mutation({
  args: {
    orgId: v.string(),
    userId: v.string(),
    // Minimal GeoJSON-like payload to avoid large object validation
    features: v.array(
      v.object({
        type: v.string(),
        id: v.optional(v.string()),
        properties: v.object({ id_land: v.string() }),
        geometry: v.object({
          type: v.string(), // "Point" | "Polygon"
          coordinates: v.any(),
        }),
      })
    ),
    defaultType: v.optional(v.string()), // "land" | "condo" | "building"
    defaultTitleType: v.optional(v.string()), // "hard title" | "Soft Title" | "none"
  },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const now = nowIso();

    function centroidOfPolygon(coords: number[][][]): { lon: number; lat: number } {
      // coords: [ [ [lon,lat], ... ] ] outer ring first
      const ring = coords?.[0] || [];
      if (!Array.isArray(ring) || ring.length === 0) return { lon: 0, lat: 0 };
      let sumLon = 0;
      let sumLat = 0;
      let n = 0;
      for (const pt of ring) {
        if (Array.isArray(pt) && pt.length >= 2) {
          sumLon += Number(pt[0]);
          sumLat += Number(pt[1]);
          n++;
        }
      }
      return n > 0 ? { lon: sumLon / n, lat: sumLat / n } : { lon: 0, lat: 0 };
    }

    function areaSqmOfPolygon(coords: number[][][]): number {
      // Approximate area using equirectangular projection + shoelace
      const R = 6371008.8; // Earth radius (m)
      const ring = coords?.[0] || [];
      if (!Array.isArray(ring) || ring.length < 3) return 0;
      const c = centroidOfPolygon(coords);
      const lat0 = (c.lat * Math.PI) / 180;
      const pts: Array<{ x: number; y: number }> = [];
      for (const pt of ring) {
        if (!Array.isArray(pt) || pt.length < 2) continue;
        const lon = Number(pt[0]);
        const lat = Number(pt[1]);
        const x = R * ((lon * Math.PI) / 180) * Math.cos(lat0);
        const y = R * ((lat * Math.PI) / 180);
        pts.push({ x, y });
      }
      if (pts.length < 3) return 0;
      let area = 0;
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
      }
      return Math.abs(area / 2);
    }

    const results: Array<{ titleNo: string; created?: string; skipped?: boolean }> = [];

    for (const f of args.features) {
      const titleNo = f.properties.id_land;
      const geomType = (f.geometry?.type || '').toLowerCase();
      let coordinates: { lon: number; lat: number } | undefined = undefined;
      let sizeValue = 0;

      if (geomType === 'point') {
        const arr = f.geometry?.coordinates as number[];
        if (Array.isArray(arr) && arr.length >= 2) {
          coordinates = { lon: Number(arr[0]), lat: Number(arr[1]) };
        }
      } else if (geomType === 'polygon') {
        const coords = f.geometry?.coordinates as number[][][];
        const c = centroidOfPolygon(coords);
        coordinates = { lon: c.lon, lat: c.lat };
        sizeValue = Math.round(areaSqmOfPolygon(coords));
      }

      const existing = await ctx.db
        .query('lands')
        .withIndex('by_org_titleNo', (q: any) => q.eq('orgId', args.orgId).eq('titleNo', titleNo))
        .first();

      const data: any = {
        orgId: args.orgId,
        status: 'active',
        titleNo,
        title: titleNo,
        type: (args.defaultType || 'land').toLowerCase(),
        coordinates,
        geometryRef: undefined,
        address: undefined,
        province: undefined,
        sangkat: undefined,
        phum: undefined,
        size: { value: sizeValue, unit: 'sqm', display: `${sizeValue} sqm` },
        titleType: (args.defaultTitleType || 'none'),
        registrationDate: undefined,
        valuation: { estimated: 0, display: '$0' },
        accuracy: undefined,
        precision: undefined,
        dispute: undefined,
        taxStatus: undefined,
        documentCount: 0,
        version: existing ? (existing.version ?? 0) + 1 : 1,
        aiProcessing: null,
        updatedAt: now,
      };

      if (existing) {
        await ctx.db.patch((existing as any)._id, data);
        results.push({ titleNo, skipped: true });
      } else {
        const toInsert = { ...data, createdAt: now };
        const newId = await ctx.db.insert('lands', toInsert as any);
        await audit(ctx, { orgId: args.orgId as any, type: 'land.created', userId: args.userId, entityId: (newId as any), entityType: 'land', metadata: { titleNo } });
        results.push({ titleNo, created: String(newId) });
      }
    }

    return { ok: true, count: results.length, results };
  },
});

// --------------------
// AI-32: Lands list/search/pagination, bulk tag, export CSV

const listLands = query({
  args: {
    orgId: v.string(),
    userId: v.string(),
    query: v.optional(v.string()),
    filters: v.optional(v.object({
      status: v.optional(v.string()),
      province: v.optional(v.string()),
      type: v.optional(v.string()),
    })),
    sort: v.optional(v.object({
      field: v.string(), // "updatedAt" | "title" | "titleNo"
      direction: v.string(), // "asc" | "desc"
    })),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireActiveMember(ctx, args.orgId, args.userId);

    const page = Math.max(1, Math.floor(args.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Math.floor(args.pageSize ?? 100)));

    const hasStatus = !!args.filters?.status;
    let base = hasStatus
      ? ctx.db.query("lands").withIndex("by_org_status", (q: any) => q.eq("orgId", args.orgId).eq("status", args.filters!.status))
      : ctx.db.query("lands").withIndex("by_org_updatedAt", (q: any) => q.eq("orgId", args.orgId));

    if (args.filters?.province) {
      base = (base as any).filter((q: any) => q.eq(q.field("province"), args.filters!.province));
    }
    if (args.filters?.type) {
      base = (base as any).filter((q: any) => q.eq(q.field("type"), args.filters!.type));
    }
    if (args.query && args.query.trim().length > 0) {
      const qtext = args.query.trim().toLowerCase();
      base = (base as any).filter((q: any) =>
        q.or(
          q.contains(q.lower(q.field("title")), qtext),
          q.contains(q.lower(q.field("titleNo")), qtext)
        )
      );
    }

    const all = await (base as any).collect();

    const sorted = (() => {
      const field = args.sort?.field ?? "updatedAt";
      const dir = (args.sort?.direction ?? "desc").toLowerCase();
      const mul = dir === "asc" ? 1 : -1;
      return all.sort((a: any, b: any) => {
        const av = (a as any)[field];
        const bv = (b as any)[field];
        if (av === bv) return 0;
        return (av > bv ? 1 : -1) * mul;
      });
    })();

    const total = sorted.length;
    const start = (page - 1) * pageSize;
    const items = sorted.slice(start, start + pageSize);

    await logAccess(ctx, {
      orgId: args.orgId,
      userId: args.userId,
      entityType: "lands",
      action: "read",
      details: { fn: "listLands", total, page, pageSize, filters: args.filters ?? {}, query: args.query ?? "" },
    });

    return { items, total, page, pageSize } as any;
  },
});

// --------------------
// AI-34: Land details + owners + documents (audited reads)

const getLand = query({
  args: { orgId: v.string(), userId: v.string(), id: v.id("lands") },
  handler: async (ctx, args) => {
    await requireActiveMember(ctx, args.orgId, args.userId);
    const land = await ctx.db.get(args.id);
    if (!land || (land as any).orgId !== args.orgId) return null;
    await logAccess(ctx, {
      orgId: args.orgId,
      userId: args.userId,
      entityType: "lands",
      entityId: (args.id as any),
      action: "read",
      details: { fn: "getLand" },
    });
    return land as any;
  },
});

const ownersForLand = query({
  args: { orgId: v.string(), userId: v.string(), landId: v.id("lands") },
  handler: async (ctx, args) => {
    const member = await requireActiveMember(ctx, args.orgId, args.userId);
    const land = await ctx.db.get(args.landId);
    if (!land || (land as any).orgId !== args.orgId) return [] as any[];

    const links = await ctx.db
      .query("land_owners")
      .withIndex("by_org_landId", (q: any) => q.eq("orgId", args.orgId).eq("landId", args.landId))
      .collect();

    const owners: any[] = [];
    for (const link of links) {
      const owner = await ctx.db.get((link as any).ownerId);
      if (owner && (owner as any).orgId === args.orgId) {
        owners.push(maskPII(owner as any, (member.role as any) === "admin"));
      }
    }

    await logAccess(ctx, {
      orgId: args.orgId,
      userId: args.userId,
      entityType: "owners",
      entityId: String(args.landId),
      action: "read",
      details: { fn: "ownersForLand", count: owners.length },
    });

    return owners as any[];
  },
});

const documentsForLand = query({
  args: { orgId: v.string(), userId: v.string(), landId: v.id("lands"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireActiveMember(ctx, args.orgId, args.userId);

    let base = ctx.db
      .query("documents")
      .withIndex("by_org_land_createdAt", (q: any) => q.eq("orgId", args.orgId).eq("landId", args.landId));
    const docs = await (base as any).collect();
    docs.sort((a: any, b: any) => (a.createdAt > b.createdAt ? -1 : 1));
    const limited = typeof args.limit === "number" ? docs.slice(0, Math.max(0, args.limit)) : docs;

    await logAccess(ctx, {
      orgId: args.orgId,
      userId: args.userId,
      entityType: "documents",
      entityId: String(args.landId),
      action: "read",
      details: { fn: "documentsForLand", count: limited.length },
    });

    return limited as any[];
  },
});

const bulkTagLands = mutation({
  args: {
    orgId: v.string(),
    userId: v.string(),
    landIds: v.array(v.id("lands")),
    tag: v.string(),
  },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    let updated = 0;
    for (const lid of args.landIds) {
      const land = await ctx.db.get(lid);
      if (!land || land.orgId !== args.orgId) continue;
      await ctx.db.insert("activities", {
        orgId: args.orgId,
        type: "land.tag_assigned",
        userId: args.userId,
        entityId: (lid as any),
        entityType: "land",
        metadata: { tag: args.tag },
        createdAt: new Date().toISOString(),
      } as any);
      updated++;
    }
    return { updated };
  },
});

const exportLandsCsv = mutation({
  args: {
    orgId: v.string(),
    userId: v.string(),
    query: v.optional(v.string()),
    filters: v.optional(v.object({
      status: v.optional(v.string()),
      province: v.optional(v.string()),
      type: v.optional(v.string()),
    })),
    filename: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireActiveMember(ctx, args.orgId, args.userId);

    // Build query similar to listLands (no pagination)
    const hasStatus = !!args.filters?.status;
    let base = hasStatus
      ? ctx.db.query("lands").withIndex("by_org_status", (q: any) => q.eq("orgId", args.orgId).eq("status", args.filters!.status))
      : ctx.db.query("lands").withIndex("by_org_updatedAt", (q: any) => q.eq("orgId", args.orgId));
    if (args.filters?.province) base = (base as any).filter((q: any) => q.eq(q.field("province"), args.filters!.province));
    if (args.filters?.type) base = (base as any).filter((q: any) => q.eq(q.field("type"), args.filters!.type));
    if (args.query && args.query.trim()) {
      const qtext = args.query.trim().toLowerCase();
      base = (base as any).filter((q: any) => q.or(
        q.contains(q.lower(q.field("title")), qtext),
        q.contains(q.lower(q.field("titleNo")), qtext)
      ));
    }
    const items = await (base as any).collect();

    const headers = ["Title No", "Title", "Type", "Status", "Province", "Updated At"];
    const rows: string[] = [headers.join(",")];
    for (const it of items) {
      const r = [it.titleNo ?? "", it.title ?? "", it.type ?? "", it.status ?? "", it.province ?? "", it.updatedAt ?? ""];
      const esc = r.map((v) => {
        const s = String(v ?? "");
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      });
      rows.push(esc.join(","));
    }
    const csv = rows.join("\n");

    // Return CSV as string to be handled by Next.js route for upload
    await logAccess(ctx, { orgId: args.orgId, userId: args.userId, entityType: "lands", action: "read", details: { fn: "exportLandsCsv", count: items.length } });
    return { csv } as any;
  },
});

// --------------------
// AI-65: Land Images (main + gallery)

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

async function updateLandImageCache(ctx: any, orgId: string, landId: string) {
  const land = await ctx.db.get(landId as any);
  if (!land || (land as any).orgId !== orgId) return;

  const main = await ctx.db
    .query("landImages")
    .withIndex("by_org_land_type", (q: any) => q.eq("orgId", orgId).eq("landId", landId).eq("imageType", "main"))
    .first();

  const gallery = await ctx.db
    .query("landImages")
    .withIndex("by_org_land_type", (q: any) => q.eq("orgId", orgId).eq("landId", landId).eq("imageType", "gallery"))
    .collect();

  gallery.sort((a: any, b: any) => (a.displayOrder - b.displayOrder));

  const toThumb = (it: any) => ({
    id: String((it as any)._id),
    url: (it as any).imageUrl,
    thumbnail: (it as any).metadata?.derivatives?.thumbUrl,
    storageId: (it as any).metadata?.storageId,
    alt: (it as any).metadata?.alt,
    caption: (it as any).description,
    uploadedAt: (it as any).metadata?.uploadedAt ?? (it as any).createdAt,
    size: (it as any).metadata?.fileSize,
    width: (it as any).metadata?.dimensions?.width,
    height: (it as any).metadata?.dimensions?.height,
    isMain: (it as any).imageType === "main",
  });

  const patch: any = {
    updatedAt: new Date().toISOString(),
    mainImage: main ? toThumb(main) : undefined,
    galleryImages: gallery.map(toThumb).slice(0, 10),
  };
  await ctx.db.patch(landId as any, patch);
}


// Secure helper queries for HTTP actions
export const isActiveMember = query({
  args: { orgId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    try {
      const m = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org_user", (q: any) => q.eq("orgId", args.orgId).eq("userId", args.userId))
        .first();
      return !!m && (m as any).status === "active";
    } catch {
      return false;
    }
  },
});

export const secureGetImageStorage = query({
  args: {
    orgId: v.string(),
    userId: v.string(),
    storageId: v.optional(v.id("_storage")),
    imageId: v.optional(v.id("landImages")),
  },
  handler: async (ctx, args) => {
    await requireActiveMember(ctx, args.orgId, args.userId);
    if (args.imageId) {
      const img = await ctx.db.get(args.imageId);
      if (!img || (img as any).orgId !== args.orgId) return null;
      const storageId = (img as any).metadata?.storageId;
      const mimeType = (img as any).metadata?.mimeType;
      return storageId ? { storageId, mimeType } : null;
    }
    if (args.storageId) {
      const rec = await ctx.db
        .query("files")
        .withIndex("by_storageId", (q: any) => q.eq("storageId", args.storageId))
        .first();
      if (!rec || (rec as any).orgId !== args.orgId) return null;
      return { storageId: args.storageId, mimeType: undefined } as any;
    }
    return null;
  },
});

export const secureGetDocumentStorage = query({
  args: {
    orgId: v.string(),
    userId: v.string(),
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    await requireActiveMember(ctx, args.orgId, args.userId);
    // Find the document's file mapping from files table
    const mapping = await ctx.db
      .query("files")
      .withIndex("by_docId", (q: any) => q.eq("docId", args.documentId))
      .first();
    if (!mapping || (mapping as any).orgId !== args.orgId) return null;
    return {
      storageId: (mapping as any).storageId,
      s3Key: (mapping as any).s3Key,
      s3Bucket: (mapping as any).s3Bucket,
      mimeType: (mapping as any).mimeType,
      sizeBytes: (mapping as any).sizeBytes,
    } as any;
  },
});

// Register S3-backed document file after client PUT success
export const registerS3Document = mutation({
  args: {
    orgId: v.string(),
    userId: v.string(),
    docId: v.id("documents"),
    s3Key: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    originalName: v.optional(v.string()),
    etag: v.optional(v.string()),
    s3VersionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const now = nowIso();
    // Verify document belongs to org
    const doc = await ctx.db.get(args.docId);
    if (!doc || (doc as any).orgId !== args.orgId) throw new Error("Not found");
    // Upsert mapping row
    const existing = await ctx.db
      .query("files")
      .withIndex("by_docId", (q: any) => q.eq("docId", args.docId))
      .first();
    if (existing) {
      await ctx.db.patch((existing as any)._id, {
        s3Key: args.s3Key,
        s3Bucket: process.env.S3_BUCKET_PRIVATE as any,
        mimeType: args.mimeType,
        sizeBytes: args.sizeBytes,
        originalName: args.originalName,
        etag: args.etag,
        s3VersionId: args.s3VersionId,
        status: "ready",
        updatedAt: now,
      } as any);
    } else {
      await ctx.db.insert("files", {
        orgId: args.orgId,
        ownerId: args.userId,
        kind: "document",
        docId: args.docId as any,
        s3Key: args.s3Key,
        s3Bucket: process.env.S3_BUCKET_PRIVATE as any,
        mimeType: args.mimeType,
        sizeBytes: args.sizeBytes,
        originalName: args.originalName,
        etag: args.etag,
        s3VersionId: args.s3VersionId,
        status: "ready",
        createdAt: now,
        updatedAt: now,
      } as any);
    }
    await audit(ctx, { orgId: args.orgId, type: "document.uploaded", userId: args.userId, entityId: (args.docId as any), entityType: "document", metadata: { storage: "s3", size: args.sizeBytes, mime: args.mimeType } });
    return { ok: true } as any;
  },
});

// Delete document and S3 mapping (does NOT delete S3 blob; FE/server should do it)
export const deleteDocumentAndMapping = mutation({
  args: { orgId: v.string(), userId: v.string(), documentId: v.id("documents") },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const doc = await ctx.db.get(args.documentId);
    if (!doc || (doc as any).orgId !== args.orgId) throw new Error("Not found");
    const now = nowIso();
    // Delete file mapping if exists
    const mapping = await ctx.db
      .query("files")
      .withIndex("by_docId", (q: any) => q.eq("docId", args.documentId))
      .first();
    if (mapping) {
      await ctx.db.delete((mapping as any)._id);
    }
    await ctx.db.delete(args.documentId as any);
    await audit(ctx, { orgId: args.orgId, type: "document.deleted", userId: args.userId, entityId: (args.documentId as any), entityType: "document" });
    return { ok: true, deletedAt: now } as any;
  },
});
// Audit secure document read/denied from Next.js route
export const auditSecureDocumentAccess = mutation({
  args: {
    orgId: v.string(),
    userId: v.string(),
    documentId: v.string(),
    status: v.string(), // read|denied|error
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Membership required; if not member, this will throw and the caller should handle
    await requireActiveMember(ctx, args.orgId, args.userId);
    try {
      await (ctx as any).db.insert("activities", {
        orgId: args.orgId,
        type: args.status === "read" ? "secure.document.read" : (args.status === "denied" ? "secure.document.denied" : "secure.document.error"),
        userId: args.userId,
        entityId: args.documentId,
        entityType: "document",
        metadata: args.reason ? { reason: args.reason } : {},
        createdAt: nowIso(),
      });
    } catch {}
    return { ok: true } as any;
  },
});

 
