// Parity registry coverage authz tests (align-client-manager-parity Phase 2).
//
// Proves the newly-registered entities round-trip through the SAME audited path the
// original four use — the dispatcher REGISTRY + recordAndApplyManagerChange:
//   1. A full-grant manager CREATES a maintenance-item and a safety-risk on behalf of the
//      client: an "approved" change_requests row is written AND the entity actually lands
//      in the client's org.
//   2. A viewer-grant ctx is REJECTED before any write (requireAdmin gate) — a viewer can
//      only propose, never apply.
//   3. A full-grant UPDATE re-validates + applies (status flip persists).
//   4. A full-grant DELETE removes the entity but leaves the change_requests tombstone.
//
// Mirrors manager-act-on-behalf.test.ts: throwaway property under ORG-0001, raw pg Pool to
// assert/clean change_requests + the new entity tables. Runs against DEV Neon. Never seed:reset.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createRequire } from "node:module";
import { resolve } from "node:path";

// ── Module mocks (hoisted before all imports) ─────────────────────────────────

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

import { createThrowawayProperty, cleanup } from "../../e2e/helpers/db";
import { recordAndApplyManagerChange } from "@/lib/services/change-requests";
import type { Ctx } from "@/lib/services/_mapping";

// ── Raw pg pool (independent of the code under test) ──────────────────────────

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
async function crStatus(id: string): Promise<{ status: string; operation: string; decided_by_user_id: string | null } | null> {
  const rows = await q<{ status: string; operation: string; decided_by_user_id: string | null }>(
    `SELECT status, operation, decided_by_user_id FROM change_requests WHERE id = $1 LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

// ── Synthetic ctxs — same manager, different grant levels, scoped to the client org ──

const ORG = "ORG-0001";
const MANAGER = "USR-0001";
const fullGrantCtx: Ctx = { userId: MANAGER, orgId: ORG, orgRole: "admin" };
const viewerGrantCtx: Ctx = { userId: MANAGER, orgId: ORG, orgRole: "viewer" };

const createdCrIds: string[] = [];
let propId = "";
let workOrderId = "";
let riskId = "";

beforeAll(async () => {
  propId = (await createThrowawayProperty()).propertyId;
});

afterAll(async () => {
  for (const id of createdCrIds) await q(`DELETE FROM change_requests WHERE id = $1`, [id]);
  if (workOrderId) await q(`DELETE FROM maintenance_items WHERE id = $1`, [workOrderId]);
  if (riskId) await q(`DELETE FROM safety_risks WHERE id = $1`, [riskId]);
  await cleanup(propId);
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Full grant CREATES the newly-registered entities through the ledger
// ─────────────────────────────────────────────────────────────────────────────

describe("registry coverage — maintenance-item create via the audited path", () => {
  it("writes an approved CR AND lands the work order in the client's org", async () => {
    const cr = await recordAndApplyManagerChange(fullGrantCtx, {
      ownerOrgId: ORG,
      entityType: "maintenance-item",
      operation: "create",
      proposedPatch: { propertyId: propId, title: "AUTHZ-WO", severity: "Standard", status: "Open" },
    });
    createdCrIds.push(cr.id);
    expect(cr.status).toBe("approved");

    const rows = await q<{ id: string; status: string }>(
      `SELECT id, status FROM maintenance_items WHERE property_id = $1 AND title = $2 LIMIT 1`,
      [propId, "AUTHZ-WO"],
    );
    expect(rows.length).toBe(1);
    workOrderId = rows[0].id;
    expect(rows[0].status).toBe("Open");
  });
});

describe("registry coverage — safety-risk create via the audited path", () => {
  it("writes an approved CR AND lands the risk in the client's org", async () => {
    const cr = await recordAndApplyManagerChange(fullGrantCtx, {
      ownerOrgId: ORG,
      entityType: "safety-risk",
      operation: "create",
      proposedPatch: {
        propertyId: propId,
        severity: "Medium",
        title: "AUTHZ-RISK",
        description: "test risk",
        status: "Open",
      },
    });
    createdCrIds.push(cr.id);
    expect(cr.status).toBe("approved");

    const rows = await q<{ id: string; status: string }>(
      `SELECT id, status FROM safety_risks WHERE property_id = $1 AND title = $2 LIMIT 1`,
      [propId, "AUTHZ-RISK"],
    );
    expect(rows.length).toBe(1);
    riskId = rows[0].id;
    expect(rows[0].status).toBe("Open");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Viewer grant cannot apply a newly-registered entity
// ─────────────────────────────────────────────────────────────────────────────

describe("registry coverage — viewer grant cannot apply", () => {
  it("rejects a viewer-grant maintenance-item update with 'forbidden'", async () => {
    await expect(
      recordAndApplyManagerChange(viewerGrantCtx, {
        ownerOrgId: ORG,
        entityType: "maintenance-item",
        entityId: workOrderId,
        operation: "update",
        proposedPatch: { status: "Cancelled" },
      }),
    ).rejects.toThrow(/forbidden/i);
  });

  it("did NOT change the work order (write never happened)", async () => {
    const rows = await q<{ status: string }>(
      `SELECT status FROM maintenance_items WHERE id = $1 LIMIT 1`,
      [workOrderId],
    );
    expect(rows[0]?.status).not.toBe("Cancelled");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Full grant UPDATE re-validates + applies
// ─────────────────────────────────────────────────────────────────────────────

describe("registry coverage — maintenance-item update via the audited path", () => {
  it("flips the work order status and records the CR", async () => {
    const cr = await recordAndApplyManagerChange(fullGrantCtx, {
      ownerOrgId: ORG,
      entityType: "maintenance-item",
      entityId: workOrderId,
      operation: "update",
      proposedPatch: { status: "InProgress" },
    });
    createdCrIds.push(cr.id);
    expect(cr.status).toBe("approved");

    const rows = await q<{ status: string }>(
      `SELECT status FROM maintenance_items WHERE id = $1 LIMIT 1`,
      [workOrderId],
    );
    expect(rows[0]?.status).toBe("InProgress");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Full-grant DELETE leaves a durable tombstone
// ─────────────────────────────────────────────────────────────────────────────

describe("registry coverage — safety-risk delete leaves a tombstone", () => {
  it("removes the risk but keeps the change_requests row", async () => {
    const cr = await recordAndApplyManagerChange(fullGrantCtx, {
      ownerOrgId: ORG,
      entityType: "safety-risk",
      entityId: riskId,
      operation: "delete",
      proposedPatch: {},
    });
    createdCrIds.push(cr.id);

    const rows = await q<{ id: string }>(`SELECT id FROM safety_risks WHERE id = $1 LIMIT 1`, [riskId]);
    expect(rows.length).toBe(0);
    riskId = ""; // already gone — skip afterAll delete

    const tomb = await crStatus(cr.id);
    expect(tomb?.operation).toBe("delete");
    expect(tomb?.status).toBe("approved");
    expect(tomb?.decided_by_user_id).toBe(MANAGER);
  });
});
