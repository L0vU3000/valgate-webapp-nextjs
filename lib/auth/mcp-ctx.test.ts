import { beforeEach, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { sql, type SQL } from "drizzle-orm";

const mocks = vi.hoisted(() => ({
  rows: [] as unknown[][],
  predicates: [] as SQL[],
  ordering: [] as SQL[],
}));
vi.mock("@/lib/db/client", () => ({ db: {
  select: () => {
    const rows = mocks.rows.shift() ?? [];
    const query = {
      from: () => query,
      where: (predicate: SQL) => { mocks.predicates.push(predicate); return query; },
      orderBy: (...ordering: SQL[]) => { mocks.ordering = ordering; return query; },
      limit: async () => rows,
    };
    return query;
  },
} }));

import { ctxForClerkUser } from "./mcp-ctx";

beforeEach(() => {
  mocks.rows.length = 0;
  mocks.predicates.length = 0;
  mocks.ordering.length = 0;
});

it("prioritizes an undated home-owner membership over a dated shared viewer membership", async () => {
  const home = { orgId: "ORG-HOME", role: "owner", joinedAt: null };
  // The mock supplies the row selected by the required ordering; the SQL
  // assertion below verifies owner priority ahead of PostgreSQL's NULLS LAST.
  mocks.rows.push([{ id: "USR-0001" }], [home]);
  await expect(ctxForClerkUser("user_1")).resolves.toEqual({
    userId: "USR-0001", orgId: home.orgId, orgRole: "owner",
  });
  const order = new PgDialect().sqlToQuery(sql.join(mocks.ordering, sql`, `));
  expect(order.sql).toBe('"organization_memberships"."role" = $1 desc, "organization_memberships"."joined_at" asc, "organization_memberships"."id" asc');
  expect(order.params).toEqual(["owner"]);
  const filters = new PgDialect().sqlToQuery(mocks.predicates[1]);
  expect(filters.params).toEqual(["USR-0001", "active"]);
});

it("keeps the selected non-owner membership read-only when no owner membership exists", async () => {
  mocks.rows.push([{ id: "USR-0001" }], [{ orgId: "ORG-SHARED", role: "viewer" }]);
  await expect(ctxForClerkUser("user_1")).resolves.toEqual({
    userId: "USR-0001", orgId: "ORG-SHARED", orgRole: "viewer",
  });
});

it("fails closed without an active organization", async () => {
  mocks.rows.push([{ id: "USR-0001" }], []);
  await expect(ctxForClerkUser("user_1")).rejects.toThrow("no active organization for user");
});

it("fails closed without a mirrored user", async () => {
  mocks.rows.push([]);
  await expect(ctxForClerkUser("user_1")).rejects.toThrow("unauthenticated");
});
