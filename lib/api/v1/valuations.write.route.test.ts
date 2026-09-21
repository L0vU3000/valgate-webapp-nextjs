import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Ctx } from "@/lib/services/_mapping";
import { apiError } from "./http";

// ---------------------------------------------------------------------------
// Write side of the valuation slice — auth seam, role gate, property/valuation lookup and the
// valuations service are fully mocked (no real Clerk/DB/network), same shape as
// documents.write.route.test.ts. Proves: no auth -> 401 everywhere, a client-supplied
// propertyId/recordedAt/id in the body is stripped (URL owns propertyId, server owns
// recordedAt, id is generated), viewer cannot POST/PATCH, a non-admin cannot DELETE, a
// missing or cross-org property/valuation is a plain 404 (no IDOR signal), and every 201/200
// body is a PropertyValuationDtoV1 with recordedAt withheld.
// ---------------------------------------------------------------------------

const {
  assertCanMutateMock,
  createPropertyValuationMock,
  deletePropertyValuationMock,
  getPropertyMock,
  getPropertyValuationMock,
  resolveApiV1CtxMock,
  roleAtLeastMock,
  updatePropertyValuationMock,
} = vi.hoisted(() => ({
  assertCanMutateMock: vi.fn(),
  createPropertyValuationMock: vi.fn(),
  deletePropertyValuationMock: vi.fn(),
  getPropertyMock: vi.fn(),
  getPropertyValuationMock: vi.fn(),
  resolveApiV1CtxMock: vi.fn(),
  roleAtLeastMock: vi.fn(),
  updatePropertyValuationMock: vi.fn(),
}));

vi.mock("./auth", () => ({ resolveApiV1Ctx: resolveApiV1CtxMock }));
vi.mock("@/lib/services/_mapping", () => ({
  assertCanMutate: assertCanMutateMock,
  roleAtLeast: roleAtLeastMock,
}));
vi.mock("@/lib/services/properties", () => ({ getProperty: getPropertyMock }));
vi.mock("@/lib/services/property-valuations", () => ({
  createPropertyValuation: createPropertyValuationMock,
  deletePropertyValuation: deletePropertyValuationMock,
  getPropertyValuation: getPropertyValuationMock,
  updatePropertyValuation: updatePropertyValuationMock,
}));

import { POST as createValuation } from "@/app/api/v1/properties/[id]/valuations/route";
import {
  DELETE as deleteValuation,
  PATCH as patchValuation,
} from "@/app/api/v1/valuations/[id]/route";

const OWNER_CTX: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };
const MEMBER_CTX: Ctx = { userId: "USR-0002", orgId: "ORG-0001", orgRole: "member" };
const VIEWER_CTX: Ctx = { userId: "USR-0003", orgId: "ORG-0001", orgRole: "viewer" };
const PROPERTY_ID = "PROP-0001";

const PROPERTY = { id: PROPERTY_ID, name: "42 Ocean Ave" };
const VALUATION = {
  id: "VAL-0007",
  propertyId: PROPERTY_ID,
  month: "Jan 2026",
  price: 5250000,
  recordedAt: 1760000000000,
};

const createBody = { month: "Jan 2026", price: 5250000 };

function propertyParams(id = PROPERTY_ID) {
  return { params: Promise.resolve({ id }) };
}

function valuationParams(id = "VAL-0007") {
  return { params: Promise.resolve({ id }) };
}

function jsonRequest(url: string, body: unknown, method = "POST"): Request {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function rawRequest(url: string, body: string, method = "POST"): Request {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  roleAtLeastMock.mockImplementation((role: Ctx["orgRole"], minimum: Ctx["orgRole"]) => {
    const rank = { viewer: 0, member: 1, admin: 2, owner: 3 };
    return rank[role] >= rank[minimum];
  });
  resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: OWNER_CTX });
  getPropertyMock.mockResolvedValue(PROPERTY);
  getPropertyValuationMock.mockResolvedValue(VALUATION);
  createPropertyValuationMock.mockResolvedValue(VALUATION);
  updatePropertyValuationMock.mockResolvedValue(VALUATION);
  deletePropertyValuationMock.mockResolvedValue(undefined);
});

