// Change-request service (Pro-3.0 — generalized ops).
// A read-only org:viewer manager proposes a create/update/delete to any Tier 1
// entity (property, lease, tenant, payment) → the owner (org:admin) approves/
// rejects before it is applied. The change_requests table is extended in 0020.
import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { changeRequests, organizationMemberships } from "@/lib/db/schema";
import { nextId, assertCanMutate, type Ctx } from "@/lib/services/_mapping";
import { requireAdmin } from "@/lib/services/_crud";
import { insertAccessNotification } from "@/lib/services/client-onboarding";

// ─── Domain type ─────────────────────────────────────────────────────────────

export type ChangeRequest = {
  id: string;
  ownerOrgId: string;
  managerUserId: string;
  entityType: string;
  // Null for "create" operations — the entity doesn't exist yet.
  entityId: string | null;
  operation: "create" | "update" | "delete";
  proposedPatch: Record<string, unknown>;
  status: "pending" | "approved" | "denied";
  decidedByUserId: string | null;
  decidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

// ─── Row mapper ───────────────────────────────────────────────────────────────

function rowToCR(row: typeof changeRequests.$inferSelect): ChangeRequest {
  return {
    id: row.id,
    ownerOrgId: row.ownerOrgId,
    managerUserId: row.managerUserId,
    entityType: row.entityType,
    entityId: row.entityId,
    operation: (row.operation ?? "update") as "create" | "update" | "delete",
    proposedPatch: row.proposedPatch as Record<string, unknown>,
    status: row.status as "pending" | "approved" | "denied",
    decidedByUserId: row.decidedByUserId,
    decidedAt: row.decidedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Find the first active non-manager member of the owner org.
// Used to send notifications to the client (owner) after a CR is created.
// Returns null if the client hasn't accepted their invitation yet.
async function findOwnerUserId(ownerOrgId: string, excludeUserId: string): Promise<string | null> {
  // Fetch all active members (typically 1–2: the owner + maybe a co-admin) and
  // filter in JS to exclude the manager — avoids a NOT IN subquery.
  const all = await db
    .select({ userId: organizationMemberships.userId })
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.orgId, ownerOrgId),
        eq(organizationMemberships.status, "active"),
      ),
    );
  const owner = all.find((r) => r.userId !== excludeUserId);
  return owner?.userId ?? null;
}

// ─── Write operations ─────────────────────────────────────────────────────────

// Create a pending change request. ctx is the MANAGER's ctx (their own org).
// ownerOrgId is the client's portfolio org — resolved by the action before calling this.
// entityId is null for "create" operations; required for "update" and "delete".
export async function createChangeRequest(
  ctx: Ctx,
  input: {
    ownerOrgId: string;
    entityType: string;
    entityId?: string | null;
    operation: "create" | "update" | "delete";
    proposedPatch: Record<string, unknown>;
  },
): Promise<ChangeRequest> {
  assertCanMutate();
  const id = await nextId("CRQ");
  const [row] = await db
    .insert(changeRequests)
    .values({
      id,
      ownerOrgId: input.ownerOrgId,
      managerUserId: ctx.userId,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      operation: input.operation,
      proposedPatch: input.proposedPatch,
      status: "pending",
    })
    .returning();
  return rowToCR(row!);
}

// Approve a pending change request.
// ctx must be the OWNER's ctx (ctx.orgId === ownerOrgId) AND the user must be org:admin.
// This blocks non-admin client members from approving destructive deletes.
// Applies the patch via the dispatcher, marks approved, notifies the manager.
export async function approveChangeRequest(ctx: Ctx, id: string): Promise<void> {
  assertCanMutate();

  // Only org:admin (the client who accepted the handoff) may approve changes.
  requireAdmin(ctx);

  // Load the pending CR — scoped to the owner's org so they can only approve their own.
  const [row] = await db
    .select()
    .from(changeRequests)
    .where(
      and(
        eq(changeRequests.id, id),
        eq(changeRequests.ownerOrgId, ctx.orgId),
        eq(changeRequests.status, "pending"),
      ),
    )
    .limit(1);
  if (!row) throw new Error("Change request not found or already decided");

  const cr = rowToCR(row);

  // Apply the patch via the dispatcher (re-validates proposedPatch before writing).
  const { applyChangeRequest } = await import("./_change-request-dispatcher");
  await applyChangeRequest(ctx, cr);

  // Mark approved.
  await db
    .update(changeRequests)
    .set({
      status: "approved",
      decidedByUserId: ctx.userId,
      decidedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(changeRequests.id, id));

  // Notify the manager that their change was approved.
  // Notification goes into the owner org with the manager's userId — they'll see it
  // in notifications when viewing this client's org context (as-client preview).
  try {
    const opLabel = cr.operation === "create" ? "addition" : cr.operation === "delete" ? "removal" : "update";
    await insertAccessNotification({
      orgId: cr.ownerOrgId,
      userId: cr.managerUserId,
      title: "Change request approved",
      description: `Your proposed ${cr.entityType} ${opLabel} was approved and applied.`,
      linkTo: `/pro/clients`,
    });
  } catch {
    // Notification failure must never block the approval.
  }
}

// Reject a pending change request.
// ctx must be the OWNER's ctx. Data is left untouched; manager is notified.
export async function rejectChangeRequest(ctx: Ctx, id: string): Promise<void> {
  assertCanMutate();

  const [row] = await db
    .select()
    .from(changeRequests)
    .where(
      and(
        eq(changeRequests.id, id),
        eq(changeRequests.ownerOrgId, ctx.orgId),
        eq(changeRequests.status, "pending"),
      ),
    )
    .limit(1);
  if (!row) throw new Error("Change request not found or already decided");

  const cr = rowToCR(row);

  await db
    .update(changeRequests)
    .set({
      status: "denied",
      decidedByUserId: ctx.userId,
      decidedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(changeRequests.id, id));

  // Notify the manager that their change was rejected.
  try {
    const opLabel = cr.operation === "create" ? "addition" : cr.operation === "delete" ? "removal" : "update";
    await insertAccessNotification({
      orgId: cr.ownerOrgId,
      userId: cr.managerUserId,
      title: "Change request declined",
      description: `Your proposed ${cr.entityType} ${opLabel} was declined by the owner.`,
      linkTo: `/pro/clients`,
    });
  } catch {
    // Notification failure must never block the rejection.
  }
}

// ─── Read operations ──────────────────────────────────────────────────────────

// Owner's inbox: all PENDING change requests in their org.
// ctx.orgId is the owner's own org — they only see their own portfolio's requests.
export async function listPendingForOwner(ctx: Ctx): Promise<ChangeRequest[]> {
  const rows = await db
    .select()
    .from(changeRequests)
    .where(
      and(
        eq(changeRequests.ownerOrgId, ctx.orgId),
        eq(changeRequests.status, "pending"),
      ),
    );
  return rows.map(rowToCR);
}

// Manager's submitted requests for a specific owner org — all statuses.
// ctx.userId scopes to this manager; ownerOrgId scopes to one client.
export async function listForManager(
  ctx: Ctx,
  ownerOrgId: string,
): Promise<ChangeRequest[]> {
  const rows = await db
    .select()
    .from(changeRequests)
    .where(
      and(
        eq(changeRequests.managerUserId, ctx.userId),
        eq(changeRequests.ownerOrgId, ownerOrgId),
      ),
    );
  return rows.map(rowToCR);
}

// Re-export the owner-notification helper so the pro action can use it.
export { findOwnerUserId };
