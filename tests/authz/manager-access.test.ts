// Cross-org manager access tests (Pro-2.2) — proves the request → approve → grant flow.
//
// These exercise lib/services/managers.ts against the real DEV Neon branch, with the
// one external dependency (Clerk's createOrganizationMembership) mocked. What they prove:
//   1. requestAccess inserts exactly one pending request; a duplicate is rejected.
//   2. Before approval the manager has no membership and the org is not in their rollup
//      (no grant = no access).
//   3. approveAccessRequest creates EXACTLY ONE active membership for the right org/user
//      and flips the request to approved; the org then appears in listManagedAccounts.
//   4. denyAccessRequest leaves NO membership and flips the request to denied.
//   5. The unique index uq_access_req_owner_manager backs the duplicate-request guard.
//
// Strategy mirrors org-scoping-idor.test.ts: a raw pg Pool seeds/cleans/asserts throwaway
// rows independently of the service layer, so assertions don't depend on the code under
// test. Runs against DEV Neon. Never touches seed data. Never seed:reset.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createRequire } from "node:module";
import { resolve } from "node:path";

// ── Module mocks (hoisted above imports) ──────────────────────────────────────

// Disable DEMO_MODE; DATABASE_URL comes from process.env (loaded by test/setup/env.ts).
vi.mock("@/lib/env", () => ({
  env: {
    DEMO_MODE: false,
    DEMO_ALLOW_WRITES: false,
    DATABASE_URL: process.env.DATABASE_URL ?? "",
    CLERK_SECRET_KEY: "sk_test_placeholder",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_placeholder",
  },
}));

// Mock the ONE external write: Clerk's createOrganizationMembership. The grant is a
// Clerk membership; in tests we record the call and let the Neon mirror (upsertMembership)
// run for real, so the membership-count assertions exercise the real DB write path.
const createOrganizationMembership = vi.fn(async () => ({}));
vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(async () => ({
    organizations: { createOrganizationMembership },
  })),
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import {
  requestAccess,
  approveAccessRequest,
  denyAccessRequest,
  listManagedAccounts,
} from "@/lib/services/managers";
import type { Ctx } from "@/lib/services/_mapping";

// ── Raw pg pool for seeding / asserting (independent of the service layer) ─────

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
async function nextId(collection: string): Promise<string> {
  const rows = await q<{ next: string }>(
    `UPDATE id_counters SET next = next + 1 WHERE collection = $1 RETURNING next`,
    [collection],
  );
  const next = Number(rows[0]?.next);
  if (!next) throw new Error(`nextId: unknown collection "${collection}"`);
  return `${collection}-${String(next - 1).padStart(4, "0")}`;
}
async function activeMembershipCount(orgId: string, userId: string): Promise<number> {
  const rows = await q<{ n: string }>(
    `SELECT count(*)::int AS n FROM organization_memberships
       WHERE org_id = $1 AND user_id = $2 AND status = 'active'`,
    [orgId, userId],
  );
  return Number(rows[0]?.n ?? 0);
}
async function requestStatus(requestId: string): Promise<string | null> {
  const rows = await q<{ status: string }>(
    `SELECT status FROM access_requests WHERE id = $1 LIMIT 1`,
    [requestId],
  );
  return rows[0]?.status ?? null;
}
async function accessNotificationCount(orgId: string, userId: string): Promise<number> {
  const rows = await q<{ n: string }>(
    `SELECT count(*)::int AS n FROM notifications
       WHERE org_id = $1 AND user_id = $2 AND category = 'ACCESS'`,
    [orgId, userId],
  );
  return Number(rows[0]?.n ?? 0);
}

// ── Throwaway scenario: one owner org + two managers (approve A, deny B) ───────

const suffix = Math.random().toString(36).slice(2, 8);
const inviteCode = `E2E${suffix.toUpperCase()}`;

let ownerOrgId = "";
let ownerClerkOrgId = "";
let managerAId = "";
let managerBId = "";

// The owner approving/denying. decided_by_user_id is plain text (no FK), so any id works.
const ownerCtx: Ctx = { userId: "USR-0001", orgId: "", orgRole: "owner" };
// Managers act from their own (non-owner) active org — orgId is irrelevant to the
// cross-org services (they key on userId), it just must NOT be the owner org.
const managerACtx: Ctx = { userId: "", orgId: "ORG-0001", orgRole: "owner" };
const managerBCtx: Ctx = { userId: "", orgId: "ORG-0001", orgRole: "owner" };

