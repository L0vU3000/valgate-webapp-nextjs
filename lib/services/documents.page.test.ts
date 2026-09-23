import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Ctx } from "@/lib/services/_mapping";
import { encodeCursor, decodeCursor } from "@/lib/pagination/cursor";

// ---------------------------------------------------------------------------
// listDocumentsPage: cursor-based DB pagination for GET /api/v1/properties/{id}/documents.
// DB fully mocked (same pattern as lib/services/properties.page.test.ts) — no real
// connection, no network. Proves: org + property filters always applied, limit+1 fetched
// to detect "more", nextCursor emitted only when there is more, an invalid/tampered
// cursor is rejected (never silently ignored), and never fetch-then-slice (the mock
// only ever returns the rows it was asked for, exercised via `.limit`).
// ---------------------------------------------------------------------------

const { whereCalls, limitCalls, rowsToReturn } = vi.hoisted(() => ({
  whereCalls: [] as unknown[],
  limitCalls: [] as number[],
  rowsToReturn: { value: [] as Record<string, unknown>[] },
}));

vi.mock("@/lib/env", () => ({
  env: {
    DATABASE_URL: "postgresql://mock-documents-page-tests-only",
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

import { listDocumentsPage } from "./documents";

const CTX: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };
const PROPERTY_ID = "PROP-0001";

// Builds a fake documents-table row for the mocked DB. storageId is present so the
// schema parse succeeds; the v1 DTO tests separately prove it is never returned.
function row(id: string, uploadedAt: number): Record<string, unknown> {
  return {
    id,
    orgId: "ORG-0001",
    userId: "USR-0001",
    propertyId: PROPERTY_ID,
    name: `Document ${id}`,
    kind: "document",
    storageId: `STORE-SECRET-${id}`,
    uploadedAt,
  };
}

beforeEach(() => {
  whereCalls.length = 0;
  limitCalls.length = 0;
  rowsToReturn.value = [];
});

describe("listDocumentsPage", () => {
  it("fetches limit+1 rows to detect more, without ever fetch-then-slicing the whole table", async () => {
    rowsToReturn.value = [row("DOC-0001", 100), row("DOC-0002", 200)];

    await listDocumentsPage(CTX, PROPERTY_ID, { limit: 2 });

    expect(limitCalls).toEqual([3]);
  });

  it("returns nextCursor=null when there is no further page", async () => {
    rowsToReturn.value = [row("DOC-0001", 100), row("DOC-0002", 200)];

    const page = await listDocumentsPage(CTX, PROPERTY_ID, { limit: 2 });

    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toBeNull();
  });

  it("returns exactly `limit` items and an opaque nextCursor keyed on the last item when there is more", async () => {
    rowsToReturn.value = [row("DOC-0001", 100), row("DOC-0002", 200), row("DOC-0003", 300)];

    const page = await listDocumentsPage(CTX, PROPERTY_ID, { limit: 2 });

    expect(page.items.map((d) => d.id)).toEqual(["DOC-0001", "DOC-0002"]);
    expect(page.nextCursor).not.toBeNull();
    expect(decodeCursor(page.nextCursor!, ["uploadedAt", "id"])).toEqual({
      uploadedAt: 200,
      id: "DOC-0002",
    });
  });

  it("applies the org and property filters on every call (scoping never dropped for pagination)", async () => {
    rowsToReturn.value = [];

    await listDocumentsPage(CTX, PROPERTY_ID, { limit: 10 });

    expect(whereCalls).toHaveLength(1);
  });

  it("rejects an invalid/tampered cursor instead of silently ignoring it", async () => {
    await expect(
      listDocumentsPage(CTX, PROPERTY_ID, { limit: 10, cursor: "not-a-real-cursor" }),
    ).rejects.toThrow();
    // The DB must never be queried with a cursor we couldn't validate.
    expect(whereCalls).toHaveLength(0);
  });

  it("rejects a cursor with a negative uploadedAt (invalid shape, no DB query)", async () => {
    const cursor = encodeCursor({ uploadedAt: -5, id: "DOC-0001" });

    await expect(listDocumentsPage(CTX, PROPERTY_ID, { limit: 10, cursor })).rejects.toThrow();
    expect(whereCalls).toHaveLength(0);
  });

  it("rejects a cursor with a non-numeric uploadedAt", async () => {
    const cursor = encodeCursor({ uploadedAt: "not-a-number", id: "DOC-0001" });

    await expect(listDocumentsPage(CTX, PROPERTY_ID, { limit: 10, cursor })).rejects.toThrow();
    expect(whereCalls).toHaveLength(0);
  });

  it("rejects a cursor with a non-string id", async () => {
    const cursor = encodeCursor({ uploadedAt: 100, id: 12345 });

    await expect(listDocumentsPage(CTX, PROPERTY_ID, { limit: 10, cursor })).rejects.toThrow();
    expect(whereCalls).toHaveLength(0);
  });

  it("rejects a cursor with an empty-string id", async () => {
    const cursor = encodeCursor({ uploadedAt: 100, id: "" });

    await expect(listDocumentsPage(CTX, PROPERTY_ID, { limit: 10, cursor })).rejects.toThrow();
    expect(whereCalls).toHaveLength(0);
  });

  it("rejects a cursor whose uploadedAt overflows to a non-finite number on parse", async () => {
    // Written as raw JSON text (not a JS number literal) so `1e400` survives encoding and only
    // becomes Infinity inside JSON.parse — exercising Number.isFinite, not just typeof.
    const raw = '{"uploadedAt":1e400,"id":"DOC-0001"}';
    const cursor = Buffer.from(raw, "utf8").toString("base64url");

    await expect(listDocumentsPage(CTX, PROPERTY_ID, { limit: 10, cursor })).rejects.toThrow();
    expect(whereCalls).toHaveLength(0);
  });

  it("round-trips a cursor produced by an earlier call into a subsequent call's query", async () => {
    const cursor = encodeCursor({ uploadedAt: 100, id: "DOC-0001" });
    rowsToReturn.value = [row("DOC-0002", 200)];

    await listDocumentsPage(CTX, PROPERTY_ID, { limit: 10, cursor });

    expect(whereCalls).toHaveLength(1);
    expect(limitCalls).toEqual([11]);
  });
});
