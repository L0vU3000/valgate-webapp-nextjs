import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Ctx } from "@/lib/services/_mapping";
import { apiError } from "./http";
import {
  parseCreateBody,
  parsePatchBody,
  toNewProperty,
  toPropertyPatch,
} from "./property-write";

// ---------------------------------------------------------------------------
// POST /api/v1/properties, PATCH /api/v1/properties/[id], DELETE /api/v1/properties/[id]
//
// Auth seam and properties service fully mocked (no real Clerk/DB/network).
// Proves: 401, 400, viewer 403, cross-org 404, happy path, and that storage ids
// / financial internals in the body are stripped before they reach the service.
// ---------------------------------------------------------------------------

const {
  resolveApiV1CtxMock,
  listPropertiesPageMock,
  createPropertyMock,
  getPropertyMock,
  updatePropertyMock,
  deletePropertyMock,
} = vi.hoisted(() => ({
  resolveApiV1CtxMock: vi.fn(),
  listPropertiesPageMock: vi.fn(),
  createPropertyMock: vi.fn(),
  getPropertyMock: vi.fn(),
  updatePropertyMock: vi.fn(),
  deletePropertyMock: vi.fn(),
}));

vi.mock("./auth", () => ({
  resolveApiV1Ctx: resolveApiV1CtxMock,
}));

vi.mock("@/lib/services/properties", () => ({
  listPropertiesPage: listPropertiesPageMock,
  createProperty: createPropertyMock,
  getProperty: getPropertyMock,
  updateProperty: updatePropertyMock,
  deleteProperty: deletePropertyMock,
}));

import { POST } from "@/app/api/v1/properties/route";
import { PATCH, DELETE } from "@/app/api/v1/properties/[id]/route";

const OWNER: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };
const MEMBER: Ctx = { userId: "USR-0002", orgId: "ORG-0001", orgRole: "member" };
const VIEWER: Ctx = { userId: "USR-0003", orgId: "ORG-0001", orgRole: "viewer" };

const CREATED_PROPERTY = {
  id: "PROP-0001",
  userId: "USR-SECRET-0001",
  orgId: "ORG-SECRET-0001",
  name: "42 Ocean Ave",
  type: "residential",
  status: "Vacant",
  city: "Phnom Penh",
  province: "Phnom Penh",
  createdAt: 1700000000000,
  addressLine: "42 Ocean Ave",
  country: "KH",
  totalArea: "",
  bedrooms: undefined,
  bathrooms: undefined,
  yearBuilt: undefined,
  photoStorageIds: ["STORE-PHOTO-SECRET-1"],
  documentStorageIds: ["STORE-DOC-SECRET-1"],
  buyNumeric: 0,
  title: "—",
  outstandingMortgage: 999999,
};

const VALID_CREATE = {
  name: "42 Ocean Ave",
  type: "residential",
  status: "Vacant",
  lat: 11.5564,
  lng: 104.9282,
};

/**
 * Builds a JSON POST/PATCH Request. body may be a value (JSON.stringified) or
 * a raw string so we can also send invalid JSON.
 */
function jsonRequest(url: string, method: string, body: unknown): Request {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: payload,
  });
}

/**
 * Next.js 15 route context: params is a Promise, matching the GET detail tests.
 */
function ctxParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("parseCreateBody / toNewProperty", () => {
  it("fills website-required leftovers the iPhone form does not collect", () => {
    const parsed = parseCreateBody(VALID_CREATE);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("expected success");

    const created = toNewProperty(parsed.body);
    expect(created.totalArea).toBe("");
    expect(created.title).toBe("—");
    expect(created.buyNumeric).toBe(0);
  });

  it("strips storage ids, financial internals, and a body id", () => {
    const parsed = parseCreateBody({
      ...VALID_CREATE,
      id: "PROP-FORGED",
      photoStorageIds: ["STORE-SECRET"],
      documentStorageIds: ["DOC-SECRET"],
      buyNumeric: 999999,
      title: "Hard title",
      outstandingMortgage: 12345,
      coverStorageId: "STORE-COVER-SECRET",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("expected success");

    const created = toNewProperty(parsed.body);
    expect(created).not.toHaveProperty("photoStorageIds");
    expect(created).not.toHaveProperty("documentStorageIds");
    expect(created).not.toHaveProperty("outstandingMortgage");
    expect(created).not.toHaveProperty("coverStorageId");
    expect(created).not.toHaveProperty("id");
    expect(created.buyNumeric).toBe(0);
    expect(created.title).toBe("—");
  });

  it("rejects a missing name, a bad type, and a lat outside the map range", () => {
    expect(parseCreateBody({ ...VALID_CREATE, name: "" }).ok).toBe(false);
    expect(parseCreateBody({ ...VALID_CREATE, type: "castle" }).ok).toBe(false);
    expect(parseCreateBody({ ...VALID_CREATE, lat: 99 }).ok).toBe(false);
  });
});

describe("parsePatchBody / toPropertyPatch", () => {
  it("only copies fields that were actually sent", () => {
    const parsed = parsePatchBody({ name: "Renamed villa", id: "PROP-FORGED" });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("expected success");

    const patch = toPropertyPatch(parsed.body);
    expect(patch).toEqual({ name: "Renamed villa" });
    expect(patch).not.toHaveProperty("id");
  });

  it("strips storage ids from a patch body", () => {
    const parsed = parsePatchBody({
      name: "Renamed villa",
      photoStorageIds: ["STORE-SECRET"],
      outstandingMortgage: 50,
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("expected success");

    const patch = toPropertyPatch(parsed.body);
    expect(patch).toEqual({ name: "Renamed villa" });
  });
});

describe("POST /api/v1/properties", () => {
  it("returns 401 when the auth seam rejects the request (no auth)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({
      ok: false,
      response: apiError(401, "unauthorized", "Authentication required."),
    });

    const res = await POST(jsonRequest("http://localhost/api/v1/properties", "POST", VALID_CREATE));

    expect(res.status).toBe(401);
    expect(createPropertyMock).not.toHaveBeenCalled();
    expect(resolveApiV1CtxMock).toHaveBeenCalledWith("write");
  });

  it("returns 429 when the write rate limiter rejects the request", async () => {
    resolveApiV1CtxMock.mockResolvedValue({
      ok: false,
      response: apiError(429, "rate_limited", "Too many requests. Try again shortly."),
    });

    const res = await POST(jsonRequest("http://localhost/api/v1/properties", "POST", VALID_CREATE));

    expect(res.status).toBe(429);
    expect(createPropertyMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the body is not JSON", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: OWNER });

    const res = await POST(jsonRequest("http://localhost/api/v1/properties", "POST", "{not-json"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("invalid_request");
    expect(createPropertyMock).not.toHaveBeenCalled();
  });

  it("returns 400 when required create fields are missing", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: OWNER });

    const res = await POST(
      jsonRequest("http://localhost/api/v1/properties", "POST", { name: "No pin" }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("invalid_request");
    expect(createPropertyMock).not.toHaveBeenCalled();
  });

  it("returns 403 when a viewer tries to create a property", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: VIEWER });

    const res = await POST(jsonRequest("http://localhost/api/v1/properties", "POST", VALID_CREATE));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("forbidden");
    expect(createPropertyMock).not.toHaveBeenCalled();
  });

  it("creates a property for a member and returns PropertyDetailDto with 201", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: MEMBER });
    createPropertyMock.mockResolvedValue(CREATED_PROPERTY);

    const res = await POST(
      jsonRequest("http://localhost/api/v1/properties", "POST", {
        ...VALID_CREATE,
        city: "Phnom Penh",
        province: "Phnom Penh",
        addressLine: "42 Ocean Ave",
        country: "KH",
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({
      id: "PROP-0001",
      name: "42 Ocean Ave",
      type: "residential",
      status: "Vacant",
      city: "Phnom Penh",
      province: "Phnom Penh",
      createdAt: 1700000000000,
      addressLine: "42 Ocean Ave",
      country: "KH",
      totalArea: "",
    });
    expect(JSON.stringify(body)).not.toContain("SECRET");
    expect(createPropertyMock).toHaveBeenCalledWith(
      MEMBER,
      expect.objectContaining({
        name: "42 Ocean Ave",
        type: "residential",
        status: "Vacant",
        lat: 11.5564,
        lng: 104.9282,
        title: "—",
        buyNumeric: 0,
        totalArea: "",
      }),
    );
  });

  it("strips storage ids and financial internals before calling createProperty", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: OWNER });
    createPropertyMock.mockResolvedValue(CREATED_PROPERTY);

    const res = await POST(
      jsonRequest("http://localhost/api/v1/properties", "POST", {
        ...VALID_CREATE,
        photoStorageIds: ["STORE-PHOTO-SECRET-1"],
        documentStorageIds: ["STORE-DOC-SECRET-1"],
        buyNumeric: 999999,
        title: "Hard title",
        outstandingMortgage: 12345,
        coverStorageId: "STORE-COVER-SECRET",
      }),
    );

    expect(res.status).toBe(201);
    const passed = createPropertyMock.mock.calls[0][1] as Record<string, unknown>;
    expect(passed.photoStorageIds).toBeUndefined();
    expect(passed.documentStorageIds).toBeUndefined();
    expect(passed.outstandingMortgage).toBeUndefined();
    expect(passed.coverStorageId).toBeUndefined();
    expect(passed.buyNumeric).toBe(0);
    expect(passed.title).toBe("—");
    expect(JSON.stringify(await res.json())).not.toContain("SECRET");
  });

  it("fails closed with a generic 500 when the service throws unexpectedly (no message leak)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: OWNER });
    createPropertyMock.mockRejectedValue(new Error("SECRET-DB-ERROR-MARKER"));

    const res = await POST(jsonRequest("http://localhost/api/v1/properties", "POST", VALID_CREATE));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: { code: "internal_error", message: expect.any(String) } });
    expect(JSON.stringify(body)).not.toContain("SECRET-DB-ERROR-MARKER");
  });
});