beforeAll(async () => {
  ownerOrgId = await nextId("ORG");
  ownerClerkOrgId = `org_e2e_${suffix}`;
  await q(
    `INSERT INTO organizations (id, clerk_org_id, name, invite_code) VALUES ($1, $2, $3, $4)`,
    [ownerOrgId, ownerClerkOrgId, "E2E Owner Org", inviteCode],
  );
  ownerCtx.orgId = ownerOrgId;

  managerAId = await nextId("USR");
  await q(
    `INSERT INTO users (id, clerk_user_id, primary_email, display_name, is_manager)
       VALUES ($1, $2, $3, $4, true)`,
    [managerAId, `user_e2e_a_${suffix}`, `mgr-a-${suffix}@e2e.test`, "E2E Manager A"],
  );
  managerACtx.userId = managerAId;

  managerBId = await nextId("USR");
  await q(
    `INSERT INTO users (id, clerk_user_id, primary_email, display_name, is_manager)
       VALUES ($1, $2, $3, $4, true)`,
    [managerBId, `user_e2e_b_${suffix}`, `mgr-b-${suffix}@e2e.test`, "E2E Manager B"],
  );
  managerBCtx.userId = managerBId;
});

afterAll(async () => {
  // FK-safe teardown order: requests + memberships + notifications first, then org + users.
  await q(`DELETE FROM notifications WHERE org_id = $1`, [ownerOrgId]);
  await q(`DELETE FROM access_requests WHERE owner_org_id = $1`, [ownerOrgId]);
  await q(`DELETE FROM organization_memberships WHERE org_id = $1`, [ownerOrgId]);
  await q(`DELETE FROM organizations WHERE id = $1`, [ownerOrgId]);
  await q(`DELETE FROM users WHERE id = ANY($1)`, [[managerAId, managerBId]]);
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. requestAccess + duplicate guard
// ─────────────────────────────────────────────────────────────────────────────

let requestAId = "";

describe("requestAccess", () => {
  it("inserts one pending request for a valid invite code", async () => {
    const { requestId } = await requestAccess(managerACtx, inviteCode, "view");
    requestAId = requestId;
    expect(await requestStatus(requestId)).toBe("pending");
  });

  it("rejects a duplicate request for the same (owner, manager) pair", async () => {
    // The unique index uq_access_req_owner_manager is the backstop; the pre-check
    // surfaces it as a generic message.
    await expect(requestAccess(managerACtx, inviteCode, "full")).rejects.toThrow();
  });

  it("rejects an unknown invite code", async () => {
    await expect(requestAccess(managerBCtx, "NOSUCHCODE", "view")).rejects.toThrow(
      /invite code/i,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. No grant = no access
// ─────────────────────────────────────────────────────────────────────────────

describe("before approval — no grant means no access", () => {
  it("manager has no active membership in the owner org", async () => {
    expect(await activeMembershipCount(ownerOrgId, managerAId)).toBe(0);
  });

  it("owner org is not in the manager's managed-accounts rollup", async () => {
    const accounts = await listManagedAccounts(managerACtx);
    expect(accounts.find((a) => a.orgId === ownerOrgId)).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. approveAccessRequest — creates exactly one membership + flips status
// ─────────────────────────────────────────────────────────────────────────────

describe("approveAccessRequest", () => {
  it("creates exactly one active membership and approves the request", async () => {
    await approveAccessRequest(ownerCtx, requestAId);

    // The grant went to Clerk (mocked) with the viewer role for a "view" request.
    expect(createOrganizationMembership).toHaveBeenCalledTimes(1);
    expect(createOrganizationMembership).toHaveBeenCalledWith({
      organizationId: ownerClerkOrgId,
      userId: `user_e2e_a_${suffix}`,
      role: "org:viewer",
    });

    // Exactly one membership row was mirrored into Neon.
    expect(await activeMembershipCount(ownerOrgId, managerAId)).toBe(1);
    expect(await requestStatus(requestAId)).toBe("approved");

    // The manager got an "ACCESS" notification scoped to the owner org.
    expect(await accessNotificationCount(ownerOrgId, managerAId)).toBe(1);
  });

  it("now shows the owner org in the manager's managed-accounts rollup", async () => {
    const accounts = await listManagedAccounts(managerACtx);
    const account = accounts.find((a) => a.orgId === ownerOrgId);
    expect(account).toBeDefined();
    expect(account?.level).toBe("view");
    expect(account?.role).toBe("viewer");
  });

  it("rejects re-approving an already-decided request", async () => {
    await expect(approveAccessRequest(ownerCtx, requestAId)).rejects.toThrow(
      /not found/i,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. denyAccessRequest — leaves no membership
// ─────────────────────────────────────────────────────────────────────────────

describe("denyAccessRequest", () => {
  it("denies the request and creates no membership", async () => {
    const { requestId } = await requestAccess(managerBCtx, inviteCode, "full");
    await denyAccessRequest(ownerCtx, requestId);

    expect(await requestStatus(requestId)).toBe("denied");
    expect(await activeMembershipCount(ownerOrgId, managerBId)).toBe(0);
  });
});
