import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Ctx } from "@/lib/services/_mapping";
import { apiError } from "./http";

// ---------------------------------------------------------------------------
// Write routes HTTP API v1: ownership records + co-owners. Auth seam, the two ownership services,
// and the properties lookup fully mocked (no real Clerk/DB/network). Proves the v1 write
// conventions: write rate-limiter on the auth seam, 400 invalid body, 404 missing/cross-org
// target before any mutation, member+ for create/update, admin+ for delete, demo read-only mode
// rejected as 403, 500 fails closed with no message leak, and every response carries only the
// public OwnershipRecordDto / CoOwnerDto (loan/lender/ssn/tax internals withheld).
// ---------------------------------------------------------------------------

const {
  assertCanMutateMock,
  roleAtLeastMock,
  resolveApiV1CtxMock,
  getPropertyMock,
  getOwnershipRecordMock,
  createOwnershipRecordMock,
  updateOwnershipRecordMock,
  deleteOwnershipRecordMock,
  getCoOwnerMock,
  createCoOwnerMock,
  updateCoOwnerMock,
  deleteCoOwnerMock,
} = vi.hoisted(() => ({
  assertCanMutateMock: vi.fn(),
  roleAtLeastMock: vi.fn(),
  resolveApiV1CtxMock: vi.fn(),
  getPropertyMock: vi.fn(),
  getOwnershipRecordMock: vi.fn(),
  createOwnershipRecordMock: vi.fn(),
  updateOwnershipRecordMock: vi.fn(),
  deleteOwnershipRecordMock: vi.fn(),
  getCoOwnerMock: vi.fn(),
  createCoOwnerMock: vi.fn(),
  updateCoOwnerMock: vi.fn(),
  deleteCoOwnerMock: vi.fn(),
}));

vi.mock("@/lib/api/v1/auth", () => ({ resolveApiV1Ctx: resolveApiV1CtxMock }));
vi.mock("@/lib/services/_mapping", () => ({
  assertCanMutate: assertCanMutateMock,
  roleAtLeast: roleAtLeastMock,
}));
vi.mock("@/lib/services/properties", () => ({ getProperty: getPropertyMock }));
vi.mock("@/lib/services/ownership-records", () => ({
  getOwnershipRecord: getOwnershipRecordMock,
  createOwnershipRecord: createOwnershipRecordMock,
  updateOwnershipRecord: updateOwnershipRecordMock,
  deleteOwnershipRecord: deleteOwnershipRecordMock,
}));
vi.mock("@/lib/services/co-owners", () => ({
  getCoOwner: getCoOwnerMock,
  createCoOwner: createCoOwnerMock,
  updateCoOwner: updateCoOwnerMock,
  deleteCoOwner: deleteCoOwnerMock,
}));

import {
  POST as createOwnershipRecordRoute,
} from "@/app/api/v1/properties/[id]/ownership/route";
import {
  DELETE as deleteOwnershipRecordRoute,
  PATCH as patchOwnershipRecordRoute,
} from "@/app/api/v1/ownership/[ownershipRecordId]/route";
import { POST as createCoOwnerRoute } from "@/app/api/v1/properties/[id]/co-owners/route";
import {
  DELETE as deleteCoOwnerRoute,
  PATCH as patchCoOwnerRoute,
} from "@/app/api/v1/co-owners/[coOwnerId]/route";

const OWNER_CTX: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };
const MEMBER_CTX: Ctx = { userId: "USR-0004", orgId: "ORG-0001", orgRole: "member" };
const VIEWER_CTX: Ctx = { userId: "USR-0002", orgId: "ORG-0001", orgRole: "viewer" };
const PROPERTY = { id: "PROP-0001", name: "42 Ocean Ave" };

// Full service rows — every withheld field populated so the DTO assertions prove the drop.
const OWNERSHIP_RECORD = {
  id: "OREC-0001",
  propertyId: "PROP-0001",
  holdingType: "Joint Tenancy",
  distributionMethod: "Pro-Rata by Share",
  loanType: "LOAN-SECRET-FIXED",
  loanAmount: 812000,
  lenderName: "LENDER-SECRET-BANK",
  verified: true,
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
  tax1099Status: "TAX-SECRET-1099",
};

