import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Ctx } from "@/lib/services/_mapping";
import { apiError } from "./http";

// Payments HTTP API v1. Auth seam + services mocked; body parsing, limit parsing, and the DTO are
// the real code, so the assertions on what reaches the service / the wire prove real behaviour.

const m = vi.hoisted(() => ({
  assertCanMutate: vi.fn(),
  roleAtLeast: vi.fn(),
  resolveApiV1Ctx: vi.fn(),
  getProperty: vi.fn(),
  listPropertyPaymentsNewestFirst: vi.fn(),
  getPayment: vi.fn(),
  createPayment: vi.fn(),
  updatePayment: vi.fn(),
  deletePayment: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@/lib/api/v1/auth", () => ({ resolveApiV1Ctx: m.resolveApiV1Ctx }));
vi.mock("@/lib/services/_mapping", () => ({ assertCanMutate: m.assertCanMutate, roleAtLeast: m.roleAtLeast }));
vi.mock("@/lib/services/properties", () => ({ getProperty: m.getProperty }));
vi.mock("@/lib/logger", () => ({ logger: { error: m.loggerError } }));
vi.mock("@/lib/services/payments", () => ({
  listPropertyPaymentsNewestFirst: m.listPropertyPaymentsNewestFirst,
  getPayment: m.getPayment,
  createPayment: m.createPayment,
  updatePayment: m.updatePayment,
  deletePayment: m.deletePayment,
}));

import { GET as listRoute, POST as createRoute } from "@/app/api/v1/properties/[id]/payments/route";
import { DELETE as deleteRoute, PATCH as patchRoute } from "@/app/api/v1/payments/[paymentId]/route";

const OWNER: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };
const VIEWER: Ctx = { userId: "USR-0002", orgId: "ORG-0001", orgRole: "viewer" };
const PAYMENT = {
  id: "PMT-0001", leaseId: "LEASE-0001", date: 1743000000000, kind: "Rent", amount: 1200,
  method: "ABA Bank", status: "Paid",
  // Withheld internals — must never reach the wire.
  orgId: "ORG-SECRET", userId: "USR-SECRET", tenantId: "TEN-SECRET", propertyId: "PROP-0001",
};
const DTO = {
  id: "PMT-0001", leaseId: "LEASE-0001", date: 1743000000000, kind: "Rent", amount: 1200,
  method: "ABA Bank", status: "Paid",
};
const VALID = { date: 1743000000000, kind: "Rent", amount: 1200, method: "ABA Bank", status: "Paid" };

const prop = (id: string) => ({ params: Promise.resolve({ id }) });
const pay = (paymentId: string) => ({ params: Promise.resolve({ paymentId }) });
const req = (url: string, method = "GET", body?: unknown) =>
  new Request(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });

beforeEach(() => {
  vi.resetAllMocks();
  m.roleAtLeast.mockReturnValue(true);
  m.resolveApiV1Ctx.mockResolvedValue({ ok: true, ctx: OWNER });
  m.getProperty.mockResolvedValue({ id: "PROP-0001" });
  m.listPropertyPaymentsNewestFirst.mockResolvedValue([PAYMENT]);
  m.getPayment.mockResolvedValue(PAYMENT);
  m.createPayment.mockResolvedValue(PAYMENT);
  m.updatePayment.mockResolvedValue(PAYMENT);
  m.deletePayment.mockResolvedValue(undefined);
});

describe("GET /api/v1/properties/{id}/payments", () => {
  it("uses the read limiter and returns DTOs only", async () => {
    const res = await listRoute(req("/api/v1/properties/PROP-0001/payments"), prop("PROP-0001"));
    expect(res.status).toBe(200);
    expect(m.resolveApiV1Ctx).toHaveBeenCalledTimes(1);
    expect(m.resolveApiV1Ctx).toHaveBeenCalledWith();
    expect(await res.json()).toEqual({ payments: [DTO] });
    expect(m.listPropertyPaymentsNewestFirst).toHaveBeenCalledWith(OWNER, "PROP-0001", 50);
  });

  it("passes a valid limit and rejects out-of-range/garbage limits with 400", async () => {
    const ok = await listRoute(req("/api/v1/properties/PROP-0001/payments?limit=200"), prop("PROP-0001"));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ payments: [DTO] });
    expect(m.listPropertyPaymentsNewestFirst).toHaveBeenCalledWith(OWNER, "PROP-0001", 200);
    for (const bad of ["0", "201", "abc", "1.5", "-1"]) {
      const res = await listRoute(req(`/api/v1/properties/PROP-0001/payments?limit=${bad}`), prop("PROP-0001"));
      expect(res.status, bad).toBe(400);
    }
  });

  it("404s a missing/cross-org property instead of an empty list", async () => {
    m.getProperty.mockResolvedValue(null);
    const res = await listRoute(req("/api/v1/properties/PROP-9/payments"), prop("PROP-9"));
    expect(res.status).toBe(404);
    expect(m.listPropertyPaymentsNewestFirst).not.toHaveBeenCalled();
  });

  it("401 and 429 pass through from the auth seam", async () => {
    for (const [s, c] of [[401, "unauthorized"], [429, "rate_limited"]] as const) {
      m.resolveApiV1Ctx.mockResolvedValue({ ok: false, response: apiError(s, c, "x") });
      const res = await listRoute(req("/api/v1/properties/PROP-0001/payments"), prop("PROP-0001"));
      expect(res.status).toBe(s);
    }
    expect(m.getProperty).not.toHaveBeenCalled();
  });
});

