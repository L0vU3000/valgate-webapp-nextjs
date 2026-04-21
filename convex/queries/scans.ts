import { v } from "convex/values";
import { query } from "../_generated/server";
import { queryWithRLS } from "../rls";

const scanStatusValidator = v.union(
  v.literal("active"),
  v.literal("expired"),
  v.literal("done"),
  v.literal("cancelled"),
);

export const sessionsByOrg = queryWithRLS({
  args: {
    orgId: v.id("orgs"),
    status: v.optional(scanStatusValidator),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("scan_sessions" as any)
      .withIndex("by_org_status", (q: any) => {
        const scoped = q.eq("orgId", args.orgId);
        return args.status ? scoped.eq("status", args.status) : scoped;
      })
      .collect();

    return sessions as any;
  },
});

export const sessionByQrToken = queryWithRLS({
  args: {
    qrToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("scan_sessions" as any)
      .withIndex("by_qrToken", (q: any) => q.eq("qrToken", args.qrToken))
      .unique();

    return session as any;
  },
});

export const sessionById = queryWithRLS({
  args: {
    sessionId: v.id("scan_sessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as any);
    return session as any;
  },
});

export const capturesBySession = queryWithRLS({
  args: {
    scanSessionId: v.id("scan_sessions"),
  },
  handler: async (ctx, args) => {
    const captures = await ctx.db
      .query("scan_captures" as any)
      .withIndex("by_session_index", (q: any) => q.eq("scanSessionId", args.scanSessionId))
      .collect();

    return captures as any;
  },
});

export const sessionByTokenPublic = query({
  args: {
    sessionId: v.id("scan_sessions"),
    token: v.string(),
  },
  handler: async (ctx, args) => {
  
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;
    if ((session as any).qrToken !== args.token) return null;
    console.log("Session found")
    return {
      _id: session._id,
      orgId: session.orgId,
      status: session.status,
      expiresAt: session.expiresAt,
      maxCaptures: session.maxCaptures,
      totalCaptures: session.totalCaptures ?? 0,
      metadata: session.metadata,
    };
  },
});