const WITHHELD_MARKERS = [
  "LOAN-SECRET",
  "LENDER-SECRET",
  "EVIDENCE-SECRET",
  '\"loanType"',
  '\"loanAmount"',
  '\"lenderName"',
  '\"verified"',
  '\"evidenceDocIds"',
  '\"createdAt"',
  '\"updatedAt"',
  "ADDRESS-SECRET",
  "••••-••-1234",
  "TAX-SECRET",
  '\"ssnMasked"',
  '\"tax1099Status"',
  '\"address"',
];

function propsParams(id: string) {
  return { params: Promise.resolve({ id }) };
}
function recordParams(ownershipRecordId: string) {
  return { params: Promise.resolve({ ownershipRecordId }) };
}
function coOwnerParams(coOwnerId: string) {
  return { params: Promise.resolve({ coOwnerId }) };
}

function jsonRequest(url: string, body: unknown, method: string): Request {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  // resetAllMocks (not clearAllMocks) so a per-test mockImplementation — e.g. the demo-mode
  // assertCanMutate throw below — does not leak into every later test.
  vi.resetAllMocks();
  // Default: the caller passes the role gate. The negative role tests below flip this to false.
  roleAtLeastMock.mockReturnValue(true);
  resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: OWNER_CTX });
  getPropertyMock.mockResolvedValue(PROPERTY);
  getOwnershipRecordMock.mockResolvedValue(OWNERSHIP_RECORD);
  createOwnershipRecordMock.mockResolvedValue(OWNERSHIP_RECORD);
  updateOwnershipRecordMock.mockResolvedValue(OWNERSHIP_RECORD);
  deleteOwnershipRecordMock.mockResolvedValue(undefined);
  getCoOwnerMock.mockResolvedValue(CO_OWNER);
  createCoOwnerMock.mockResolvedValue(CO_OWNER);
  updateCoOwnerMock.mockResolvedValue(CO_OWNER);
  deleteCoOwnerMock.mockResolvedValue(undefined);
});

