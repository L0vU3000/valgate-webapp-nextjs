import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Ctx } from "@/lib/services/_mapping";

// ---------------------------------------------------------------------------
// getMeProfile: reads the caller's own user + org rows for GET /api/v1/me.
// DB fully mocked (same pattern as tests/authz/role-gating.test.ts) — no real
// connection, no network. Proves: found -> profile, missing user/org -> null.
// ---------------------------------------------------------------------------

const { selectQueue } = vi.hoisted(() => ({ selectQueue: [] as unknown[][] }));

vi.mock("@/lib/env", () => ({
  env: { DATABASE_URL: "postgresql://mock-me-tests-only" },
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve(selectQueue.shift() ?? []),
        }),
      }),
    }),
  },
}));

import { getMeProfile } from "./me";

const CTX: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "admin" };

beforeEach(() => {
  selectQueue.length = 0;
});

describe("getMeProfile", () => {
  it("returns the caller's email, displayName, org name, and role", async () => {
    selectQueue.push([{ email: "owner@example.com", displayName: "Owner Person" }]);
    selectQueue.push([{ name: "Acme Holdings" }]);

    const profile = await getMeProfile(CTX);

    expect(profile).toEqual({
      email: "owner@example.com",
      displayName: "Owner Person",
      role: "admin",
      orgName: "Acme Holdings",
    });
  });

  it("returns null when the user row is missing", async () => {
    selectQueue.push([]);
    selectQueue.push([{ name: "Acme Holdings" }]);

    expect(await getMeProfile(CTX)).toBeNull();
  });

  it("returns null when the org row is missing", async () => {
    selectQueue.push([{ email: "owner@example.com", displayName: null }]);
    selectQueue.push([]);

    expect(await getMeProfile(CTX)).toBeNull();
  });
});
