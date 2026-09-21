import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Ctx } from "@/lib/services/_mapping";
import { apiError } from "./http";

// ---------------------------------------------------------------------------
// GET /api/v1/properties/[id]/rental — auth seam and the per-property rental-summary service
// fully mocked (no real Clerk/DB/network). Proves: no auth -> 401, absent/cross-org property
// -> 404 (the service is org-scoped, so both look identical — no existence leak), an org/
// property with no rental data is still 200 with zeros/nulls, success -> the screen-shaped
// aggregate only, and an unexpected error fails closed with a generic 500.
//
// The leak assertions are the point: this endpoint is explicitly NOT a lease/payment/tenant
// list, so the serialized body must carry none of those identifiers or fields. Uses the
// Next.js 15 `params: Promise<{ id }>` convention, like the sibling property-detail route.
// ---------------------------------------------------------------------------

const { resolveApiV1CtxMock, getPropertyRentalSummaryMock, loggerMock } = vi.hoisted(() => ({
  resolveApiV1CtxMock: vi.fn(),
  getPropertyRentalSummaryMock: vi.fn(),
  loggerMock: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

vi.mock("./auth", () => ({ resolveApiV1Ctx: resolveApiV1CtxMock }));
vi.mock("@/lib/services/property-rental-summary", () => ({
  getPropertyRentalSummary: getPropertyRentalSummaryMock,
}));
vi.mock("@/lib/logger", () => ({ logger: loggerMock }));

import { GET } from "@/app/api/v1/properties/[id]/rental/route";

const CTX: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };

function ctxParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const REQUEST = new Request("http://localhost/api/v1/properties/PROP-0001/rental");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/v1/properties/[id]/rental", () => {
  it("returns 401 when the auth seam rejects the request (no auth)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({
      ok: false,
      response: apiError(401, "unauthorized", "Authentication required."),
    });

    const res = await GET(REQUEST, ctxParams("PROP-0001"));

    expect(res.status).toBe(401);
    expect(getPropertyRentalSummaryMock).not.toHaveBeenCalled();
  });

  it("returns 429 when the auth seam's rate limiter rejects the request", async () => {
    resolveApiV1CtxMock.mockResolvedValue({
      ok: false,
      response: apiError(429, "rate_limited", "Too many requests. Try again shortly."),
    });

    const res = await GET(REQUEST, ctxParams("PROP-0001"));

    expect(res.status).toBe(429);
    expect(getPropertyRentalSummaryMock).not.toHaveBeenCalled();
  });

  it("returns 404 for an absent or cross-org property, scoped to the caller's ctx", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: CTX });
    getPropertyRentalSummaryMock.mockResolvedValue(null);

    const res = await GET(REQUEST, ctxParams("PROP-CROSS-ORG"));

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("not_found");
    // The ctx (not a raw id lookup) is what enforces org scoping downstream.
    expect(getPropertyRentalSummaryMock).toHaveBeenCalledWith(CTX, "PROP-CROSS-ORG");
    expect(JSON.stringify(body)).not.toContain("ORG-0002");
  });

  it("returns the screen-shaped aggregate on success — no lease/tenant/payment row fields leak", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: CTX });
    getPropertyRentalSummaryMock.mockResolvedValue({
      occupancyPercent: 100,
      activeLeaseCount: 2,
      monthlyRentNumeric: 5700,
      nextPaymentAmountNumeric: 2850,
      nextPaymentAt: 1759276800000,
    });

    const res = await GET(REQUEST, ctxParams("PROP-0001"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      occupancyPercent: 100,
      activeLeaseCount: 2,
      monthlyRentNumeric: 5700,
      nextPaymentAmountNumeric: 2850,
      nextPaymentAt: 1759276800000,
      currency: "USD",
    });

    // Exact key set: this route must never grow into a row list by accident.
    expect(Object.keys(body).sort()).toEqual([
      "activeLeaseCount",
      "currency",
      "monthlyRentNumeric",
      "nextPaymentAmountNumeric",
      "nextPaymentAt",
      "occupancyPercent",
    ]);

    const serialized = JSON.stringify(body);
    for (const forbidden of [
      "USR-0001",
      "ORG-0001",
      "PROP-0001",
      "LEASE-",
      "TENANT-",
      "PMT-",
      "leases",
      "tenants",
      "payments",
      "items",
      "activeLeaseIds",
      "tenantId",
      "unit",
      "method",
      "monthlyRent\"",
      "renewalStatus",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("returns zeros and nulls when the property has no rental data (200, not an error)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: CTX });
    getPropertyRentalSummaryMock.mockResolvedValue({
      occupancyPercent: 0,
      activeLeaseCount: 0,
      monthlyRentNumeric: 0,
      nextPaymentAmountNumeric: null,
      nextPaymentAt: null,
    });

    const res = await GET(REQUEST, ctxParams("PROP-EMPTY"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      occupancyPercent: 0,
      activeLeaseCount: 0,
      monthlyRentNumeric: 0,
      nextPaymentAmountNumeric: null,
      nextPaymentAt: null,
      currency: null,
    });
  });

  it("fails closed with a generic 500 when the service throws unexpectedly (no message leak)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: CTX });
    getPropertyRentalSummaryMock.mockRejectedValue(new Error("SECRET-DB-ERROR-MARKER"));

    const res = await GET(REQUEST, ctxParams("PROP-0001"));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: { code: "internal_error", message: expect.any(String) } });
    expect(JSON.stringify(body)).not.toContain("SECRET-DB-ERROR-MARKER");
  });
});