describe("POST /api/v1/properties/{id}/valuations", () => {
  it("returns 401 before touching the property or the service", async () => {
    resolveApiV1CtxMock.mockResolvedValue({
      ok: false,
      response: apiError(401, "unauthorized", "Authentication required."),
    });

    const res = await createValuation(
      jsonRequest(`/api/v1/properties/${PROPERTY_ID}/valuations`, createBody),
      propertyParams(),
    );

    expect(res.status).toBe(401);
    expect(getPropertyMock).not.toHaveBeenCalled();
    expect(createPropertyValuationMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-JSON body and for invalid valuation fields", async () => {
    const notJson = await createValuation(
      rawRequest(`/api/v1/properties/${PROPERTY_ID}/valuations`, "{not json"),
      propertyParams(),
    );
    expect(notJson.status).toBe(400);

    const badMonth = await createValuation(
      jsonRequest(`/api/v1/properties/${PROPERTY_ID}/valuations`, { month: "Zzz 2025", price: 1 }),
      propertyParams(),
    );
    expect(badMonth.status).toBe(400);

    const badPrice = await createValuation(
      jsonRequest(`/api/v1/properties/${PROPERTY_ID}/valuations`, { month: "Jan 2026", price: -1 }),
      propertyParams(),
    );
    expect(badPrice.status).toBe(400);

    expect(createPropertyValuationMock).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing or cross-org property and creates nothing", async () => {
    getPropertyMock.mockResolvedValue(null);

    const res = await createValuation(
      jsonRequest("/api/v1/properties/PROP-9999/valuations", createBody),
      propertyParams("PROP-9999"),
    );

    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not_found");
    expect(createPropertyValuationMock).not.toHaveBeenCalled();
  });

  it("blocks a viewer with 403 and never writes", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: VIEWER_CTX });

    const res = await createValuation(
      jsonRequest(`/api/v1/properties/${PROPERTY_ID}/valuations`, createBody),
      propertyParams(),
    );

    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("forbidden");
    expect(createPropertyValuationMock).not.toHaveBeenCalled();
  });

  it("lets a member create, stamping recordedAt server-side and taking propertyId from the URL", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: MEMBER_CTX });
    const before = Date.now();

    const res = await createValuation(
      jsonRequest(`/api/v1/properties/${PROPERTY_ID}/valuations`, {
        month: "Feb 2026",
        price: 5300000,
        // Hostile extras: the URL owns propertyId, the server owns recordedAt/id.
        propertyId: "PROP-SECRET",
        recordedAt: 1,
        id: "VAL-SECRET",
      }),
      propertyParams(),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({
      id: "VAL-0007",
      propertyId: PROPERTY_ID,
      month: "Jan 2026",
      price: 5250000,
    });
    expect(body).not.toHaveProperty("recordedAt");
    expect(JSON.stringify(body)).not.toContain("SECRET");

    expect(createPropertyValuationMock).toHaveBeenCalledTimes(1);
    const [ctxArg, inputArg] = createPropertyValuationMock.mock.calls[0];
    expect(ctxArg).toBe(MEMBER_CTX);
    expect(inputArg).toMatchObject({
      propertyId: PROPERTY_ID,
      month: "Feb 2026",
      price: 5300000,
    });
    expect(inputArg.recordedAt).toBeGreaterThanOrEqual(before);
    expect(inputArg).not.toHaveProperty("id");
  });

  it("fails closed with a generic 500 when the service throws (no message leak)", async () => {
    createPropertyValuationMock.mockRejectedValue(new Error("SECRET-DB-ERROR-MARKER"));

    const res = await createValuation(
      jsonRequest(`/api/v1/properties/${PROPERTY_ID}/valuations`, createBody),
      propertyParams(),
    );

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("internal_error");
    expect(JSON.stringify(body)).not.toContain("SECRET-DB-ERROR-MARKER");
  });
});

