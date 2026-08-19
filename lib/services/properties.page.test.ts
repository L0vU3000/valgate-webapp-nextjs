import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Ctx } from "@/lib/services/_mapping";
import { encodeCursor, decodeCursor } from "@/lib/pagination/cursor";

// ---------------------------------------------------------------------------
// listPropertiesPage: cursor-based DB pagination for GET /api/v1/properties.
// DB fully mocked (same pattern as tests/authz/role-gating.test.ts) — no real
// connection, no network. Proves: org filter always applied, limit+1 fetched to
// detect "more", nextCursor emitted only when there is more, an invalid/tampered
// cursor is rejected (never silently ignored), and never fetch-then-slice (the
// mock only ever returns the rows it was asked for, exercised via `.limit`).
// ---------------------------------------------------------------------------

const { whereCalls, limitCalls, rowsToReturn } = vi.hoisted(() => ({
  whereCalls: [] as unknown[],
  limitCalls: [] as number[],
  rowsToReturn: { value: [] as Record<string, unknown>[] },
}));

vi.mock("@/lib/env", () => ({
  env: {
    DATABASE_URL: "postgresql://mock-properties-page-tests-only",
    DEMO_MODE: false,
    DEMO_ALLOW_WRITES: false,
  },
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: (cond: unknown) => {
          whereCalls.push(cond);
          return {
            orderBy: () => ({
              limit: (n: number) => {
                limitCalls.push(n);
                return Promise.resolve(rowsToReturn.value);
              },
            }),
          };
        },
      }),
    }),
  },
}));

import { listPropertiesPage } from "./properties";

const CTX: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };

function row(id: string, createdAt: number): Record<string, unknown> {
  return {
    id,
    orgId: "ORG-0001",
    userId: "USR-0001",
    name: `Property ${id}`,
    code: id,
    type: "residential",
    status: "Rented",
    lat: 0,
    lng: 0,
    totalArea: "100",
    title: "Hard title",
    buyNumeric: 100000,
    createdAt,
    updatedAt: createdAt,
  };
}

beforeEach(() => {
  whereCalls.length = 0;
  limitCalls.length = 0;
  rowsToReturn.value = [];
});

describe("listPropertiesPage", () => {
  it("fetches limit+1 rows to detect more, without ever fetch-then-slicing the whole table", async () => {
    rowsToReturn.value = [row("PROP-0001", 100), row("PROP-0002", 200)];

    await listPropertiesPage(CTX, { limit: 2 });

    expect(limitCalls).toEqual([3]);
  });

  it("returns nextCursor=null when there is no further page", async () => {
    rowsToReturn.value = [row("PROP-0001", 100), row("PROP-0002", 200)];

    const page = await listPropertiesPage(CTX, { limit: 2 });

    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toBeNull();
  });

  it("returns exactly `limit` items and an opaque nextCursor keyed on the last item when there is more", async () => {
    rowsToReturn.value = [row("PROP-0001", 100), row("PROP-0002", 200), row("PROP-0003", 300)];

    const page = await listPropertiesPage(CTX, { limit: 2 });

    expect(page.items.map((p) => p.id)).toEqual(["PROP-0001", "PROP-0002"]);
    expect(page.nextCursor).not.toBeNull();
    expect(decodeCursor(page.nextCursor!, ["createdAt", "id"])).toEqual({
      createdAt: 200,
      id: "PROP-0002",
    });
  });

  it("applies the org filter on every call (org-scoping never dropped for pagination)", async () => {
    rowsToReturn.value = [];

    await listPropertiesPage(CTX, { limit: 10 });

    expect(whereCalls).toHaveLength(1);
  });

  it("rejects an invalid/tampered cursor instead of silently ignoring it", async () => {
    await expect(listPropertiesPage(CTX, { limit: 10, cursor: "not-a-real-cursor" })).rejects.toThrow();
    // The DB must never be queried with a cursor we couldn't validate.
    expect(whereCalls).toHaveLength(0);
  });

  it("rejects a cursor with a negative createdAt (invalid shape, no DB query)", async () => {
    const cursor = encodeCursor({ createdAt: -5, id: "PROP-0001" });

    await expect(listPropertiesPage(CTX, { limit: 10, cursor })).rejects.toThrow();
    expect(whereCalls).toHaveLength(0);
  });

  it("rejects a cursor with a non-numeric createdAt", async () => {
    const cursor = encodeCursor({ createdAt: "not-a-number", id: "PROP-0001" });

    await expect(listPropertiesPage(CTX, { limit: 10, cursor })).rejects.toThrow();
    expect(whereCalls).toHaveLength(0);
  });

  it("rejects a cursor with a non-string id", async () => {
    const cursor = encodeCursor({ createdAt: 100, id: 12345 });

    await expect(listPropertiesPage(CTX, { limit: 10, cursor })).rejects.toThrow();
    expect(whereCalls).toHaveLength(0);
  });

  it("rejects a cursor with an empty-string id", async () => {
    const cursor = encodeCursor({ createdAt: 100, id: "" });

    await expect(listPropertiesPage(CTX, { limit: 10, cursor })).rejects.toThrow();
    expect(whereCalls).toHaveLength(0);
  });

  it("rejects a cursor whose createdAt overflows to a non-finite number on parse", async () => {
    // Written as raw JSON text (not a JS number literal) so `1e400` survives encoding and only
    // becomes Infinity inside JSON.parse — exercising Number.isFinite, not just typeof.
    const raw = '{"createdAt":1e400,"id":"PROP-0001"}';
    const cursor = Buffer.from(raw, "utf8").toString("base64url");

    await expect(listPropertiesPage(CTX, { limit: 10, cursor })).rejects.toThrow();
    expect(whereCalls).toHaveLength(0);
  });

  it("round-trips a cursor produced by an earlier call into a subsequent call's query", async () => {
    const cursor = encodeCursor({ createdAt: 100, id: "PROP-0001" });
    rowsToReturn.value = [row("PROP-0002", 200)];

    await listPropertiesPage(CTX, { limit: 10, cursor });

    expect(whereCalls).toHaveLength(1);
    expect(limitCalls).toEqual([11]);
  });
});
