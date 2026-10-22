import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Ctx } from "@/lib/services/_mapping";
import { apiError } from "./http";
import { parseRentalEditBody, planLease, planTenant } from "./rental-edit-write";
import type { RentalEditBody } from "./rental-edit-write";
import type { Lease } from "@/lib/data/types/lease";
import type { Tenant } from "@/lib/data/types/tenant";

// ---------------------------------------------------------------------------
// GET|PUT /api/v1/properties/[id]/rental/edit.
//
// Auth seam, property service and rental-edit service mocked (no Clerk/DB/network). Proves:
// 401 without auth, 400 for a non-JSON or invalid body, 404 for an absent/cross-org property
// (never a 403 leak) and for a viewer, create-vs-update handed to the service (not the client),
// the edit DTO on both verbs, and a generic 500 that never echoes the error. The plan* tests at
// the bottom cover the server-side create/update choice and the server-assigned fields.
// ---------------------------------------------------------------------------

const {
  resolveApiV1CtxMock,
  getPropertyRentalEditMock,
  upsertPropertyRentalMock,
  getPropertyMock,
  loggerMock,
} = vi.hoisted(() => ({
  resolveApiV1CtxMock: vi.fn(),
  getPropertyRentalEditMock: vi.fn(),
  upsertPropertyRentalMock: vi.fn(),
  getPropertyMock: vi.fn(),
  loggerMock: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

vi.mock("./auth", () => ({ resolveApiV1Ctx: resolveApiV1CtxMock }));
vi.mock("@/lib/services/rental-edit", () => ({
  getPropertyRentalEdit: getPropertyRentalEditMock,
  upsertPropertyRental: upsertPropertyRentalMock,
}));
vi.mock("@/lib/services/properties", () => ({ getProperty: getPropertyMock }));
vi.mock("@/lib/logger", () => ({ logger: loggerMock }));

import { GET, PUT } from "@/app/api/v1/properties/[id]/rental/edit/route";

const CTX: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };

const PROPERTY = { id: "PROP-0001", name: "Riverside" };

const LEASE: Lease = {
  id: "LEASE-0001",
  propertyId: "PROP-0001",
  tenantId: "TEN-0001",
  unit: "A2",
  stage: "Signed",
  startDate: 1_700_000_000_000,
  endDate: 1_730_000_000_000,
  monthlyRent: 1200,
  termMonths: 12,
  renewalStatus: "Auto",
};

const TENANT: Tenant = {
  id: "TEN-0001",
  propertyId: "PROP-0001",
  name: "Dara Sok",
  unit: "A2",
  rent: 1200,
  status: "Paid",
  email: "dara@example.com",
  phone: "+855 12 345 678",
};

const BODY = {
  lease: {
    unit: "A2",
    startDate: 1_700_000_000_000,
    endDate: 1_730_000_000_000,
    monthlyRent: 1200,
    termMonths: 12,
    renewalStatus: "Auto",
  },
  tenant: {
    name: "Dara Sok",
    unit: "A2",
    rent: 1200,
    status: "Paid",
    email: "dara@example.com",
    phone: "+855 12 345 678",
  },
} satisfies RentalEditBody;

function ctxParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function putRequest(body: unknown, raw = false): Request {
  return new Request("http://localhost/api/v1/properties/PROP-0001/rental/edit", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: raw ? String(body) : JSON.stringify(body),
  });
}

const GET_REQUEST = new Request("http://localhost/api/v1/properties/PROP-0001/rental/edit");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/v1/properties/[id]/rental/edit", () => {
  it("returns 401 when the auth seam rejects the request", async () => {
    resolveApiV1CtxMock.mockResolvedValue({
      ok: false,
      response: apiError(401, "unauthorized", "Authentication required."),
    });

    const res = await GET(GET_REQUEST, ctxParams("PROP-0001"));

    expect(res.status).toBe(401);
    expect(getPropertyRentalEditMock).not.toHaveBeenCalled();
  });

  it("returns 404 for an absent or cross-org property, scoped to the caller's ctx", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: CTX });
    getPropertyRentalEditMock.mockResolvedValue(null);

    const res = await GET(GET_REQUEST, ctxParams("PROP-CROSS-ORG"));

    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not_found");
    expect(getPropertyRentalEditMock).toHaveBeenCalledWith(CTX, "PROP-CROSS-ORG");
  });

  it("returns the edit DTO with real ids on success", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: CTX });
    getPropertyRentalEditMock.mockResolvedValue({ lease: LEASE, tenant: TENANT });

    const res = await GET(GET_REQUEST, ctxParams("PROP-0001"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      lease: {
        id: "LEASE-0001",
        unit: "A2",
        startDate: 1_700_000_000_000,
        endDate: 1_730_000_000_000,
        monthlyRent: 1200,
        termMonths: 12,
        renewalStatus: "Auto",
      },
      tenant: {
        id: "TEN-0001",
        name: "Dara Sok",
        unit: "A2",
        rent: 1200,
        status: "Paid",
        email: "dara@example.com",
        phone: "+855 12 345 678",
      },
    });

    // Editable fields only — never the scope, the owner, or a lease stage iOS may not set.
    const serialized = JSON.stringify(body);
    for (const forbidden of ["ORG-0001", "USR-0001", "propertyId", "userId", "orgId", "stage"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("returns null lease and tenant when the property has neither yet", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: CTX });
    getPropertyRentalEditMock.mockResolvedValue({ lease: null, tenant: null });

    const res = await GET(GET_REQUEST, ctxParams("PROP-EMPTY"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ lease: null, tenant: null });
  });

  it("fails closed with a generic 500 when the service throws (no message leak)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: CTX });
    getPropertyRentalEditMock.mockRejectedValue(new Error("SECRET-DB-ERROR-MARKER"));

    const res = await GET(GET_REQUEST, ctxParams("PROP-0001"));

    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("SECRET-DB-ERROR-MARKER");
  });
});