describe("PATCH /api/v1/valuations/{id}", () => {
  it("returns 401 before touching the service", async () => {
    resolveApiV1CtxMock.mockResolvedValue({
      ok: false,
      response: apiError(401, "unauthorized", "Authentication required."),
    });

    const res = await patchValuation(
      jsonRequest("/api/v1/valuations/VAL-0007", { price: 1 }, "PATCH"),
      valuationParams(),
    );

    expect(res.status).toBe(401);
    expect(getPropertyValuationMock).not.toHaveBeenCalled();
    expect(updatePropertyValuationMock).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid patch fields", async () => {
    const res = await patchValuation(
      jsonRequest("/api/v1/valuations/VAL-0007", { month: "Zzz 2025" }, "PATCH"),
      valuationParams(),
    );

    expect(res.status).toBe(400);
    expect(updatePropertyValuationMock).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing or cross-org valuation", async () => {
    getPropertyValuationMock.mockResolvedValue(null);

    const res = await patchValuation(
      jsonRequest("/api/v1/valuations/VAL-9999", { price: 1 }, "PATCH"),
      valuationParams("VAL-9999"),
    );

    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not_found");
    expect(getPropertyValuationMock).toHaveBeenCalledWith(OWNER_CTX, "VAL-9999");
    expect(updatePropertyValuationMock).not.toHaveBeenCalled();
  });

  it("blocks a viewer with 403 and never updates", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: VIEWER_CTX });

    const res = await patchValuation(
      jsonRequest("/api/v1/valuations/VAL-0007", { price: 1 }, "PATCH"),
      valuationParams(),
    );

    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("forbidden");
    expect(updatePropertyValuationMock).not.toHaveBeenCalled();
  });

  it("updates only month/price and returns the public DTO for a member", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: MEMBER_CTX });

    const res = await patchValuation(
      jsonRequest(
        "/api/v1/valuations/VAL-0007",
        // Hostile extras must be stripped, never forwarded as a patch.
        { price: 5400000, propertyId: "PROP-SECRET", recordedAt: 1, id: "VAL-SECRET" },
        "PATCH",
      ),
      valuationParams(),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      id: "VAL-0007",
      propertyId: PROPERTY_ID,
      month: "Jan 2026",
      price: 5250000,
    });
    expect(body).not.toHaveProperty("recordedAt");
    expect(updatePropertyValuationMock).toHaveBeenCalledWith(MEMBER_CTX, "VAL-0007", {
      price: 5400000,
    });
  });

  it("returns 404 when the row disappears between the lookup and the update", async () => {
    updatePropertyValuationMock.mockResolvedValue(null);

    const res = await patchValuation(
      jsonRequest("/api/v1/valuations/VAL-0007", { price: 1 }, "PATCH"),
      valuationParams(),
    );

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/v1/valuations/{id}", () => {
  it("returns 401 before touching the service", async () => {
    resolveApiV1CtxMock.mockResolvedValue({
      ok: false,
      response: apiError(401, "unauthorized", "Authentication required."),
    });

    const res = await deleteValuation(
      new Request("http://localhost/api/v1/valuations/VAL-0007", { method: "DELETE" }),
      valuationParams(),
    );

    expect(res.status).toBe(401);
    expect(deletePropertyValuationMock).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing or cross-org valuation and deletes nothing", async () => {
    getPropertyValuationMock.mockResolvedValue(null);

    const res = await deleteValuation(
      new Request("http://localhost/api/v1/valuations/VAL-9999", { method: "DELETE" }),
      valuationParams("VAL-9999"),
    );

    expect(res.status).toBe(404);
    expect(deletePropertyValuationMock).not.toHaveBeenCalled();
  });

  it.each([
    ["member", MEMBER_CTX],
    ["viewer", VIEWER_CTX],
  ])("blocks a %s (non-admin) with 403 and never deletes", async (_role, ctx) => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx });

    const res = await deleteValuation(
      new Request("http://localhost/api/v1/valuations/VAL-0007", { method: "DELETE" }),
      valuationParams(),
    );

    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("forbidden");
    expect(deletePropertyValuationMock).not.toHaveBeenCalled();
  });

  it("deletes for an owner and returns 204 with no body", async () => {
    const res = await deleteValuation(
      new Request("http://localhost/api/v1/valuations/VAL-0007", { method: "DELETE" }),
      valuationParams(),
    );

    expect(res.status).toBe(204);
    expect(deletePropertyValuationMock).toHaveBeenCalledWith(OWNER_CTX, "VAL-0007");
    expect(await res.text()).toBe("");
  });
});