describe("PATCH /api/v1/properties/[id]", () => {
  it("returns 401 when the auth seam rejects the request (no auth)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({
      ok: false,
      response: apiError(401, "unauthorized", "Authentication required."),
    });

    const res = await PATCH(
      jsonRequest("http://localhost/api/v1/properties/PROP-0001", "PATCH", { name: "New" }),
      ctxParams("PROP-0001"),
    );

    expect(res.status).toBe(401);
    expect(getPropertyMock).not.toHaveBeenCalled();
    expect(updatePropertyMock).not.toHaveBeenCalled();
    expect(resolveApiV1CtxMock).toHaveBeenCalledWith("write");
  });

  it("returns 400 when a present field is invalid", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: OWNER });

    const res = await PATCH(
      jsonRequest("http://localhost/api/v1/properties/PROP-0001", "PATCH", { name: "" }),
      ctxParams("PROP-0001"),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("invalid_request");
    expect(updatePropertyMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the property is absent or belongs to another org", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: OWNER });
    getPropertyMock.mockResolvedValue(null);

    const res = await PATCH(
      jsonRequest("http://localhost/api/v1/properties/PROP-9999", "PATCH", { name: "Stolen" }),
      ctxParams("PROP-9999"),
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("not_found");
    expect(getPropertyMock).toHaveBeenCalledWith(OWNER, "PROP-9999");
    expect(updatePropertyMock).not.toHaveBeenCalled();
  });

  it("returns 403 when a viewer tries to update a property in their own org", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: VIEWER });
    getPropertyMock.mockResolvedValue(CREATED_PROPERTY);

    const res = await PATCH(
      jsonRequest("http://localhost/api/v1/properties/PROP-0001", "PATCH", { name: "Nope" }),
      ctxParams("PROP-0001"),
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("forbidden");
    expect(updatePropertyMock).not.toHaveBeenCalled();
  });

  it("ignores a body id and uses the URL id", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: OWNER });
    getPropertyMock.mockResolvedValue(CREATED_PROPERTY);
    updatePropertyMock.mockResolvedValue({ ...CREATED_PROPERTY, name: "Renamed villa" });

    const res = await PATCH(
      jsonRequest("http://localhost/api/v1/properties/PROP-0001", "PATCH", {
        id: "PROP-FORGED",
        name: "Renamed villa",
      }),
      ctxParams("PROP-0001"),
    );

    expect(res.status).toBe(200);
    expect(getPropertyMock).toHaveBeenCalledWith(OWNER, "PROP-0001");
    expect(updatePropertyMock).toHaveBeenCalledWith(OWNER, "PROP-0001", { name: "Renamed villa" });
    const body = await res.json();
    expect(body.id).toBe("PROP-0001");
    expect(body.name).toBe("Renamed villa");
  });

  it("strips storage ids from the patch before calling updateProperty", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: MEMBER });
    getPropertyMock.mockResolvedValue(CREATED_PROPERTY);
    updatePropertyMock.mockResolvedValue(CREATED_PROPERTY);

    const res = await PATCH(
      jsonRequest("http://localhost/api/v1/properties/PROP-0001", "PATCH", {
        name: "Renamed villa",
        photoStorageIds: ["STORE-PHOTO-SECRET-1"],
        documentStorageIds: ["STORE-DOC-SECRET-1"],
        outstandingMortgage: 50,
        buyNumeric: 888,
      }),
      ctxParams("PROP-0001"),
    );

    expect(res.status).toBe(200);
    expect(updatePropertyMock).toHaveBeenCalledWith(MEMBER, "PROP-0001", { name: "Renamed villa" });
    expect(JSON.stringify(await res.json())).not.toContain("SECRET");
  });

  it("fails closed with a generic 500 when the service throws unexpectedly (no message leak)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: OWNER });
    getPropertyMock.mockResolvedValue(CREATED_PROPERTY);
    updatePropertyMock.mockRejectedValue(new Error("SECRET-DB-ERROR-MARKER"));

    const res = await PATCH(
      jsonRequest("http://localhost/api/v1/properties/PROP-0001", "PATCH", { name: "Renamed" }),
      ctxParams("PROP-0001"),
    );

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: { code: "internal_error", message: expect.any(String) } });
    expect(JSON.stringify(body)).not.toContain("SECRET-DB-ERROR-MARKER");
  });
});

