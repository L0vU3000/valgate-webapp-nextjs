import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { mutationWithRLS, internalMutationWithRLS, requireOrgRole } from "../rls";
import { nowIso } from "../security";
import { Id } from "../_generated/dataModel";
import { api, internal } from "../_generated/api";

const scanStatusValidator = v.union(
  v.literal("active"),
  v.literal("expired"),
  v.literal("done"),
  v.literal("cancelled"),
);

const ocrStatusValidator = v.union(
  v.literal("pending"),
  v.literal("running"),
  v.literal("done"),
  v.literal("failed"),
);

export const createSession = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    propertyId: v.optional(v.id("property")),
    qrToken: v.string(),
    expiresAt: v.string(),
    maxCaptures: v.number(),
    status: v.optional(scanStatusValidator),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await requireOrgRole(ctx as any, args.orgId, "editor");
    const identity = await (ctx as any).auth?.getUserIdentity?.();
    if (!identity) throw new Error("Not authenticated");
    const user = await (ctx.db as any)
      .query("users")
      .withIndex("by_clerkUserId", (q: any) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");
    const now = nowIso();
    const sessionId = await ctx.db.insert("scan_sessions" as any, {
      orgId: args.orgId,
      creatorUserId: (user as any)._id,
      propertyId: args.propertyId,
      status: args.status ?? "active",
      qrToken: args.qrToken,
      expiresAt: args.expiresAt,
      maxCaptures: args.maxCaptures,
      totalCaptures: 0,
      lastCaptureAt: undefined,
      lastOpenedAt: undefined,
      openCount: 0,
      metadata: args.metadata,
      createdAt: now,
      updatedAt: now,
    } as any);
    return { sessionId } as any;
  },
});

export const updateSession = mutationWithRLS({
  args: {
    sessionId: v.id("scan_sessions"),
    updates: v.object({
      status: v.optional(scanStatusValidator),
      expiresAt: v.optional(v.string()),
      maxCaptures: v.optional(v.number()),
      totalCaptures: v.optional(v.number()),
      lastCaptureAt: v.optional(v.string()),
      metadata: v.optional(v.any()),
      propertyId: v.optional(v.id("property")),
    }),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as any);
    if (!session) throw new Error("Session not found");
    await requireOrgRole(ctx as any, (session as any).orgId, "editor");
    const now = nowIso();
    await ctx.db.patch(args.sessionId as any, {
      ...args.updates,
      updatedAt: now,
    } as any);
    return { ok: true } as any;
  },
});

