import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { jwtVerify } from "jose"; 

// Align with identity domain roles
export type Role = "owner" | "admin" | "editor" | "viewer";

export interface AccessLogInput {
  orgId: string;
  userId: string;
  entityType: string;
  entityId?: string;
  action: "read" | "create" | "update" | "delete";
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

export const nowIso = () => new Date().toISOString();

export async function getMembership(ctx: any, orgId: string, userId: string) {
  // org_members: query by user then filter by org to avoid relying on a composite index
  const membership = await (ctx.db as any)
    .query("org_members")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .filter((q: any) => q.eq(q.field("orgId"), orgId))
    .first();
  return membership as any;
}

export async function requireActiveMember(ctx: any, orgId: string, userId: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const membership = await getMembership(ctx, orgId, identity.subject); // or tokenIdentifier
  if (!membership || membership.status !== "active") throw new Error("Forbidden");
  return membership as any;
}

export async function requireRole(ctx: any, orgId: string, userId: string, allowed: Role[]) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const membership = await requireActiveMember(ctx, orgId, identity.subject);
  if (!allowed.includes(membership.role as Role)) throw new Error("Forbidden");
  return membership;
}

export async function requireAdmin(ctx: any, orgId: string, userId: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return requireRole(ctx, orgId, identity.subject, ["owner", "admin"]);
}

export async function requireWriter(ctx: any, orgId: string, userId: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  // Writers are editors and above
  return requireRole(ctx, orgId, identity.subject, ["owner", "admin", "editor"]);
}

export function maskPII<T extends { nationalId?: string }>(entity: T, isAdmin: boolean): T {
  if (!entity?.nationalId) return entity;
  if (isAdmin) return entity;
  const last4 = entity.nationalId.slice(-4);
  const masked = entity.nationalId.length > 4 ? `${"*".repeat(entity.nationalId.length - 4)}${last4}` : "****";
  return { ...entity, nationalId: masked } as T;
}

export async function logAccess(ctx: any, input: AccessLogInput) {
  // Minimal PII filtering toggle via env; default true in production
  const filterPII = process.env.NEXT_PUBLIC_FILTER_PII !== "false";
  const sanitizedDetails = filterPII ? sanitizeDetails(input.details ?? {}) : (input.details ?? {});
  // In Convex queries, ctx.db may be read-only; guard writes
  const canInsert = typeof ctx?.db?.insert === 'function';
  if (!canInsert) return; 
  await ctx.db.insert("accessLogs", {
    orgId: input.orgId,
    userId: input.userId,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    details: sanitizedDetails,
    ip: input.ip,
    userAgent: input.userAgent,
    createdAt: nowIso(),
  });
}

export const policy = {
  canRead: (role: Role) => ["owner", "admin", "editor", "viewer"].includes(role),
  canCreate: (role: Role) => ["owner", "admin", "editor"].includes(role),
  canUpdate: (role: Role) => ["owner", "admin", "editor"].includes(role),
  canDelete: (role: Role) => ["owner", "admin"].includes(role),
};
export function sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
  const forbiddenKeys = ["nationalId", "email", "phone", "token", "authorization", "password"];
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(details)) {
    if (forbiddenKeys.includes(k)) {
      out[k] = "[redacted]";
    } else if (typeof v === "string" && v.length > 256) {
      out[k] = v.slice(0, 256) + "…";
    } else if (v && typeof v === "object") {
      try {
        out[k] = sanitizeDetails(v as any);
      } catch {
        out[k] = "[object]";
      }
    } else {
      out[k] = v as any;
    }
  }
  return out;
}

// Backoffice guard for HTTP routes (Convex custom auth via Clerk templates)
import { ConvexError } from "convex/values";

// export async function requireBackofficeAuth(ctx: any) {
//   const identity = await ctx.auth.getTokenIdentity();
//   if (!identity) throw new ConvexError("Unauthorized");
//   const issuerOk = identity.issuer === process.env.CLERK_JWT_ISSUER_DOMAIN_B;
//   const aud = (identity as any).aud ?? (identity as any).token?.aud;
//   const audOk = aud === "convex-backoffice";
//   if (!issuerOk || !audOk) throw new ConvexError("Unauthorized");
//   return identity;
// }



export async function requireBackofficeAuth(request: Request) {
  const authHeader = request.headers.get("Authorization");
  console.log("==== requireBackofficeAuth ====");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }
  const token = authHeader.slice("Bearer ".length);

  try {
    // Use your secret to verify the JWT
    const secret = new TextEncoder().encode(process.env.AUTH_JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    // Optionally, check claims (e.g., role, exp, etc.)
    // if (payload.role !== "admin") {
    //   throw new Error("Insufficient privileges");
    // }
    return payload;
  } catch (e) {
    throw new Error("Invalid or expired token");
  }
}