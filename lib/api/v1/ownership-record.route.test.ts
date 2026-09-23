import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Ctx } from "@/lib/services/_mapping";
import { apiError } from "./http";

// ---------------------------------------------------------------------------
// GET /api/v1/ownership/[ownershipRecordId] — auth seam and the ownership-records service
// mocked. Proves: no auth -> 401, rate-limited -> 429, missing or cross-org record -> 404
// (getOwnershipRecord filters on orgId, so both look identical and no record data leaks),
// and success -> the public OwnershipRecordDto only, with the loan/lender/interest financial
// fields and the verified/evidenceDocIds internals absent from the wire.
// ---------------------------------------------------------------------------

const { resolveApiV1CtxMock, getOwnershipRecordMock } = vi.hoisted(() => ({
  resolveApiV1CtxMock: vi.fn(),
  getOwnershipRecordMock: vi.fn(),
}));

vi.mock("./auth", () => ({
  resolveApiV1Ctx: resolveApiV1CtxMock,
}));

vi.mock("@/lib/services/ownership-records", () => ({
  getOwnershipRecord: getOwnershipRecordMock,
}));

import { GET } from "@/app/api/v1/ownership/[ownershipRecordId]/route";

const OWNER_CTX: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };
const VIEWER_CTX: Ctx = { userId: "USR-0002", orgId: "ORG-0001", orgRole: "viewer" };

// A full service row — every withheld field populated on purpose.
const OWNERSHIP_RECORD = {
  id: "OREC-0001",
  propertyId: "PROP-0001",
  holdingType: "LLC",
  distributionMethod: "Equal Split",
  loanType: "LOAN-SECRET-FIXED",
  loanAmount: 812000,
  loanTermYears: 30,
  interestRate: 4.25,
  originationDate: 1700000000000,
  maturityDate: 1780000000000,
  nextPaymentDue: 1744000000000,
  lenderName: "LENDER-SECRET-BANK",
  downPayment: 200000,
  closingCosts: 14000,
  verified: true,
  verifiedAt: 1743897600000,
  evidenceDocIds: ["EVIDENCE-SECRET-1"],
  createdAt: 1743000000000,
  updatedAt: 1743200000000,
};

const WITHHELD_MARKERS = [
  "LOAN-SECRET",
  "LENDER-SECRET",
  "EVIDENCE-SECRET",
  '"loanType"',
  '"loanAmount"',
  '"loanTermYears"',
  '"interestRate"',
  '"originationDate"',
  '"maturityDate"',
  '"nextPaymentDue"',
  '"lenderName"',
  '"downPayment"',
  '"closingCosts"',
  '"verified"',
  '"verifiedAt"',
  '"evidenceDocIds"',
  '"createdAt"',
  '"updatedAt"',
];

function ctxParams(ownershipRecordId: string) {
  return { params: Promise.resolve({ ownershipRecordId }) };
}

function req(ownershipRecordId: string): Request {
  return new Request(`http://localhost/api/v1/ownership/${ownershipRecordId}`);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/v1/ownership/[ownershipRecordId]", () => {
  it("returns 401 when the auth seam rejects the request (no auth)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({
      ok: false,
      response: apiError(401, "unauthorized", "Authentication required."),
    });

    const res = await GET(req("OREC-0001"), ctxParams("OREC-0001"));

    expect(res.status).toBe(401);
    expect(getOwnershipRecordMock).not.toHaveBeenCalled();
  });

  it("returns 429 when the auth seam's rate limiter rejects the request", async () => {
    resolveApiV1CtxMock.mockResolvedValue({
      ok: false,
      response: apiError(429, "rate_limited", "Too many requests. Try again shortly."),
    });

    const res = await GET(req("OREC-0001"), ctxParams("OREC-0001"));

    expect(res.status).toBe(429);
    expect(getOwnershipRecordMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the record is missing", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: OWNER_CTX });
    getOwnershipRecordMock.mockResolvedValue(null);

    const res = await GET(req("OREC-9999"), ctxParams("OREC-9999"));

    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not_found");
    expect(getOwnershipRecordMock).toHaveBeenCalledWith(OWNER_CTX, "OREC-9999");
  });

  it("returns 404 for a cross-org record (indistinguishable from missing — no IDOR signal)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: OWNER_CTX });
    getOwnershipRecordMock.mockResolvedValue(null);

    const crossOrg = await GET(req("OREC-OTHER-ORG"), ctxParams("OREC-OTHER-ORG"));
    const missing = await GET(req("OREC-9999"), ctxParams("OREC-9999"));

    expect(crossOrg.status).toBe(404);
    expect(await crossOrg.json()).toEqual(await missing.json());
  });

  it("lets a viewer-role caller read the record (reads are not role-gated)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: VIEWER_CTX });
    getOwnershipRecordMock.mockResolvedValue(OWNERSHIP_RECORD);

    const res = await GET(req("OREC-0001"), ctxParams("OREC-0001"));

    expect(res.status).toBe(200);
    expect(getOwnershipRecordMock).toHaveBeenCalledWith(VIEWER_CTX, "OREC-0001");
  });

  it("returns the public OwnershipRecordDto on success and withholds every internal field", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: OWNER_CTX });
    getOwnershipRecordMock.mockResolvedValue(OWNERSHIP_RECORD);

    const res = await GET(req("OREC-0001"), ctxParams("OREC-0001"));

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toEqual({
      id: "OREC-0001",
      propertyId: "PROP-0001",
      holdingType: "LLC",
      distributionMethod: "Equal Split",
    });

    const serialized = JSON.stringify(body);
    for (const marker of WITHHELD_MARKERS) {
      expect(serialized).not.toContain(marker);
    }
  });

  it("fails closed with a generic 500 when the service throws unexpectedly (no message leak)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: OWNER_CTX });
    getOwnershipRecordMock.mockRejectedValue(new Error("SECRET-DB-ERROR-MARKER"));

    const res = await GET(req("OREC-0001"), ctxParams("OREC-0001"));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: { code: "internal_error", message: expect.any(String) } });
    expect(JSON.stringify(body)).not.toContain("SECRET-DB-ERROR-MARKER");
  });
});
