import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Ctx } from "@/lib/services/_mapping";
import { apiError } from "./http";

// ---------------------------------------------------------------------------
// GET /api/v1/properties/[id]/ownership — auth seam, property lookup, and the three ownership
// services fully mocked (no real Clerk/DB/network). Proves: no auth -> 401, rate-limited -> 429,
// viewer role can read, absent/cross-org property -> 404 with no service call (getProperty is
// already org-scoped, so a cross-org id looks like "not found" and no ownership data is ever
// listed for a property the caller cannot see), success -> the ownership bundle in public DTO
// shape only, and every withheld field (loan/mortgage internals, ssnMasked, tax1099Status,
// verification flags, evidence-doc ids, audit timestamps) absent from the wire.
// ---------------------------------------------------------------------------

const {
  resolveApiV1CtxMock,
  getPropertyMock,
  listOwnershipRecordsMock,
  listCoOwnersMock,
  listOwnershipHistoryMock,
} = vi.hoisted(() => ({
  resolveApiV1CtxMock: vi.fn(),
  getPropertyMock: vi.fn(),
  listOwnershipRecordsMock: vi.fn(),
  listCoOwnersMock: vi.fn(),
  listOwnershipHistoryMock: vi.fn(),
}));

vi.mock("./auth", () => ({
  resolveApiV1Ctx: resolveApiV1CtxMock,
}));

vi.mock("@/lib/services/properties", () => ({
  getProperty: getPropertyMock,
}));

vi.mock("@/lib/services/ownership-records", () => ({
  listOwnershipRecords: listOwnershipRecordsMock,
}));

vi.mock("@/lib/services/co-owners", () => ({
  listCoOwners: listCoOwnersMock,
}));

vi.mock("@/lib/services/ownership-history", () => ({
  listOwnershipHistory: listOwnershipHistoryMock,
}));

import { GET } from "@/app/api/v1/properties/[id]/ownership/route";

const OWNER_CTX: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };
const VIEWER_CTX: Ctx = { userId: "USR-0002", orgId: "ORG-0001", orgRole: "viewer" };

const PROPERTY = {
  id: "PROP-0001",
  userId: "USR-SECRET-0001",
  orgId: "ORG-SECRET-0001",
  name: "42 Ocean Ave",
};

