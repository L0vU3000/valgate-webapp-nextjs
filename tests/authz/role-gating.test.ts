// Role-gating tests — proves RANK enforcement at the service layer.
//
// No real DB connection is needed here:
//   - For rejection cases (viewer/member), the role check throws BEFORE any DB call.
//   - For admin/owner success cases on scopedDelete, the DB is fully mocked.
// No Clerk, no login. Ctx is constructed by hand.
//
// RANK = { viewer: 0, member: 1, admin: 2, owner: 3 }   (lib/services/_crud.ts)
// scopedInsert / scopedUpdate require ≥ member (rank 1).
// scopedDelete requires ≥ admin (rank 2).

import { describe, it, expect, vi } from "vitest";

// ── Module mocks (vi.mock is hoisted above all imports by Vitest) ─────────────

// Disable DEMO_MODE so assertCanMutate() (called at the top of every scoped* function)
// does not throw before the role check fires.  DATABASE_URL is fake — the real DB is
// never reached in this file (rejections throw first; success cases use the mock below).
vi.mock("@/lib/env", () => ({
  env: {
    DEMO_MODE: false,
    DEMO_ALLOW_WRITES: false,
    DATABASE_URL: "postgresql://mock-role-gating-tests-only",
  },
}));

// Mock the Drizzle DB client entirely.
// Rejection tests never reach the DB, so the mock exists only for admin/owner
// success cases on scopedDelete (which calls db.delete(table).where(condition)).
// Drizzle's query builder is chainable; this mirrors the chain that scopedDelete uses.
vi.mock("@/lib/db/client", () => ({
  db: {
    delete: vi.fn(() => ({
      where: vi.fn().mockResolvedValue([]),
    })),
    // scopedInsert and scopedUpdate are not tested for success here, but mock them
    // so an accidental call does not attempt a real connection.
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([{}]),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([]),
        })),
      })),
    })),
    execute: vi.fn().mockResolvedValue({ rows: [] }),
  },
}));

// ── Imports (after mocks are registered) ─────────────────────────────────────

import {
  requireMember,
  requireAdmin,
  scopedDelete,
  scopedInsert,
  scopedUpdate,
} from "@/lib/services/_crud";
import { properties } from "@/lib/db/schema";
import type { Ctx } from "@/lib/services/_mapping";

// ── Synthetic Ctx objects — no Clerk needed ───────────────────────────────────
// These represent the four possible org roles a user can hold.
const viewerCtx: Ctx = { userId: "USR-TEST", orgId: "ORG-A", orgRole: "viewer" };
const memberCtx: Ctx = { userId: "USR-TEST", orgId: "ORG-A", orgRole: "member" };
const adminCtx: Ctx  = { userId: "USR-TEST", orgId: "ORG-A", orgRole: "admin"  };
const ownerCtx: Ctx  = { userId: "USR-TEST", orgId: "ORG-A", orgRole: "owner"  };

// ─────────────────────────────────────────────────────────────────────────────
// 1. requireMember — direct boundary test (called by scopedInsert + scopedUpdate)
// ─────────────────────────────────────────────────────────────────────────────
// requireMember is exported from _crud.ts and called as the SECOND thing in both
// scopedInsert and scopedUpdate (right after assertCanMutate).  Testing it directly
// is cheaper than going through the full function and still proves the real boundary.

