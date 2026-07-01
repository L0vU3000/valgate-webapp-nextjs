import { query, mutation, internalMutation, type QueryCtx } from "./_generated/server";
import { customCtx, customMutation, customQuery } from "convex-helpers/server/customFunctions";
import { wrapDatabaseReader, wrapDatabaseWriter, type Rules } from "convex-helpers/server/rowLevelSecurity";
import type { Id } from "./_generated/dataModel";
import { propertyTriggers } from "./trigger/property";
import "./trigger/documents";


type Role = "owner" | "admin" | "editor" | "viewer"; 

type RlsContext = QueryCtx & { isDevice?: boolean };

async function rlsRules(ctx: RlsContext) {
  const identity = await ctx.auth.getUserIdentity();
  const user = identity
    ? await (ctx.db as any).query("users").withIndex("by_clerkUserId", (q: any) => q.eq("clerkUserId", identity.subject)).unique()
    : null;
  const memberships = user
    ? await (ctx.db as any).query("org_members").withIndex("by_user", (q: any) => q.eq("userId", (user as any)._id)).collect()
    : [];
  const byOrg: Record<string, { role: Role; status: string }> = {};
  for (const m of memberships as any[]) byOrg[String((m as any).orgId)] = { role: (m as any).role as Role, status: (m as any).status };

  const hasActive = (orgId: Id<"orgs"> | string) => !!byOrg[String(orgId)] && byOrg[String(orgId)].status === "active";
  const roleAtLeast = (orgId: Id<"orgs"> | string, needed: Role) => {
    const order: Role[] = ["viewer", "editor", "admin", "owner"];
    const m = byOrg[String(orgId)];
    return !!m && m.status === "active" && order.indexOf(m.role) >= order.indexOf(needed);
  };
  
  const isDevice = ctx.isDevice ?? false;

  const rules: Rules<QueryCtx, any> = {
    users: {
      read: async () => !!identity,
      modify: async (_ctx: QueryCtx, doc: any) => !!user && String((user as any)._id) === String(doc._id),
      insert: async () => false,
    },
    orgs: {
      read: async (_ctx: QueryCtx, doc: any) => hasActive(doc._id),
      modify: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc._id, "admin"),
      insert: async () => false,
    },
    org_members: {
      read: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "viewer"),
      modify: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "admin"),
      insert: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "admin"),
    },
    property: {
      read: async (_ctx: QueryCtx, doc: any) => hasActive(doc.orgId) && !(doc as any).deletedAt,
      modify: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
      insert: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
    },
    property_location: {
      read: async (_ctx: QueryCtx, doc: any) => hasActive(doc.orgId),
      modify: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
      insert: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
    },
    property_location_point: {
      read: async (_ctx: QueryCtx, doc: any) => hasActive(doc.orgId),
      modify: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
      insert: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
    },
    property_location_boundary: {
      read: async (_ctx: QueryCtx, doc: any) => hasActive(doc.orgId),
      modify: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
      insert: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
    },
    property_location_feature: {
      read: async (_ctx: QueryCtx, doc: any) => hasActive(doc.orgId),
      modify: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
      insert: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
    },
    property_location_polygon: {
      read: async (_ctx: QueryCtx, doc: any) => hasActive(doc.orgId),
      modify: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
      insert: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
    },
    document: {
      read: async (_ctx: QueryCtx, doc: any) => hasActive(doc.orgId),
      insert: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
      modify: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
    },
    document_folders: {
      read: async (_ctx: QueryCtx, doc: any) => hasActive(doc.orgId),
      insert: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
      modify: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
    },
    document_folder_links: {
      read: async (_ctx: QueryCtx, doc: any) => hasActive(doc.orgId),
      insert: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
      modify: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
    },
    document_files: {
      read: async (_ctx: QueryCtx, doc: any) => hasActive(doc.orgId),
      insert: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
      modify: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
    },
    scan_sessions: {
      read: async (_ctx: QueryCtx, doc: any) => hasActive(doc.orgId),
      insert: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
      modify: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
    },
    scan_captures: {
      read: async (ctx: RlsContext, doc: any) => {
        if ((ctx as any).isDevice) return true; // Device can read its own captures
        return hasActive(doc.orgId);
      },
      insert: async (ctx: RlsContext, doc: any) => {
        if ((ctx as any).isDevice) return true; // Device inserts are validated by HTTP action
        return roleAtLeast(doc.orgId, "editor");
      },
      modify: async (ctx: RlsContext, doc: any) => {
        if ((ctx as any).isDevice) return true; // Device modifications are validated by HTTP action
        return roleAtLeast(doc.orgId, "editor");
      },
    },
    property_image: {
      read: async (_ctx: QueryCtx, doc: any) => hasActive(doc.orgId),
      insert: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
      modify: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
    },
    property_owner: {
      read: async (_ctx: QueryCtx, doc: any) => hasActive(doc.orgId),
      insert: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
      modify: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
    },
    owner: {
      read: async (_ctx: QueryCtx, doc: any) => hasActive(doc.orgId),
      insert: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
      modify: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
    },
    property_owner_membership: {
      read: async (_ctx: QueryCtx, doc: any) => hasActive(doc.orgId),
      insert: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
      modify: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
    },
    property_ownership_transaction: {
      read: async (_ctx: QueryCtx, doc: any) => hasActive(doc.orgId),
      insert: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
      modify: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
    },
    property_registry: {
      read: async (_ctx: QueryCtx, doc: any) => hasActive(doc.orgId),
      insert: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
      modify: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
    },
    // Lease domain
    party: {
      read: async (_ctx: QueryCtx, doc: any) => hasActive(doc.orgId),
      insert: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
      modify: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
    },
    lease: {
      read: async (_ctx: QueryCtx, doc: any) => hasActive(doc.orgId),
      insert: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
      modify: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
    },
    lease_party: {
      read: async (_ctx: QueryCtx, doc: any) => hasActive(doc.orgId),
      insert: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
      modify: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
    },
    lease_payment: {
      read: async (_ctx: QueryCtx, doc: any) => hasActive(doc.orgId),
      insert: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
      modify: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
    },
    lease_document: {
      read: async (_ctx: QueryCtx, doc: any) => hasActive(doc.orgId),
      insert: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
      modify: async (_ctx: QueryCtx, doc: any) => roleAtLeast(doc.orgId, "editor"),
    },
    
    // Prune references to legacy tables no longer in schema
  };
  return rules;
}

