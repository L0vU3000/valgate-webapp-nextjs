// Manager "act on behalf" authz tests (manager-act-on-behalf).
//
// Proves the security contract of the hybrid write path:
//   1. getMembershipRole floors an absent grant to null → the ctx can never be write-capable
//      from a missing row (the action turns null into "viewer").
//   2. recordAndApplyManagerChange REJECTS a viewer-grant ctx (requireAdmin) before any write.
//   3. A full-grant (admin) ctx records an "approved" change_requests row stamped with the
//      MANAGER as decidedByUserId AND actually applies it to the entity.
//   4. A full-grant delete leaves a durable tombstone: the change_requests row survives after
//      the entity row is gone.
//
// Strategy mirrors org-scoping-idor.test.ts: throwaway property rows under ORG-0001, plus a
// raw pg Pool to assert/clean change_requests independently of the code under test.
// Runs against DEV Neon. Never touches seed data. Never seed:reset.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createRequire } from "node:module";
import { resolve } from "node:path";

// ── Module mocks (hoisted before all imports) ─────────────────────────────────

// Disable DEMO_MODE so assertCanMutate() passes for the apply path.
vi.mock("@/lib/env", () => ({
  env: {
    DEMO_MODE: false,
    DEMO_ALLOW_WRITES: false,
    DATABASE_URL: process.env.DATABASE_URL ?? "",
    CLERK_SECRET_KEY: "sk_test_placeholder",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_placeholder",
  },
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { createThrowawayProperty, cleanup, rowExists } from "../../e2e/helpers/db";
import { recordAndApplyManagerChange } from "@/lib/services/change-requests";
import { getMembershipRole } from "@/lib/services/portfolio-members";
import { getProperty } from "@/lib/services/properties";
import type { Ctx } from "@/lib/services/_mapping";

// ── Raw pg pool for asserting / cleaning change_requests (independent of the code) ──

const projectRequire = createRequire(resolve(process.cwd(), "package.json"));
type RawPool = { query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> };
let _pool: RawPool | null = null;
function pool(): RawPool {
  if (!_pool) {
    const { Pool } = projectRequire("pg");
    _pool = new Pool({ connectionString: process.env.DATABASE_URL }) as RawPool;
  }
  return _pool;
}
async function q<T extends Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const { rows } = await pool().query(sql, params);
  return rows as T[];
}
async function crRow(id: string): Promise<{ status: string; decided_by_user_id: string | null; operation: string } | null> {
  const rows = await q<{ status: string; decided_by_user_id: string | null; operation: string }>(
    `SELECT status, decided_by_user_id, operation FROM change_requests WHERE id = $1 LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}
async function deleteCr(id: string): Promise<void> {
  await q(`DELETE FROM change_requests WHERE id = $1`, [id]);
}

// ── Synthetic ctxs — same manager acting under different grant levels ──────────
// Both are scoped to ORG-0001 (the client's org). orgRole is what a full vs. viewer grant
// resolves to. The ACTION derives orgRole from getMembershipRole; here we pass it directly
// to exercise the service-level gate.

const ORG = "ORG-0001";
const MANAGER = "USR-0001";
const fullGrantCtx: Ctx = { userId: MANAGER, orgId: ORG, orgRole: "admin" };
const viewerGrantCtx: Ctx = { userId: MANAGER, orgId: ORG, orgRole: "viewer" };

// Track CR ids to clean up so we never leave test rows behind.
const createdCrIds: string[] = [];
let updatePropId = "";
let deletePropId = "";

beforeAll(async () => {
  updatePropId = (await createThrowawayProperty()).propertyId;
  deletePropId = (await createThrowawayProperty()).propertyId;
});

afterAll(async () => {
  for (const id of createdCrIds) await deleteCr(id);
  // deletePropId may already be gone (the delete test removes it); cleanup tolerates that.
  await cleanup(updatePropId, deletePropId);
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. getMembershipRole — absent grant floors to null (never write-capable)
// ─────────────────────────────────────────────────────────────────────────────

describe("getMembershipRole — the authorization boundary", () => {
  it("returns null for a user with no active membership in the org", async () => {
    // A random (org, user) pair has no membership row → null. The action turns null into
    // "viewer", so a missing grant can NEVER be write-capable.
    const role = await getMembershipRole("ORG-PHANTOM", "USR-NOBODY");
    expect(role).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Viewer grant is rejected before any write
// ─────────────────────────────────────────────────────────────────────────────

describe("recordAndApplyManagerChange — viewer grant cannot act", () => {
  it("rejects a viewer-grant ctx with 'forbidden' (requireAdmin gate)", async () => {
    await expect(
      recordAndApplyManagerChange(viewerGrantCtx, {
        ownerOrgId: ORG,
        entityType: "property",
        entityId: updatePropId,
        operation: "update",
        proposedPatch: { name: "should-never-apply" },
      }),
    ).rejects.toThrow(/forbidden/i);
  });

  it("did NOT change the property (the write never happened)", async () => {
    const prop = await getProperty(fullGrantCtx, updatePropId);
    expect(prop?.name).not.toBe("should-never-apply");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Full grant records an approved row AND applies it
// ─────────────────────────────────────────────────────────────────────────────

describe("recordAndApplyManagerChange — full grant applies instantly", () => {
  it("writes an approved change_requests row stamped with the manager, and applies the change", async () => {
    const cr = await recordAndApplyManagerChange(fullGrantCtx, {
      ownerOrgId: ORG,
      entityType: "property",
      entityId: updatePropId,
      operation: "update",
      proposedPatch: { name: "acted-by-manager" },
    });
    createdCrIds.push(cr.id);

    // The returned CR is approved and decided by the acting manager (not a client).
    expect(cr.status).toBe("approved");
    expect(cr.decidedByUserId).toBe(MANAGER);

    // Independently confirm the row in the DB (not just the return value).
    const row = await crRow(cr.id);
    expect(row?.status).toBe("approved");
    expect(row?.decided_by_user_id).toBe(MANAGER);

    // And the entity was actually mutated in the same call.
    const prop = await getProperty(fullGrantCtx, updatePropId);
    expect(prop?.name).toBe("acted-by-manager");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Full-grant delete leaves a durable tombstone
// ─────────────────────────────────────────────────────────────────────────────

describe("recordAndApplyManagerChange — delete leaves a tombstone", () => {
  it("removes the entity but keeps the change_requests row recording who deleted what", async () => {
    const cr = await recordAndApplyManagerChange(fullGrantCtx, {
      ownerOrgId: ORG,
      entityType: "property",
      entityId: deletePropId,
      operation: "delete",
      proposedPatch: {},
    });
    createdCrIds.push(cr.id);

    // The entity row is gone…
    expect(await rowExists("properties", deletePropId)).toBe(false);

    // …but the change_requests tombstone survives it, recording the delete + who did it.
    const row = await crRow(cr.id);
    expect(row).not.toBeNull();
    expect(row?.operation).toBe("delete");
    expect(row?.status).toBe("approved");
    expect(row?.decided_by_user_id).toBe(MANAGER);
  });
});
