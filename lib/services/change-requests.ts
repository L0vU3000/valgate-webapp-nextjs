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
import { applyChangeRequest } from "@/lib/services/_change-request-dispatcher";
import type { ChangeRequest } from "@/lib/services/change-request-types";

// ─── Domain type ─────────────────────────────────────────────────────────────

// Moved to change-request-types.ts (cycle break); re-exported so existing
// importers of this module keep working unchanged.
export type { ChangeRequest } from "@/lib/services/change-request-types";

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

// Record a manager's change as ALREADY approved and apply it, in one step.
// ctx is the MANAGER's WRITE ctx — orgId is the client's portfolio org and orgRole is
// their real (admin/owner) grant. Used when a full-grant manager acts on behalf of the
// client from the preview: the mutation still lands in the change_requests ledger (so it
// is always audited, and deletes leave a durable tombstone), but it is auto-approved and
// applied instantly instead of waiting for the client.
//
// requireAdmin is the gate: a viewer-grant ctx is rejected here, so this path can only be
// reached with a real full grant (which the action re-derives server-side, never trusts).
export async function recordAndApplyManagerChange(
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
  requireAdmin(ctx); // full grant == admin/owner; viewer ctx throws "forbidden"

  const id = await nextId("CRQ");
  const now = new Date();

  // Insert-approved + apply, atomically. If applyChangeRequest throws (invalid patch or a
  // failed write), the callback throws and the change_requests insert rolls back — so we
  // never leave an "approved" row that was never applied.
  // ponytail: only the CR insert runs on `tx`; applyChangeRequest's own write goes through
  // the pooled `db`. That single-entity write is atomic on its own, and the insert-rollback
  // still prevents the ghost approved row — full cross-statement rollback would mean
  // threading `tx` through every service fn, which isn't worth it here.
  const cr = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(changeRequests)
      .values({
        id,
        ownerOrgId: input.ownerOrgId,
        managerUserId: ctx.userId,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        operation: input.operation,
        proposedPatch: input.proposedPatch,
        status: "approved",
        decidedByUserId: ctx.userId,
        decidedAt: now,
      })
      .returning();
    const created = rowToCR(row!);
    // Re-validates proposedPatch and writes via the real service fns under the manager's
    // write ctx. Throws → transaction rolls back the row above.
    await applyChangeRequest(ctx, created);
    return created;
  });

  // Notify the CLIENT (owner), not the acting manager — the transparency that makes
  // pre-granting full permission trustworthy. Never blocks or rolls back the applied change.
  try {
    const ownerUserId = await findOwnerUserId(input.ownerOrgId, ctx.userId);
    if (ownerUserId) {
      const opLabel =
        input.operation === "create" ? "added" : input.operation === "delete" ? "removed" : "updated";
      await insertAccessNotification({
        orgId: input.ownerOrgId,
        userId: ownerUserId,
        title: "Your manager updated your portfolio",
        description: `Your manager ${opLabel} a ${input.entityType}.`,
        linkTo: "/portfolio/pending-changes",
      });
    }
  } catch (err) {
    console.error("recordAndApplyManagerChange: client notification failed (non-fatal)", err);
  }

  return cr;
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
