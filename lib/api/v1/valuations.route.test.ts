import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Ctx } from "@/lib/services/_mapping";
import { apiError } from "./http";

// ---------------------------------------------------------------------------
// GET /api/v1/properties/[id]/valuations — auth seam and property lookup mocked; the
// valuations service is the REAL one (lib/services/property-valuations.ts) running against a
// mocked DB client. That is deliberate: the cursor tamper path is the thing under test, and
// mocking the service away would only prove the route forwards an exception. Here a genuinely
// tampered cursor is decoded, rejected, and turned into 400 by real code. Proves: no auth ->
// 401, invalid limit -> 400, tampered/foreign cursor -> 400 with no DB round-trip, absent or
// cross-org property -> 404 (getProperty is already org-scoped, so a cross-org id is
// indistinguishable from "not found"), success -> opaque-cursor page of
// PropertyValuationDtoV1 that never carries recordedAt or internal ids. Uses the Next.js 15
// `params: Promise<{ id }>` convention.
// ---------------------------------------------------------------------------

const { resolveApiV1CtxMock, getPropertyMock, whereCalls, limitCalls, rowsToReturn } =
  vi.hoisted(() => ({
    resolveApiV1CtxMock: vi.fn(),
    getPropertyMock: vi.fn(),
    whereCalls: [] as unknown[],
    limitCalls: [] as number[],
    rowsToReturn: { value: [] as Record<string, unknown>[] },
  }));

vi.mock("./auth", () => ({
  resolveApiV1Ctx: resolveApiV1CtxMock,
}));

vi.mock("@/lib/services/properties", () => ({
  getProperty: getPropertyMock,
}));

// Chain mirrors propertyValuations listPropertyValuationsPage: select().from().where().orderBy().limit()
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

import { GET } from "@/app/api/v1/properties/[id]/valuations/route";
import { decodeCursor } from "@/lib/pagination/cursor";

const OWNER_CTX: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };
const PROPERTY_ID = "PROP-0001";

const PROPERTY = {
  id: PROPERTY_ID,
  userId: "USR-SECRET-0001",
  orgId: "ORG-SECRET-0001",
  name: "42 Ocean Ave",
};

// Builds a fake property_valuations row for the mocked DB. price is a numeric-as-string and
// recordedAt a Date, exactly how drizzle hands a `numeric`/`timestamp` column to toDomain.
function row(id: string, recordedAt: number): Record<string, unknown> {
  return {
    id,
    orgId: "ORG-0001",
    userId: "USR-0001",
    propertyId: PROPERTY_ID,
    month: "Jan 2026",
    price: "5250000.00",
    recordedAt: new Date(recordedAt),
  };
}

// Base64url of arbitrary JSON — lets a test hand the route a well-formed but hostile cursor.
function cursorOf(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function req(id: string, query = ""): Request {
  return new Request(`http://localhost/api/v1/properties/${id}/valuations${query}`);
}

function ctxParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  whereCalls.length = 0;
  limitCalls.length = 0;
  rowsToReturn.value = [];
  resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: OWNER_CTX });
  getPropertyMock.mockResolvedValue(PROPERTY);
});

describe("GET /api/v1/properties/[id]/valuations", () => {
  it("returns 401 when the auth seam rejects the request (no auth)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({
      ok: false,
      response: apiError(401, "unauthorized", "Authentication required."),
    });

    const res = await GET(req(PROPERTY_ID), ctxParams(PROPERTY_ID));

    expect(res.status).toBe(401);
    expect(getPropertyMock).not.toHaveBeenCalled();
    expect(whereCalls).toHaveLength(0);
  });

  it.each(["?limit=0", "?limit=101", "?limit=abc", "?limit=-5", "?limit=1.5"])(
    "returns 400 for %s and never touches the property or the DB",
    async (query) => {
      const res = await GET(req(PROPERTY_ID, query), ctxParams(PROPERTY_ID));

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe("invalid_request");
      expect(getPropertyMock).not.toHaveBeenCalled();
      expect(whereCalls).toHaveLength(0);
      expect(limitCalls).toHaveLength(0);
    },
  );

  it.each([
    ["undecodable string", "not-a-real-cursor"],
    ["valid base64 that is not a cursor shape", cursorOf({ nope: true })],
    ["cursor with a non-numeric recordedAt", cursorOf({ recordedAt: "not-a-number", id: "VAL-0001" })],
    ["cursor with a negative recordedAt", cursorOf({ recordedAt: -5, id: "VAL-0001" })],
    ["cursor with an empty id", cursorOf({ recordedAt: 100, id: "" })],
  ])("returns 400 for a tampered cursor (%s) with no DB round-trip", async (_label, cursor) => {
    const res = await GET(
      req(PROPERTY_ID, `?cursor=${encodeURIComponent(cursor)}`),
      ctxParams(PROPERTY_ID),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("invalid_request");
    // getProperty is org-scoped and safe to call first, but the bad cursor must never reach a query.
    expect(whereCalls).toHaveLength(0);
  });

  it("returns 404 when the property is absent or belongs to another org (IDOR)", async () => {
    getPropertyMock.mockResolvedValue(null);

    const res = await GET(req("PROP-9999"), ctxParams("PROP-9999"));

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("not_found");
    expect(getPropertyMock).toHaveBeenCalledWith(OWNER_CTX, "PROP-9999");
    expect(whereCalls).toHaveLength(0);
  });

  it("returns a page of PropertyValuationDtoV1 with nextCursor — no recordedAt or internal ids leaked", async () => {
    rowsToReturn.value = [row("VAL-0001", 100), row("VAL-0002", 200), row("VAL-0003", 300)];

    const res = await GET(req(PROPERTY_ID, "?limit=2"), ctxParams(PROPERTY_ID));

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.items).toEqual([
      { id: "VAL-0001", propertyId: PROPERTY_ID, month: "Jan 2026", price: 5250000 },
      { id: "VAL-0002", propertyId: PROPERTY_ID, month: "Jan 2026", price: 5250000 },
    ]);
    expect(body.items[0]).not.toHaveProperty("recordedAt");
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("recordedAt");
    expect(serialized).not.toContain("USR-");
    expect(serialized).not.toContain("ORG-");

    // limit+1 rows fetched, never the whole table.
    expect(limitCalls).toEqual([3]);
    // Cursor is keyed on the last returned row's (recordedAt, id) tuple, not on a raw offset.
    expect(decodeCursor(body.nextCursor, ["recordedAt", "id"])).toEqual({
      recordedAt: 200,
      id: "VAL-0002",
    });
  });

  it("walks page 2 with the returned cursor, and has no nextCursor on the last page", async () => {
    rowsToReturn.value = [row("VAL-0001", 100), row("VAL-0002", 200), row("VAL-0003", 300)];

    const first = await GET(req(PROPERTY_ID, "?limit=2"), ctxParams(PROPERTY_ID));
    const { nextCursor } = await first.json();
    expect(nextCursor).toBeTruthy();

    rowsToReturn.value = [row("VAL-0003", 300)];
    const second = await GET(
      req(PROPERTY_ID, `?limit=2&cursor=${encodeURIComponent(nextCursor)}`),
      ctxParams(PROPERTY_ID),
    );

    expect(second.status).toBe(200);
    const body = await second.json();
    expect(body.items.map((v: { id: string }) => v.id)).toEqual(["VAL-0003"]);
    expect(body.nextCursor).toBeNull();
    // A real query ran for the second page (cursor decoded and accepted).
    expect(whereCalls).toHaveLength(2);
  });
});