describe("PUT /api/v1/properties/[id]/rental/edit", () => {
  beforeEach(() => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: CTX });
    getPropertyMock.mockResolvedValue(PROPERTY);
  });

  it("returns 401 when the auth seam rejects the request", async () => {
    resolveApiV1CtxMock.mockResolvedValue({
      ok: false,
      response: apiError(401, "unauthorized", "Authentication required."),
    });

    const res = await PUT(putRequest(BODY), ctxParams("PROP-0001"));

    expect(res.status).toBe(401);
    expect(upsertPropertyRentalMock).not.toHaveBeenCalled();
  });

  it("uses the write rate limiter", async () => {
    resolveApiV1CtxMock.mockResolvedValue({
      ok: false,
      response: apiError(429, "rate_limited", "Too many requests. Try again shortly."),
    });

    const res = await PUT(putRequest(BODY), ctxParams("PROP-0001"));

    expect(res.status).toBe(429);
    expect(resolveApiV1CtxMock).toHaveBeenCalledWith("write");
  });

  it("returns 400 for a non-JSON body without touching any service", async () => {
    const res = await PUT(putRequest("not json", true), ctxParams("PROP-0001"));

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_request");
    expect(getPropertyMock).not.toHaveBeenCalled();
    expect(upsertPropertyRentalMock).not.toHaveBeenCalled();
  });

  it("returns 400 when a required rental field is missing or blank", async () => {
    const blank = await PUT(
      putRequest({ ...BODY, lease: { ...BODY.lease, unit: "" } }),
      ctxParams("PROP-0001"),
    );
    const missing = await PUT(
      putRequest({ ...BODY, lease: { ...BODY.lease, unit: undefined } }),
      ctxParams("PROP-0001"),
    );

    expect(blank.status).toBe(400);
    expect(missing.status).toBe(400);
    expect(getPropertyMock).not.toHaveBeenCalled();
    expect(upsertPropertyRentalMock).not.toHaveBeenCalled();
  });

  it("returns 404 for an absent or cross-org property before any role gate", async () => {
    getPropertyMock.mockResolvedValue(null);

    const res = await PUT(putRequest(BODY), ctxParams("PROP-CROSS-ORG"));

    expect(res.status).toBe(404);
    expect(upsertPropertyRentalMock).not.toHaveBeenCalled();
  });

  it("returns 403 for a viewer who may not write", async () => {
    resolveApiV1CtxMock.mockResolvedValue({
      ok: true,
      ctx: { ...CTX, orgRole: "viewer" } satisfies Ctx,
    });

    const res = await PUT(putRequest(BODY), ctxParams("PROP-0001"));

    expect(res.status).toBe(403);
    expect(upsertPropertyRentalMock).not.toHaveBeenCalled();
  });

  it("hands the client body to the service unchanged — no stage/propertyId/id from the wire", async () => {
    upsertPropertyRentalMock.mockResolvedValue({ lease: LEASE, tenant: TENANT });

    const res = await PUT(
      putRequest({
        ...BODY,
        lease: { ...BODY.lease, id: "LEASE-HACK", stage: "Declined", propertyId: "PROP-9999" },
        tenant: { ...BODY.tenant, id: "TEN-HACK", propertyId: "PROP-9999", orgId: "ORG-0002" },
      }),
      ctxParams("PROP-0001"),
    );

    expect(res.status).toBe(200);
    const [, calledId, calledBody] = upsertPropertyRentalMock.mock.calls[0] as [
      Ctx,
      string,
      Record<string, unknown>,
    ];
    expect(calledId).toBe("PROP-0001");
    expect(calledBody).toEqual(BODY);
    expect(JSON.stringify(calledBody)).not.toContain("HACK");
    expect(JSON.stringify(calledBody)).not.toContain("PROP-9999");
    expect(JSON.stringify(calledBody)).not.toContain("Declined");
  });

  it("returns the refreshed edit DTO after the upsert (create path)", async () => {
    upsertPropertyRentalMock.mockResolvedValue({ lease: LEASE, tenant: TENANT });

    const res = await PUT(putRequest(BODY), ctxParams("PROP-0001"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lease.id).toBe("LEASE-0001");
    expect(body.tenant.id).toBe("TEN-0001");
    expect(Object.keys(body.lease).sort()).toEqual([
      "endDate",
      "id",
      "monthlyRent",
      "renewalStatus",
      "startDate",
      "termMonths",
      "unit",
    ]);
  });

  it("maps a write-denied service error to 403, not 500", async () => {
    upsertPropertyRentalMock.mockRejectedValue(new Error("Demo is read-only"));

    const res = await PUT(putRequest(BODY), ctxParams("PROP-0001"));

    expect(res.status).toBe(403);
    expect(JSON.stringify(await res.json())).not.toContain("Demo is read-only");
  });

  it("fails closed with a generic 500, and logs, when the service throws", async () => {
    upsertPropertyRentalMock.mockRejectedValue(new Error("SECRET-DB-ERROR-MARKER"));

    const res = await PUT(putRequest(BODY), ctxParams("PROP-0001"));

    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("SECRET-DB-ERROR-MARKER");
    expect(loggerMock.error).toHaveBeenCalled();
  });
});