export const deleteSession = mutationWithRLS({
  args: {
    sessionId: v.id("scan_sessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as any);
    if (!session) return { ok: true } as any;
    await requireOrgRole(ctx as any, (session as any).orgId, "editor");
    await ctx.db.delete(args.sessionId as any);
    return { ok: true } as any;
  },
});

// Fill in the field types to match your schema.
type SessionByTokenResult =
  | {
      _id: Id<"scan_sessions">;
      orgId: Id<"orgs">;        // <-- adjust if different in your schema
      status: string;           // <-- adjust as needed
      expiresAt: number | string; // <-- adjust as needed
      maxCaptures: number;
      totalCaptures: number;
      metadata: unknown;
    }
  | null;

export const createCapture = mutationWithRLS({
  args: {
    scanSessionId: v.id("scan_sessions"),
    token: v.string(),
    captureIndex: v.number(),
    objectKey: v.string(),
    mimeType: v.string(),
    sizeBytes: v.optional(v.number()),
    ocrStatus: v.optional(ocrStatusValidator),
    ocrResult: v.optional(v.any()),
    errorReason: v.optional(v.string()),
  },
  // 1) Explicit handler return type
  handler: async (
    ctx,
    args
  ): Promise<{ captureId: Id<"scan_captures"> }> => {
    console.log("createCapture");

    // 2) Explicit type on runQuery result
    const session: SessionByTokenResult =
      await ctx.runQuery((api as any).queries.scans.sessionByTokenPublic, {
        sessionId: args.scanSessionId,
        token: args.token,
      });

    console.log("session", session);
    if (!session) throw new Error("Session not found");

    const now = nowIso();


    const captureId = await ctx.db.insert("scan_captures", {
      orgId: session.orgId,
      scanSessionId: args.scanSessionId,
      captureIndex: args.captureIndex,
      objectKey: args.objectKey,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      ocrStatus: args.ocrStatus ?? "pending",
      ocrResult: args.ocrResult,
      errorReason: args.errorReason,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(session._id, {
      totalCaptures: (session.totalCaptures ?? 0) + 1,
      lastCaptureAt: now,
      updatedAt: now,
    });

    return { captureId };
  },
});

export const deviceCreateCapture = internalMutationWithRLS({
  args: {
    sessionId: v.id("scan_sessions"),
    orgId: v.id("orgs"),
    objectKey: v.string(),
    mimeType: v.string(),
    sizeBytes: v.optional(v.number()),
    ocrStatus: v.optional(ocrStatusValidator),
    ocrResult: v.optional(v.any()),
    errorReason: v.optional(v.string()),
  },
  returns: v.object({
    captureId: v.id("scan_captures"),
    captureIndex: v.number(),
  }),
  handler: async (ctx, args): Promise<{ captureId: Id<"scan_captures">; captureIndex: number }> => {
    // Re-load session by ID to validate
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    // Verify session belongs to expected orgId
    if ((session as any).orgId !== args.orgId) {
      throw new Error("Session orgId mismatch");
    }

    // Check session status is "active"
    if ((session as any).status !== "active") {
      throw new Error(`Session is not active: ${(session as any).status}`);
    }

    // Verify expiresAt is in the future
    const expiresAtMs = Date.parse(String((session as any).expiresAt));
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
      throw new Error("Session has expired");
    }

    // Check totalCaptures < maxCaptures if maxCaptures > 0
    const totalCaptures = Number((session as any).totalCaptures ?? 0);
    const maxCaptures = Number((session as any).maxCaptures ?? 0);
    if (maxCaptures > 0 && totalCaptures >= maxCaptures) {
      throw new Error("Max captures limit reached");
    }

    // Compute captureIndex from session.totalCaptures + 1
    const captureIndex = totalCaptures;

    const now = nowIso();

    // Insert capture with server-computed captureIndex
    const captureId = await ctx.db.insert("scan_captures" as any, {
      orgId: args.orgId,
      scanSessionId: args.sessionId,
      captureIndex,
      objectKey: args.objectKey,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      ocrStatus: args.ocrStatus ?? "pending",
      ocrResult: args.ocrResult,
      errorReason: args.errorReason,
      createdAt: now,
      updatedAt: now,
    } as any);

    // Patch session to increment totalCaptures and update lastCaptureAt
    await ctx.db.patch(args.sessionId, {
      totalCaptures: totalCaptures + 1,
      lastCaptureAt: now,
      updatedAt: now,
    } as any);

    return { captureId, captureIndex };
  },
});

// export const createCapture = mutationWithRLS({
//   args: {
//     scanSessionId: v.id("scan_sessions"),
//     token: v.string(),
//     captureIndex: v.number(),
//     objectKey: v.string(),
//     mimeType: v.string(),
//     sizeBytes: v.optional(v.number()),
//     ocrStatus: v.optional(ocrStatusValidator),
//     ocrResult: v.optional(v.any()),
//     errorReason: v.optional(v.string()),
//   },
//   handler: async (ctx, args) => {
    
//     console.log("createCapture")
//     console.log("scanSessionId raw", args.scanSessionId);
//     const normalized = ctx.db.normalizeId("scan_sessions", args.scanSessionId as string);
//     console.log("normalized", normalized);
//     const session = normalized ? await ctx.db.get(normalized) : null;


//     console.log("session", session);
//     if (!session) throw new Error("Session not found");
//     await requireOrgRole(ctx as any, (session as any).orgId, "editor");

//     const now = nowIso();
//     const captureId = await ctx.db.insert("scan_captures" as any, {
//       orgId: (session as any).orgId,
//       scanSessionId: args.scanSessionId,
//       captureIndex: args.captureIndex,
//       objectKey: args.objectKey,
//       mimeType: args.mimeType,
//       sizeBytes: args.sizeBytes,
//       ocrStatus: args.ocrStatus ?? "pending",
//       ocrResult: args.ocrResult,
//       errorReason: args.errorReason,
//       createdAt: now,
//       updatedAt: now,
//     } as any);

//     await ctx.db.patch((session as any)._id, {
//       totalCaptures: ((session as any).totalCaptures ?? 0) + 1,
//       lastCaptureAt: now,
//       updatedAt: now,
//     } as any);

//     return { captureId } as any;
//   },
// });

export const updateCapture = mutationWithRLS({
  args: {
    captureId: v.id("scan_captures"),
    updates: v.object({
      captureIndex: v.optional(v.number()),
      objectKey: v.optional(v.string()),
      mimeType: v.optional(v.string()),
      sizeBytes: v.optional(v.number()),
      ocrStatus: v.optional(ocrStatusValidator),
      ocrResult: v.optional(v.any()),
      errorReason: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const capture = await ctx.db.get(args.captureId as any);
    if (!capture) throw new Error("Capture not found");
    await requireOrgRole(ctx as any, (capture as any).orgId, "editor");
    const now = nowIso();
    await ctx.db.patch(args.captureId as any, {
      ...args.updates,
      updatedAt: now,
    } as any);
    return { ok: true } as any;
  },
});

export const deleteCapture = mutationWithRLS({
  args: {
    captureId: v.id("scan_captures"),
  },
  handler: async (ctx, args) => {
    const capture = await ctx.db.get(args.captureId as any);
    if (!capture) return { ok: true } as any;
    await requireOrgRole(ctx as any, (capture as any).orgId, "editor");
    const session = await ctx.db.get((capture as any).scanSessionId);
    await ctx.db.delete(args.captureId as any);
    if (session) {
      await ctx.db.patch((session as any)._id, {
        totalCaptures: Math.max(((session as any).totalCaptures ?? 1) - 1, 0),
        updatedAt: nowIso(),
      } as any);
    }
    return { ok: true } as any;
  },
});

export const registerOpenByToken = mutation({
  args: {
    sessionId: v.id("scan_sessions"),
    token: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return { ok: false, reason: "session_not_found" };
    }
    if ((session as any).qrToken !== args.token) {
      return { ok: false, reason: "invalid_token" };
    }

    const expiresAtMs = Date.parse(String((session as any).expiresAt));
    if (!Number.isFinite(expiresAtMs)) {
      return { ok: false, reason: "session_not_found" };
    }
    const nowMs = Date.now();
    if (expiresAtMs <= nowMs) {
      return {
        ok: false,
        reason: "expired",
        expiresAt: String((session as any).expiresAt),
      };
    }

    if ((session as any).status !== "active") {
      return {
        ok: false,
        reason: "inactive_status",
        status: String((session as any).status),
      };
    }

    const now = nowIso();
    await ctx.db.patch(args.sessionId, {
      lastOpenedAt: now,
      openCount: ((session as any).openCount ?? 0) + 1,
      updatedAt: now,
    } as any);

    return {
      ok: true,
      session: {
        sessionId: String((session as any)._id),
        status: (session as any).status,
        expiresAt: String((session as any).expiresAt),
        totalCaptures: Number((session as any).totalCaptures ?? 0),
        maxCaptures: Number((session as any).maxCaptures ?? 0),
        lastOpenedAt: now,
        openCount: ((session as any).openCount ?? 0) + 1,
      },
    };
  },
});