describe("POST /api/v1/properties/{id}/payments", () => {
  const post = (body: unknown, id = "PROP-0001") =>
    createRoute(req(`/api/v1/properties/${id}/payments`, "POST", body), prop(id));

  it("resolves the write limiter exactly once, and returns the created DTO", async () => {
    const res = await post(VALID);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(DTO);
    expect(m.resolveApiV1Ctx).toHaveBeenCalledTimes(1);
    expect(m.resolveApiV1Ctx).toHaveBeenCalledWith("write");
  });

  it("401/429 before touching anything", async () => {
    for (const [s, c] of [[401, "unauthorized"], [429, "rate_limited"]] as const) {
      m.resolveApiV1Ctx.mockResolvedValue({ ok: false, response: apiError(s, c, "x") });
      expect((await post(VALID)).status).toBe(s);
    }
    expect(m.getProperty).not.toHaveBeenCalled();
    expect(m.createPayment).not.toHaveBeenCalled();
  });

  it("201 with DTO; URL propertyId wins and unknown/body propertyId keys are stripped", async () => {
    const res = await post({ ...VALID, propertyId: "PROP-EVIL", orgId: "ORG-EVIL", junk: 1 });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(DTO);
    const [ctx, input, scope] = m.createPayment.mock.calls[0];
    expect(ctx).toBe(OWNER);
    expect(scope).toBe("PROP-0001");
    expect(input).toEqual(VALID);
  });

  it("400 for non-JSON, missing fields, bad enum, negative amount", async () => {
    for (const bad of ["{not json", {}, { ...VALID, kind: "Bribe" }, { ...VALID, amount: -1 }, { ...VALID, date: "2025-01-01" }]) {
      const res = await post(bad);
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("invalid_request");
    }
    expect(m.createPayment).not.toHaveBeenCalled();
  });

  // The amount lands in a numeric(14,2) column: 12 integer digits, 2 decimals. Anything outside
  // that is a 400 at the boundary — never a silent round by Postgres, never a 500 from the insert.
  it("400 for an amount past the column range or with more than 2 decimals", async () => {
    for (const bad of [1e13, 999_999_999_999.999, 0.001]) {
      expect((await post({ ...VALID, amount: bad })).status, String(bad)).toBe(400);
    }
    expect((await post({ ...VALID, amount: 999_999_999_999.99 })).status).toBe(201);
    expect((await post({ ...VALID, amount: 0.07 })).status).toBe(201);
    expect(m.createPayment).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ amount: 0.001 }),
      expect.anything(),
    );
  });

  it("400 for a date outside the representable range", async () => {
    expect((await post({ ...VALID, date: 4_102_444_800_001 })).status).toBe(400);
    expect((await post({ ...VALID, date: 4_102_444_800_000 })).status).toBe(201);
  });

  it("404 (never 403) for a cross-org property even for a viewer", async () => {
    m.getProperty.mockResolvedValue(null);
    m.resolveApiV1Ctx.mockResolvedValue({ ok: true, ctx: VIEWER });
    m.roleAtLeast.mockReturnValue(false);
    expect((await post(VALID)).status).toBe(404);
  });

  it("403 for viewer; checks member", async () => {
    m.resolveApiV1Ctx.mockResolvedValue({ ok: true, ctx: VIEWER });
    m.roleAtLeast.mockReturnValue(false);
    expect((await post(VALID)).status).toBe(403);
    expect(m.roleAtLeast).toHaveBeenCalledWith("viewer", "member");
    expect(m.createPayment).not.toHaveBeenCalled();
  });

  it("403 in demo read-only mode without echoing the message", async () => {
    m.assertCanMutate.mockImplementation(() => { throw new Error("Demo is read-only"); });
    const res = await post(VALID);
    expect(res.status).toBe(403);
    expect(JSON.stringify(await res.json())).not.toContain("Demo");
    expect(m.createPayment).not.toHaveBeenCalled();
  });

  it("400 when the lease is not a lease of this property", async () => {
    m.createPayment.mockRejectedValue(new Error("lease_not_in_property"));
    expect((await post({ ...VALID, leaseId: "LEASE-OTHER" })).status).toBe(400);
  });

  it("500 is generic, logged, not echoed", async () => {
    m.createPayment.mockRejectedValue(new Error("pg: SECRET connection string"));
    const res = await post(VALID);
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("SECRET");
    expect(m.loggerError).toHaveBeenCalled();
  });
});