describe("DELETE /api/v1/properties/[id]", () => {
  it("returns 401 when the auth seam rejects the request (no auth)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({
      ok: false,
      response: apiError(401, "unauthorized", "Authentication required."),
    });

    const res = await DELETE(
      new Request("http://localhost/api/v1/properties/PROP-0001", { method: "DELETE" }),
      ctxParams("PROP-0001"),
    );

    expect(res.status).toBe(401);
    expect(deletePropertyMock).not.toHaveBeenCalled();
    expect(resolveApiV1CtxMock).toHaveBeenCalledWith("write");
  });

  it("returns 404 when the property is absent or belongs to another org", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: OWNER });
    getPropertyMock.mockResolvedValue(null);

    const res = await DELETE(
      new Request("http://localhost/api/v1/properties/PROP-9999", { method: "DELETE" }),
      ctxParams("PROP-9999"),
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("not_found");
    expect(deletePropertyMock).not.toHaveBeenCalled();
  });

  it("returns 403 when a viewer tries to delete a property in their own org", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: VIEWER });
    getPropertyMock.mockResolvedValue(CREATED_PROPERTY);

    const res = await DELETE(
      new Request("http://localhost/api/v1/properties/PROP-0001", { method: "DELETE" }),
      ctxParams("PROP-0001"),
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("forbidden");
    expect(deletePropertyMock).not.toHaveBeenCalled();
  });

  it("returns 403 when a member tries to delete (admin/owner only)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: MEMBER });
    getPropertyMock.mockResolvedValue(CREATED_PROPERTY);

    const res = await DELETE(
      new Request("http://localhost/api/v1/properties/PROP-0001", { method: "DELETE" }),
      ctxParams("PROP-0001"),
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("forbidden");
    expect(deletePropertyMock).not.toHaveBeenCalled();
  });

  it("returns 204 with an empty body when an owner deletes a property", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: OWNER });
    getPropertyMock.mockResolvedValue(CREATED_PROPERTY);
    deletePropertyMock.mockResolvedValue(undefined);

    const res = await DELETE(
      new Request("http://localhost/api/v1/properties/PROP-0001", { method: "DELETE" }),
      ctxParams("PROP-0001"),
    );

    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
    expect(deletePropertyMock).toHaveBeenCalledWith(OWNER, "PROP-0001");
  });

  it("fails closed with a generic 500 when the service throws unexpectedly (no message leak)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: OWNER });
    getPropertyMock.mockResolvedValue(CREATED_PROPERTY);
    deletePropertyMock.mockRejectedValue(new Error("SECRET-DB-ERROR-MARKER"));

    const res = await DELETE(
      new Request("http://localhost/api/v1/properties/PROP-0001", { method: "DELETE" }),
      ctxParams("PROP-0001"),
    );

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: { code: "internal_error", message: expect.any(String) } });
    expect(JSON.stringify(body)).not.toContain("SECRET-DB-ERROR-MARKER");
  });
});