describe("POST /api/v1/properties/{id}/ownership", () => {
  it("returns 401 before touching the property or the service", async () => {
    resolveApiV1CtxMock.mockResolvedValue({
      ok: false,
      response: apiError(401, "unauthorized", "Authentication required."),
    });

    const res = await createOwnershipRecordRoute(
      jsonRequest("/api/v1/properties/PROP-0001/ownership", { holdingType: "LLC" }, "POST"),
      propsParams("PROP-0001"),
    );

    expect(res.status).toBe(401);
    expect(getPropertyMock).not.toHaveBeenCalled();
    expect(createOwnershipRecordMock).not.toHaveBeenCalled();
  });

  it("uses the write auth kind (separate budget from reads)", async () => {
    await createOwnershipRecordRoute(
      jsonRequest("/api/v1/properties/PROP-0001/ownership", { holdingType: "LLC" }, "POST"),
      propsParams("PROP-0001"),
    );

    expect(resolveApiV1CtxMock).toHaveBeenCalledWith("write");
  });

  it("returns 400 for an invalid holding type and never calls the service", async () => {
    const res = await createOwnershipRecordRoute(
      jsonRequest("/api/v1/properties/PROP-0001/ownership", { holdingType: "Nonsense" }, "POST"),
      propsParams("PROP-0001"),
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_request");
    expect(createOwnershipRecordMock).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing/cross-org property before any mutation", async () => {
    getPropertyMock.mockResolvedValue(null);

    const res = await createOwnershipRecordRoute(
      jsonRequest("/api/v1/properties/PROP-9999/ownership", { holdingType: "LLC" }, "POST"),
      propsParams("PROP-9999"),
    );

    expect(res.status).toBe(404);
    expect(createOwnershipRecordMock).not.toHaveBeenCalled();
  });

  it("returns 403 for a viewer (member+ required)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: VIEWER_CTX });
    roleAtLeastMock.mockReturnValue(false);

    const res = await createOwnershipRecordRoute(
      jsonRequest("/api/v1/properties/PROP-0001/ownership", { holdingType: "LLC" }, "POST"),
      propsParams("PROP-0001"),
    );

    expect(res.status).toBe(403);
    expect(createOwnershipRecordMock).not.toHaveBeenCalled();
  });

  it("rejects demo read-only writes with 403 (never echoes the raw message)", async () => {
    assertCanMutateMock.mockImplementation(() => {
      throw new Error("Demo is read-only");
    });

    const res = await createOwnershipRecordRoute(
      jsonRequest("/api/v1/properties/PROP-0001/ownership", { holdingType: "LLC" }, "POST"),
      propsParams("PROP-0001"),
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("forbidden");
    expect(JSON.stringify(body)).not.toContain("Demo is read-only");
    expect(createOwnershipRecordMock).not.toHaveBeenCalled();
  });

  it("creates for a member and returns only the public OwnershipRecordDto", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: MEMBER_CTX });

    const res = await createOwnershipRecordRoute(
      jsonRequest(
        "/api/v1/properties/PROP-0001/ownership",
        { holdingType: "Joint Tenancy", distributionMethod: "Equal Split" },
        "POST",
      ),
      propsParams("PROP-0001"),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({
      id: "OREC-0001",
      propertyId: "PROP-0001",
      holdingType: "Joint Tenancy",
      distributionMethod: "Pro-Rata by Share",
    });
    // propertyId comes from the URL, not the body.
    expect(createOwnershipRecordMock).toHaveBeenCalledWith(MEMBER_CTX, {
      propertyId: "PROP-0001",
      holdingType: "Joint Tenancy",
      distributionMethod: "Equal Split",
    });
    const serialized = JSON.stringify(body);
    for (const marker of WITHHELD_MARKERS) expect(serialized).not.toContain(marker);
  });

  it("fails closed with a generic 500 when the service throws", async () => {
    createOwnershipRecordMock.mockRejectedValue(new Error("SECRET-DB-ERROR-MARKER"));

    const res = await createOwnershipRecordRoute(
      jsonRequest("/api/v1/properties/PROP-0001/ownership", { holdingType: "LLC" }, "POST"),
      propsParams("PROP-0001"),
    );

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: { code: "internal_error", message: expect.any(String) } });
    expect(JSON.stringify(body)).not.toContain("SECRET-DB-ERROR-MARKER");
  });
});

describe("PATCH /api/v1/ownership/{ownershipRecordId}", () => {
  it("returns 400 for an empty patch body (a PATCH must change something)", async () => {
    const res = await patchOwnershipRecordRoute(
      jsonRequest("/api/v1/ownership/OREC-0001", {}, "PATCH"),
      recordParams("OREC-0001"),
    );

    expect(res.status).toBe(400);
    expect(updateOwnershipRecordMock).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing/cross-org record before any mutation", async () => {
    getOwnershipRecordMock.mockResolvedValue(null);

    const res = await patchOwnershipRecordRoute(
      jsonRequest("/api/v1/ownership/OREC-9999", { holdingType: "LLC" }, "PATCH"),
      recordParams("OREC-9999"),
    );

    expect(res.status).toBe(404);
    expect(updateOwnershipRecordMock).not.toHaveBeenCalled();
  });

  it("returns 403 for a viewer", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: VIEWER_CTX });
    roleAtLeastMock.mockReturnValue(false);

    const res = await patchOwnershipRecordRoute(
      jsonRequest("/api/v1/ownership/OREC-0001", { holdingType: "LLC" }, "PATCH"),
      recordParams("OREC-0001"),
    );

    expect(res.status).toBe(403);
    expect(updateOwnershipRecordMock).not.toHaveBeenCalled();
  });

  it("patches only the sent subset and returns the public DTO", async () => {
    const res = await patchOwnershipRecordRoute(
      jsonRequest(
        "/api/v1/ownership/OREC-0001",
        { distributionMethod: "Custom", loanAmount: 999999 },
        "PATCH",
      ),
      recordParams("OREC-0001"),
    );

    expect(res.status).toBe(200);
    expect(updateOwnershipRecordMock).toHaveBeenCalledWith(OWNER_CTX, "OREC-0001", {
      distributionMethod: "Custom",
    });
    const body = await res.json();
    const serialized = JSON.stringify(body);
    for (const marker of WITHHELD_MARKERS) expect(serialized).not.toContain(marker);
  });
});