describe("parseRentalEditBody", () => {
  it("accepts the wizard's editable fields and strips client-supplied ids", () => {
    const parsed = parseRentalEditBody({
      ...BODY,
      lease: {
        ...BODY.lease,
        id: "LEASE-HACK",
        stage: "Declined",
        propertyId: "PROP-9999",
        tenantId: "TEN-HACK",
      },
      tenant: { ...BODY.tenant, id: "TEN-HACK", propertyId: "PROP-9999" },
      orgId: "ORG-0002",
    });

    expect(parsed.ok).toBe(true);
    expect(parsed.ok && parsed.body).toEqual(BODY);
  });

  it("requires both halves — a body with no tenant is rejected", () => {
    expect(parseRentalEditBody({ lease: BODY.lease }).ok).toBe(false);
    expect(parseRentalEditBody({ ...BODY, lease: { ...BODY.lease, monthlyRent: -1 } }).ok).toBe(
      false,
    );
    expect(parseRentalEditBody({ ...BODY, tenant: { ...BODY.tenant, status: "Nope" } }).ok).toBe(
      false,
    );
  });

  it("rejects a non-positive term and a blank unit", () => {
    expect(parseRentalEditBody({ ...BODY, lease: { ...BODY.lease, termMonths: 0 } }).ok).toBe(false);
    expect(parseRentalEditBody({ ...BODY, tenant: { ...BODY.tenant, name: "" } }).ok).toBe(false);
  });
});

describe("planTenant / planLease", () => {
  it("creates the tenant with the URL propertyId when there is no primary tenant", () => {
    const plan = planTenant("PROP-0001", BODY.tenant, null);

    expect(plan.id).toBeNull();
    expect(plan.values).toEqual({
      propertyId: "PROP-0001",
      name: "Dara Sok",
      unit: "A2",
      rent: 1200,
      status: "Paid",
      email: "dara@example.com",
      phone: "+855 12 345 678",
    });
  });

  it("patches the existing tenant by id, without a propertyId", () => {
    const plan = planTenant("PROP-0001", BODY.tenant, TENANT);

    expect(plan.id).toBe("TEN-0001");
    expect(plan.values).not.toHaveProperty("propertyId");
    expect(plan.values).toMatchObject({ name: "Dara Sok", rent: 1200 });
  });

  it("drops blank email/phone instead of overwriting with empty strings", () => {
    const plan = planTenant("PROP-0001", { ...BODY.tenant, email: "", phone: "" }, TENANT);

    expect(plan.values.email).toBeUndefined();
    expect(plan.values.phone).toBeUndefined();
  });

  it("assigns stage Signed, the propertyId and the tenant link on create", () => {
    const plan = planLease("PROP-0001", BODY.lease, null, "TEN-0001");

    expect(plan.id).toBeNull();
    expect(plan.values).toMatchObject({
      propertyId: "PROP-0001",
      stage: "Signed",
      tenantId: "TEN-0001",
      unit: "A2",
      termMonths: 12,
    });
  });

  it("patches the existing lease by id, keeping the tenant link and never re-staging", () => {
    const plan = planLease("PROP-0001", BODY.lease, LEASE, "TEN-0002");

    expect(plan.id).toBe("LEASE-0001");
    expect(plan.values.tenantId).toBe("TEN-0002");
    expect(plan.values).not.toHaveProperty("stage");
    expect(plan.values).not.toHaveProperty("propertyId");
  });

  it("treats a blank renewalStatus as absent", () => {
    const plan = planLease("PROP-0001", { ...BODY.lease, renewalStatus: "" }, LEASE, "TEN-0001");

    // undefined, not "": drizzle's mapUpdateSet drops undefined entries, so the stored
    // renewalStatus is left alone rather than blanked.
    expect(plan.values.renewalStatus).toBeUndefined();
  });
});