export const queryWithRLS = customQuery(
  query,
  customCtx(async (ctx) => ({
    db: wrapDatabaseReader(ctx, ctx.db, await rlsRules(ctx)),
  })),
);

export const mutationWithRLS = customMutation(
  mutation,
  customCtx(async (ctx: RlsContext) => {
    // First wrap with triggers, then apply RLS over the resulting db
    const ctxWithTriggers: any = await (propertyTriggers as any).wrapDB(ctx);
    const dbWithRLS = wrapDatabaseWriter(
      ctxWithTriggers,
      ctxWithTriggers.db,
      await rlsRules(ctxWithTriggers),
    );
    return { db: dbWithRLS };
  }),
);

export const internalMutationWithRLS = customMutation(
  internalMutation,
  customCtx(async (ctx: RlsContext) => {
    // Mark as device context for internal mutations called from HTTP actions
    (ctx as any).isDevice = true;
    // First wrap with triggers, then apply RLS over the resulting db
    const ctxWithTriggers: any = await (propertyTriggers as any).wrapDB(ctx);
    const dbWithRLS = wrapDatabaseWriter(
      ctxWithTriggers,
      ctxWithTriggers.db,
      await rlsRules(ctxWithTriggers),
    );
    return { db: dbWithRLS };
  }),
);

export async function requireOrgRole(ctx: { db: QueryCtx["db"]; auth: QueryCtx["auth"] }, orgId: Id<"orgs">, min: Role) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const user = await (ctx.db as any).query("users").withIndex("by_clerkUserId", (q: any) => q.eq("clerkUserId", identity.subject)).unique();
  if (!user) throw new Error("User not found");
  const mem = await (ctx.db as any)
    .query("org_members")
    .withIndex("by_user", (q: any) => q.eq("userId", (user as any)._id))
    .filter((q: any) => q.eq(q.field("orgId"), orgId))
    .unique();
  if (!mem || (mem as any).status !== "active") throw new Error("Not a member of org");
  const order: Role[] = ["viewer", "editor", "admin", "owner"];
  if (order.indexOf((mem as any).role as Role) < order.indexOf(min)) throw new Error("Insufficient role");
  return { user, membership: mem } as const;
}