// Full rows, exactly as the services return them — every withheld field is populated so the
// assertions below prove the DTO drops them instead of relying on them being absent upstream.
const OWNERSHIP_RECORD = {
  id: "OREC-0001",
  propertyId: "PROP-0001",
  holdingType: "Joint Tenancy",
  distributionMethod: "Pro-Rata by Share",
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

const CO_OWNER = {
  id: "COOWN-0001",
  propertyId: "PROP-0001",
  name: "Ada Lovelace",
  role: "Primary",
  sharePercent: 60,
  email: "ada@example.com",
  phone: "+1-555-0100",
  address: "ADDRESS-SECRET-1",
  ssnMasked: "••••-••-1234",
  taxEntity: "Individual",
  tax1099Status: "TAX-SECRET-1099",
};

const HISTORY = {
  id: "OWNH-0001",
  propertyId: "PROP-0001",
  eventDate: 1743000000000,
  text: "Deed transferred to joint tenancy",
  color: "blue",
  createdAt: 1743000000000,
  updatedAt: 1743000000000,
};

// Everything that must never reach the wire — one marker per withheld field family.
const WITHHELD_MARKERS = [
  "LOAN-SECRET",
  "LENDER-SECRET",
  "EVIDENCE-SECRET",
  "ADDRESS-SECRET",
  "••••-••-1234",
  "TAX-SECRET",
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
  '"ssnMasked"',
  '"tax1099Status"',
  '"taxEntity"',
  '"address"',
  '"eventDate"',
  '"createdAt"',
  '"updatedAt"',
];

// Wraps a property id in the Next.js 15 async `params` shape the route handler expects.
function ctxParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function req(id: string): Request {
  return new Request(`http://localhost/api/v1/properties/${id}/ownership`);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/v1/properties/[id]/ownership", () => {
  it("returns 401 when the auth seam rejects the request (no auth)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({
      ok: false,
      response: apiError(401, "unauthorized", "Authentication required."),
    });

    const res = await GET(req("PROP-0001"), ctxParams("PROP-0001"));

    expect(res.status).toBe(401);
    expect(getPropertyMock).not.toHaveBeenCalled();
    expect(listOwnershipRecordsMock).not.toHaveBeenCalled();
    expect(listCoOwnersMock).not.toHaveBeenCalled();
    expect(listOwnershipHistoryMock).not.toHaveBeenCalled();
  });

  it("returns 429 when the auth seam's rate limiter rejects the request", async () => {
    resolveApiV1CtxMock.mockResolvedValue({
      ok: false,
      response: apiError(429, "rate_limited", "Too many requests. Try again shortly."),
    });

    const res = await GET(req("PROP-0001"), ctxParams("PROP-0001"));

    expect(res.status).toBe(429);
    expect(getPropertyMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the property is missing and lists no ownership data", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: OWNER_CTX });
    getPropertyMock.mockResolvedValue(null);

    const res = await GET(req("PROP-9999"), ctxParams("PROP-9999"));

    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not_found");
    expect(getPropertyMock).toHaveBeenCalledWith(OWNER_CTX, "PROP-9999");
    expect(listOwnershipRecordsMock).not.toHaveBeenCalled();
    expect(listCoOwnersMock).not.toHaveBeenCalled();
    expect(listOwnershipHistoryMock).not.toHaveBeenCalled();
  });

  it("returns 404 for a cross-org property (indistinguishable from missing — no IDOR signal)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: OWNER_CTX });
    // Another org's property: getProperty is org-scoped, so it resolves to null here.
    getPropertyMock.mockResolvedValue(null);

    const crossOrg = await GET(req("PROP-OTHER-ORG"), ctxParams("PROP-OTHER-ORG"));
    const missing = await GET(req("PROP-9999"), ctxParams("PROP-9999"));

    expect(crossOrg.status).toBe(404);
    expect(await crossOrg.json()).toEqual(await missing.json());
    expect(listOwnershipRecordsMock).not.toHaveBeenCalled();
  });

  it("lets a viewer-role caller read (reads are not role-gated)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: VIEWER_CTX });
    getPropertyMock.mockResolvedValue(PROPERTY);
    listOwnershipRecordsMock.mockResolvedValue([]);
    listCoOwnersMock.mockResolvedValue([]);
    listOwnershipHistoryMock.mockResolvedValue([]);

    const res = await GET(req("PROP-0001"), ctxParams("PROP-0001"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ownershipRecords: [],
      coOwners: [],
      ownershipHistory: [],
    });
    expect(listOwnershipRecordsMock).toHaveBeenCalledWith(VIEWER_CTX, "PROP-0001");
    expect(listCoOwnersMock).toHaveBeenCalledWith(VIEWER_CTX, "PROP-0001");
    expect(listOwnershipHistoryMock).toHaveBeenCalledWith(VIEWER_CTX, "PROP-0001");
  });

  it("returns the public ownership bundle on success and withholds every internal field", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: OWNER_CTX });
    getPropertyMock.mockResolvedValue(PROPERTY);
    listOwnershipRecordsMock.mockResolvedValue([OWNERSHIP_RECORD]);
    listCoOwnersMock.mockResolvedValue([CO_OWNER]);
    listOwnershipHistoryMock.mockResolvedValue([HISTORY]);

    const res = await GET(req("PROP-0001"), ctxParams("PROP-0001"));

    expect(res.status).toBe(200);
    const body = await res.json();

    // Exact shape: proves nothing extra rides along.
    expect(body).toEqual({
      ownershipRecords: [
        {
          id: "OREC-0001",
          propertyId: "PROP-0001",
          holdingType: "Joint Tenancy",
          distributionMethod: "Pro-Rata by Share",
        },
      ],
      coOwners: [
        {
          id: "COOWN-0001",
          propertyId: "PROP-0001",
          name: "Ada Lovelace",
          role: "Primary",
          sharePercent: 60,
          email: "ada@example.com",
          phone: "+1-555-0100",
        },
      ],
      ownershipHistory: [
        {
          id: "OWNH-0001",
          propertyId: "PROP-0001",
          text: "Deed transferred to joint tenancy",
          color: "blue",
        },
      ],
    });

    const serialized = JSON.stringify(body);
    for (const marker of WITHHELD_MARKERS) {
      expect(serialized).not.toContain(marker);
    }
    // The one secret that has no marker prefix of its own: the org/user ids on the property row
    // are never echoed either (they aren't part of the bundle at all).
    expect(serialized).not.toContain("ORG-SECRET");
    expect(serialized).not.toContain("USR-SECRET");
  });

  it("withheld assertion: loan, PII, and verification fields are absent even alone", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: OWNER_CTX });
    getPropertyMock.mockResolvedValue(PROPERTY);
    listOwnershipRecordsMock.mockResolvedValue([OWNERSHIP_RECORD]);
    listCoOwnersMock.mockResolvedValue([CO_OWNER]);
    listOwnershipHistoryMock.mockResolvedValue([]);

    const body = await (await GET(req("PROP-0001"), ctxParams("PROP-0001"))).json();
    const record = body.ownershipRecords[0] as Record<string, unknown>;
    const coOwner = body.coOwners[0] as Record<string, unknown>;

    for (const withheld of [
      "loanType",
      "loanAmount",
      "loanTermYears",
      "interestRate",
      "originationDate",
      "maturityDate",
      "nextPaymentDue",
      "lenderName",
      "downPayment",
      "closingCosts",
      "verified",
      "verifiedAt",
      "evidenceDocIds",
    ]) {
      expect(record).not.toHaveProperty(withheld);
    }
    for (const withheld of ["ssnMasked", "tax1099Status", "address", "taxEntity"]) {
      expect(coOwner).not.toHaveProperty(withheld);
    }
  });

  it("fails closed with a generic 500 when a service throws unexpectedly (no message leak)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: OWNER_CTX });
    getPropertyMock.mockResolvedValue(PROPERTY);
    listOwnershipRecordsMock.mockRejectedValue(new Error("SECRET-DB-ERROR-MARKER"));
    listCoOwnersMock.mockResolvedValue([]);
    listOwnershipHistoryMock.mockResolvedValue([]);

    const res = await GET(req("PROP-0001"), ctxParams("PROP-0001"));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: { code: "internal_error", message: expect.any(String) } });
    expect(JSON.stringify(body)).not.toContain("SECRET-DB-ERROR-MARKER");
  });
});