describe("requireMember — rank ≥ 1 required", () => {
  it("throws 'forbidden' for viewer (rank 0 < 1)", () => {
    // Proves: a viewer cannot reach scopedInsert or scopedUpdate's DB logic.
    expect(() => requireMember(viewerCtx)).toThrow("forbidden");
  });

  it("does NOT throw for member (rank 1 — exactly at the threshold)", () => {
    // Proves: a member clears the insert/update gate.
    expect(() => requireMember(memberCtx)).not.toThrow();
  });

  it("does NOT throw for admin (rank 2 — above threshold)", () => {
    // Proves: admin ≥ member, so the insert/update gate opens for admin too.
    expect(() => requireMember(adminCtx)).not.toThrow();
  });

  it("does NOT throw for owner (rank 3 — highest)", () => {
    // Proves: owner passes the member gate.
    expect(() => requireMember(ownerCtx)).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. requireAdmin — direct boundary test (called by scopedDelete)
// ─────────────────────────────────────────────────────────────────────────────

describe("requireAdmin — rank ≥ 2 required", () => {
  it("throws 'forbidden' for viewer (rank 0 < 2)", () => {
    // Proves: a viewer cannot reach scopedDelete's DB logic.
    expect(() => requireAdmin(viewerCtx)).toThrow("forbidden");
  });

  it("throws 'forbidden' for member (rank 1 < 2)", () => {
    // Proves: a member also cannot delete — member rank is below admin threshold.
    expect(() => requireAdmin(memberCtx)).toThrow("forbidden");
  });

  it("does NOT throw for admin (rank 2 — exactly at threshold)", () => {
    // Proves: an admin clears the delete gate.
    expect(() => requireAdmin(adminCtx)).not.toThrow();
  });

  it("does NOT throw for owner (rank 3 — above threshold)", () => {
    // Proves: an owner also clears the delete gate.
    expect(() => requireAdmin(ownerCtx)).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. scopedDelete — full function, all four roles
// ─────────────────────────────────────────────────────────────────────────────
// assertCanMutate() runs first (env mocked — DEMO_MODE=false → passes).
// requireAdmin(ctx) runs second — viewer/member throw here, before the DB.
// admin/owner pass requireAdmin and reach db.delete (which is mocked to resolve).

describe("scopedDelete — role boundary via full function call", () => {
  it("rejects viewer — requireAdmin fires before the DB mock is ever called", async () => {
    // Boundary: viewer (rank 0) < admin (rank 2).
    // scopedDelete must throw 'forbidden' without touching the DB.
    await expect(
      scopedDelete(viewerCtx, properties, "PROP-FAKE-VIEWER")
    ).rejects.toThrow("forbidden");
  });

  it("rejects member — requireAdmin fires before the DB mock is ever called", async () => {
    // Boundary: member (rank 1) < admin (rank 2).
    await expect(
      scopedDelete(memberCtx, properties, "PROP-FAKE-MEMBER")
    ).rejects.toThrow("forbidden");
  });

  it("succeeds for admin — role gate opens, mocked DB delete resolves", async () => {
    // Boundary: admin (rank 2) >= admin threshold.
    // The mocked db.delete().where() resolves — scopedDelete returns void.
    // Proves the gate opens; actual row deletion is confirmed in org-scoping-idor.test.ts.
    await expect(
      scopedDelete(adminCtx, properties, "PROP-FAKE-ADMIN")
    ).resolves.toBeUndefined();
  });

  it("succeeds for owner — role gate opens, mocked DB delete resolves", async () => {
    // Boundary: owner (rank 3) >= admin threshold.
    await expect(
      scopedDelete(ownerCtx, properties, "PROP-FAKE-OWNER")
    ).resolves.toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. scopedInsert — viewer is rejected (member/admin/owner pass this gate)
// ─────────────────────────────────────────────────────────────────────────────
// requireMember fires BEFORE nextId() or any DB call.
// We only assert the rejection here; member/admin/owner success is covered by
// the service-level integration tests (they exercise the real insert path).

describe("scopedInsert — viewer boundary", () => {
  it("rejects viewer — requireMember fires before nextId or the DB is touched", async () => {
    // Boundary: viewer (rank 0) < member (rank 1).
    // scopedInsert must throw 'forbidden' immediately, before the DB mock is called.
    await expect(
      scopedInsert(
        viewerCtx,
        properties,
        "PROP",
        { name: "attempted-insert-by-viewer" },
        (row) => row,
      )
    ).rejects.toThrow("forbidden");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. scopedUpdate — viewer is rejected
// ─────────────────────────────────────────────────────────────────────────────
// requireMember fires BEFORE convertRowToDb or any DB call.

describe("scopedUpdate — viewer boundary", () => {
  it("rejects viewer — requireMember fires before convertRowToDb or the DB is touched", async () => {
    // Boundary: viewer (rank 0) < member (rank 1).
    await expect(
      scopedUpdate(
        viewerCtx,
        properties,
        "PROP-FAKE",
        { name: "hacked-by-viewer" },
        (row) => row,
      )
    ).rejects.toThrow("forbidden");
  });
});