describe("DELETE /api/v1/ownership/{ownershipRecordId}", () => {
  it("returns 404 for a missing record before any mutation", async () => {
    getOwnershipRecordMock.mockResolvedValue(null);

    const res = await deleteOwnershipRecordRoute(
      new Request("http://localhost/api/v1/ownership/OREC-9999", { method: "DELETE" }),
      recordParams("OREC-9999"),
    );

    expect(res.status).toBe(404);
    expect(deleteOwnershipRecordMock).not.toHaveBeenCalled();
  });

  it("returns 403 for a member (admin+ required for delete)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: MEMBER_CTX });
    roleAtLeastMock.mockReturnValue(false);

    const res = await deleteOwnershipRecordRoute(
      new Request("http://localhost/api/v1/ownership/OREC-0001", { method: "DELETE" }),
      recordParams("OREC-0001"),
    );

    expect(res.status).toBe(403);
    expect(deleteOwnershipRecordMock).not.toHaveBeenCalled();
  });

  it("deletes for an admin with 204", async () => {
    const res = await deleteOwnershipRecordRoute(
      new Request("http://localhost/api/v1/ownership/OREC-0001", { method: "DELETE" }),
      recordParams("OREC-0001"),
    );

    expect(res.status).toBe(204);
    expect(deleteOwnershipRecordMock).toHaveBeenCalledWith(OWNER_CTX, "OREC-0001");
  });
});

describe("POST /api/v1/properties/{id}/co-owners", () => {
  const validBody = {
    name: "Ada Lovelace",
    role: "Primary",
    sharePercent: 60,
    email: "ada@example.com",
    phone: "+1-555-0100",
  };

  it("returns 400 for an empty name", async () => {
    const res = await createCoOwnerRoute(
      jsonRequest("/api/v1/properties/PROP-0001/co-owners", { ...validBody, name: "" }, "POST"),
      propsParams("PROP-0001"),
    );

    expect(res.status).toBe(400);
    expect(createCoOwnerMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a bad role", async () => {
    const res = await createCoOwnerRoute(
      jsonRequest("/api/v1/properties/PROP-0001/co-owners", { ...validBody, role: "Owner" }, "POST"),
      propsParams("PROP-0001"),
    );

    expect(res.status).toBe(400);
  });

  it("returns 400 for sharePercent outside 0-100", async () => {
    const res = await createCoOwnerRoute(
      jsonRequest("/api/v1/properties/PROP-0001/co-owners", { ...validBody, sharePercent: 140 }, "POST"),
      propsParams("PROP-0001"),
    );

    expect(res.status).toBe(400);
  });

  it("returns 400 for a malformed email", async () => {
    const res = await createCoOwnerRoute(
      jsonRequest("/api/v1/properties/PROP-0001/co-owners", { ...validBody, email: "not-an-email" }, "POST"),
      propsParams("PROP-0001"),
    );

    expect(res.status).toBe(400);
    expect(createCoOwnerMock).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing/cross-org property before any mutation", async () => {
    getPropertyMock.mockResolvedValue(null);

    const res = await createCoOwnerRoute(
      jsonRequest("/api/v1/properties/PROP-9999/co-owners", validBody, "POST"),
      propsParams("PROP-9999"),
    );

    expect(res.status).toBe(404);
    expect(createCoOwnerMock).not.toHaveBeenCalled();
  });

  it("returns 403 for a viewer", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: VIEWER_CTX });
    roleAtLeastMock.mockReturnValue(false);

    const res = await createCoOwnerRoute(
      jsonRequest("/api/v1/properties/PROP-0001/co-owners", validBody, "POST"),
      propsParams("PROP-0001"),
    );

    expect(res.status).toBe(403);
    expect(createCoOwnerMock).not.toHaveBeenCalled();
  });

  it("creates for a member and returns only the public CoOwnerDto", async () => {
    const res = await createCoOwnerRoute(
      jsonRequest("/api/v1/properties/PROP-0001/co-owners", validBody, "POST"),
      propsParams("PROP-0001"),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({
      id: "COOWN-0001",
      propertyId: "PROP-0001",
      name: "Ada Lovelace",
      role: "Primary",
      sharePercent: 60,
      email: "ada@example.com",
      phone: "+1-555-0100",
    });
    expect(createCoOwnerMock).toHaveBeenCalledWith(OWNER_CTX, expect.objectContaining({
      propertyId: "PROP-0001",
      name: "Ada Lovelace",
      role: "Primary",
      sharePercent: 60,
    }));
    const serialized = JSON.stringify(body);
    for (const marker of WITHHELD_MARKERS) expect(serialized).not.toContain(marker);
  });
});

