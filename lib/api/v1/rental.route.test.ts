import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Ctx } from "@/lib/services/_mapping";
import { apiError } from "./http";

// ---------------------------------------------------------------------------
// GET /api/v1/rental — auth seam and rental-summary service fully mocked (no real
// Clerk/DB/network). Proves: no auth -> 401, rate-limited -> 429, success ->
// RentalSummaryDto (no lease/tenant/payment rows leaked), empty org is still 200
// with zeros/nulls, unexpected errors fail closed with a generic 500.
// ---------------------------------------------------------------------------

const { resolveApiV1CtxMock, getRentalSummaryMock, loggerMock } = vi.hoisted(() => ({
  resolveApiV1CtxMock: vi.fn(),
  getRentalSummaryMock: vi.fn(),
  loggerMock: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

vi.mock("./auth", () => ({
  resolveApiV1Ctx: resolveApiV1CtxMock,
}));

vi.mock("@/lib/services/rental-summary", () => ({
  getRentalSummary: getRentalSummaryMock,
}));

vi.mock("@/lib/logger", () => ({
  logger: loggerMock,
}));

import { GET } from "@/app/api/v1/rental/route";

const CTX: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "viewer" };

// Dashboard rollup fields for an org with nothing to report (same shape on source and wire).
const EMPTY_ROLLUP = {
  monthLabel: "October 2026 (UTC)",
  collectedAmountNumeric: null,
  expectedAmountNumeric: null,
  paidCount: 0,
  dueCount: 0,
  overdueAmountNumeric: null,
  overdueCount: 0,
  depositHeldNumeric: null,
  documentCount: 0,
  attention: [],
  activity: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/v1/rental", () => {
  it("returns 401 when the auth seam rejects the request (no auth)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({
      ok: false,
      response: apiError(401, "unauthorized", "Authentication required."),
    });

    const res = await GET();

    expect(res.status).toBe(401);
    expect(getRentalSummaryMock).not.toHaveBeenCalled();
  });

  it("returns 429 when the auth seam's rate limiter rejects the request", async () => {
    resolveApiV1CtxMock.mockResolvedValue({
      ok: false,
      response: apiError(429, "rate_limited", "Too many requests. Try again shortly."),
    });

    const res = await GET();

    expect(res.status).toBe(429);
    expect(getRentalSummaryMock).not.toHaveBeenCalled();
  });

  it("returns the rental summary DTO on success — no lease/tenant/payment rows leaked", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: CTX });
    getRentalSummaryMock.mockResolvedValue({
      ...EMPTY_ROLLUP,
      occupancyPercent: 50,
      occupiedCount: 1,
      totalCount: 2,
      tenancyCount: 1,
      nextPayoutAmountNumeric: 2850,
      nextPayoutAt: 1727740800000,
    });

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      occupancyPercent: 50,
      occupiedCount: 1,
      totalCount: 2,
      tenancyCount: 1,
      nextPayoutAmountNumeric: 2850,
      nextPayoutAt: 1727740800000,
      currency: "USD",
      ...EMPTY_ROLLUP,
    });
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("USR-0001");
    expect(serialized).not.toContain("ORG-0001");
    expect(serialized).not.toContain("LEASE-");
    expect(getRentalSummaryMock).toHaveBeenCalledWith(CTX);
  });

  it("serves the dashboard rollup: counts, raw amounts, capped display rows, no identifiers", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: CTX });
    const activity = Array.from({ length: 7 }, (_, i) => ({
      title: "Rent paid",
      propertyName: "77 Kestrel",
      at: 1_790_000_000_000 - i * 1000,
      amountNumeric: 3200,
    }));
    getRentalSummaryMock.mockResolvedValue({
      ...EMPTY_ROLLUP,
      occupancyPercent: 75,
      occupiedCount: 3,
      totalCount: 4,
      tenancyCount: 3,
      nextPayoutAmountNumeric: 3200,
      nextPayoutAt: 1_790_100_000_000,
      collectedAmountNumeric: 6040,
      expectedAmountNumeric: 9240,
      paidCount: 2,
      dueCount: 3,
      depositHeldNumeric: 9570,
      documentCount: 10,
      activity,
    });

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ paidCount: 2, dueCount: 3, collectedAmountNumeric: 6040, expectedAmountNumeric: 9240, overdueAmountNumeric: null, depositHeldNumeric: 9570, documentCount: 10 });
    expect(body.activity).toHaveLength(5);
    expect(body.activity.map((a: { at: number }) => a.at)).toEqual(activity.slice(0, 5).map((a) => a.at));
    const serialized = JSON.stringify(body);
    for (const key of ["leaseId", "tenantId", "paymentId", "documentId", "orgId", "storageId"]) {
      expect(serialized).not.toContain(key);
    }
  });

  it("returns zeros and null payout fields when the org has no rental data", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: CTX });
    getRentalSummaryMock.mockResolvedValue({
      ...EMPTY_ROLLUP,
      occupancyPercent: 0,
      occupiedCount: 0,
      totalCount: 0,
      tenancyCount: 0,
      nextPayoutAmountNumeric: null,
      nextPayoutAt: null,
    });

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      occupancyPercent: 0,
      occupiedCount: 0,
      totalCount: 0,
      tenancyCount: 0,
      nextPayoutAmountNumeric: null,
      nextPayoutAt: null,
      currency: null,
      ...EMPTY_ROLLUP,
    });
  });

  it("fails closed with a generic 500 when the service throws unexpectedly (no message leak)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: CTX });
    getRentalSummaryMock.mockRejectedValue(new Error("SECRET-DB-ERROR-MARKER"));

    const res = await GET();

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: { code: "internal_error", message: expect.any(String) } });
    expect(JSON.stringify(body)).not.toContain("SECRET-DB-ERROR-MARKER");
  });
});