describe("PATCH /api/v1/payments/{paymentId}", () => {
  const patch = (body: unknown, id = "PMT-0001") =>
    patchRoute(req(`/api/v1/payments/${id}`, "PATCH", body), pay(id));

  it("one write-limiter call; sends only the keys provided; leaseId/unknowns stripped", async () => {
    const res = await patch({ amount: 950.5, leaseId: "LEASE-EVIL", propertyId: "PROP-EVIL" });
    expect(res.status).toBe(200);
    expect(m.resolveApiV1Ctx).toHaveBeenCalledTimes(1);
    expect(m.resolveApiV1Ctx).toHaveBeenCalledWith("write");
    expect(m.updatePayment).toHaveBeenCalledWith(OWNER, "PMT-0001", { amount: 950.5 });
    expect(await res.json()).toEqual(DTO);
  });

  it("empty body (or only unknown keys) is 400, not a no-op 200", async () => {
    for (const bad of [{}, { leaseId: "LEASE-1" }, { nope: 1 }]) {
      expect((await patch(bad)).status).toBe(400);
    }
    expect(m.updatePayment).not.toHaveBeenCalled();
  });

  it("404 for missing/cross-org before the role gate", async () => {
    m.getPayment.mockResolvedValue(null);
    m.roleAtLeast.mockReturnValue(false);
    expect((await patch({ status: "Failed" })).status).toBe(404);
    expect(m.roleAtLeast).not.toHaveBeenCalled();
  });

  it("403 for viewer; 404 if the row vanishes mid-update; 500 generic", async () => {
    m.roleAtLeast.mockReturnValueOnce(false);
    expect((await patch({ status: "Failed" })).status).toBe(403);
    m.updatePayment.mockResolvedValueOnce(null);
    expect((await patch({ status: "Failed" })).status).toBe(404);
    m.updatePayment.mockRejectedValueOnce(new Error("SECRET"));
    const res = await patch({ status: "Failed" });
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("SECRET");
  });
});

describe("DELETE /api/v1/payments/{paymentId}", () => {
  const del = (id = "PMT-0001") => deleteRoute(req(`/api/v1/payments/${id}`, "DELETE"), pay(id));

  it("204 for admin+, one write-limiter call", async () => {
    const res = await del();
    expect(res.status).toBe(204);
    expect(m.resolveApiV1Ctx).toHaveBeenCalledTimes(1);
    expect(m.resolveApiV1Ctx).toHaveBeenCalledWith("write");
    expect(m.roleAtLeast).toHaveBeenCalledWith("owner", "admin");
    expect(m.deletePayment).toHaveBeenCalledWith(OWNER, "PMT-0001");
  });

  it("404 before 403; 403 below admin; demo 403; 500 generic", async () => {
    m.getPayment.mockResolvedValueOnce(null);
    expect((await del()).status).toBe(404);
    m.roleAtLeast.mockReturnValueOnce(false);
    expect((await del()).status).toBe(403);
    expect(m.deletePayment).not.toHaveBeenCalled();
    m.assertCanMutate.mockImplementationOnce(() => { throw new Error("Demo is read-only"); });
    expect((await del()).status).toBe(403);
    m.deletePayment.mockRejectedValueOnce(new Error("SECRET"));
    const res = await del();
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("SECRET");
  });
});