describe("PATCH /api/v1/co-owners/{coOwnerId}", () => {
  it("returns 400 for an empty patch body", async () => {
    const res = await patchCoOwnerRoute(
      jsonRequest("/api/v1/co-owners/COOWN-0001", {}, "PATCH"),
      coOwnerParams("COOWN-0001"),
    );

    expect(res.status).toBe(400);
    expect(updateCoOwnerMock).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing/cross-org co-owner before any mutation", async () => {
    getCoOwnerMock.mockResolvedValue(null);

    const res = await patchCoOwnerRoute(
      jsonRequest("/api/v1/co-owners/COOWN-9999", { name: "Grace" }, "PATCH"),
      coOwnerParams("COOWN-9999"),
    );

    expect(res.status).toBe(404);
    expect(updateCoOwnerMock).not.toHaveBeenCalled();
  });

  it("returns 403 for a viewer", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: VIEWER_CTX });
    roleAtLeastMock.mockReturnValue(false);

    const res = await patchCoOwnerRoute(
      jsonRequest("/api/v1/co-owners/COOWN-0001", { name: "Grace" }, "PATCH"),
      coOwnerParams("COOWN-0001"),
    );

    expect(res.status).toBe(403);
    expect(updateCoOwnerMock).not.toHaveBeenCalled();
  });

  it("patches only the sent subset and returns the public DTO", async () => {
    const res = await patchCoOwnerRoute(
      jsonRequest(
        "/api/v1/co-owners/COOWN-0001",
        { sharePercent: 40, ssnMasked: "••••-••-9999", address: "NOPE" },
        "PATCH",
      ),
      coOwnerParams("COOWN-0001"),
    );

    expect(res.status).toBe(200);
    expect(updateCoOwnerMock).toHaveBeenCalledWith(OWNER_CTX, "COOWN-0001", { sharePercent: 40 });
    const serialized = JSON.stringify(await res.json());
    for (const marker of WITHHELD_MARKERS) expect(serialized).not.toContain(marker);
  });
});

describe("DELETE /api/v1/co-owners/{coOwnerId}", () => {
  it("returns 404 for a missing co-owner before any mutation", async () => {
    getCoOwnerMock.mockResolvedValue(null);

    const res = await deleteCoOwnerRoute(
      new Request("http://localhost/api/v1/co-owners/COOWN-9999", { method: "DELETE" }),
      coOwnerParams("COOWN-9999"),
    );

    expect(res.status).toBe(404);
    expect(deleteCoOwnerMock).not.toHaveBeenCalled();
  });

  it("returns 403 for a member (admin+ required for delete)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: MEMBER_CTX });
    roleAtLeastMock.mockReturnValue(false);

    const res = await deleteCoOwnerRoute(
      new Request("http://localhost/api/v1/co-owners/COOWN-0001", { method: "DELETE" }),
      coOwnerParams("COOWN-0001"),
    );

    expect(res.status).toBe(403);
    expect(deleteCoOwnerMock).not.toHaveBeenCalled();
  });

  it("deletes for an admin with 204", async () => {
    const res = await deleteCoOwnerRoute(
      new Request("http://localhost/api/v1/co-owners/COOWN-0001", { method: "DELETE" }),
      coOwnerParams("COOWN-0001"),
    );

    expect(res.status).toBe(204);
    expect(deleteCoOwnerMock).toHaveBeenCalledWith(OWNER_CTX, "COOWN-0001");
  });
});
