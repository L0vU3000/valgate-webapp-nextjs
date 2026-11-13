import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiError } from "@/lib/api/v1/http";

const { auth, list, summary } = vi.hoisted(() => ({ auth: vi.fn(), list: vi.fn(), summary: vi.fn() }));
vi.mock("@/lib/api/v1/auth", () => ({ resolveApiV1Ctx: auth }));
vi.mock("@/lib/services/documents", () => ({ listOrgDocumentsPage: list, summarizeOrgDocuments: summary }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

import { GET } from "./route";
import { GET as GETSummary } from "./summary/route";

const ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "viewer" };
const req = (query = "") => new Request(`http://localhost/api/v1/documents${query}`);

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ ok: true, ctx });
  list.mockResolvedValue({ items: [], nextCursor: null });
  summary.mockResolvedValue({ total: 0, propertyCount: 0, byCategory: {
    Title: 0, Rental: 0, Photos: 0, Legal: 0, Financial: 0, Estate: 0, Other: 0, uncategorized: 0,
  } });
});

describe("org documents GET routes", () => {
  it("defaults limit to 20 and lets a viewer read only through their resolved org context", async () => {
    expect((await GET(req())).status).toBe(200);
    expect(list).toHaveBeenCalledWith(ctx, { limit: 20 });
  });

  it.each(["0", "101", "1.5", "-1", "foo", "", "1e1", "Infinity"])("rejects limit=%s", async (limit) => {
    const res = await GET(req(`?limit=${limit}`));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_request");
    expect(list).not.toHaveBeenCalled();
  });

  it.each(["category=bogus", "category=", "kind=bogus", "kind="])("rejects %s", async (query) => {
    const res = await GET(req(`?${query}`));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_request");
    expect(list).not.toHaveBeenCalled();
  });

  it.each(["Title", "Rental", "Photos", "Legal", "Financial", "Estate", "Other", "uncategorized"])("forwards category=%s with kind and opaque cursor", async (category) => {
    const res = await GET(req(`?limit=100&category=${category}&kind=photo&cursor=opaque`));
    expect(res.status).toBe(200);
    expect(list).toHaveBeenCalledWith(ctx, { limit: 100, category, kind: "photo", cursor: "opaque" });
  });

  it.each([GET, GETSummary])("returns 401 without invoking either service", async (handler) => {
    auth.mockResolvedValue({ ok: false, response: apiError(401, "unauthorized", "Authentication required.") });
    expect((await handler(req())).status).toBe(401);
    expect(list).not.toHaveBeenCalled();
    expect(summary).not.toHaveBeenCalled();
  });

  it.each([GET, GETSummary])("preserves auth rate-limit failures", async (handler) => {
    auth.mockResolvedValue({ ok: false, response: apiError(429, "rate_limited", "Too many requests.") });
    expect((await handler(req())).status).toBe(429);
    expect(list).not.toHaveBeenCalled();
    expect(summary).not.toHaveBeenCalled();
  });

  it("returns a null category on the wire and preserves pagination", async () => {
    list.mockResolvedValue({ items: [{ id: "DOC-0001", propertyName: "Ocean House", category: null }], nextCursor: "opaque" });
    const body = await (await GET(req())).json();
    expect(body).toEqual({ items: [{ id: "DOC-0001", propertyName: "Ocean House", category: null }], nextCursor: "opaque" });
  });

  it("maps an invalid cursor to 400", async () => {
    list.mockRejectedValue(new Error("invalid_cursor"));
    const res = await GET(req("?cursor=bad"));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_request");
  });

  it.each([GET, GETSummary])("does not expose unexpected service error messages", async (handler) => {
    list.mockRejectedValue(new Error("SECRET database details"));
    summary.mockRejectedValue(new Error("SECRET database details"));
    const res = await handler(req());
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("SECRET");
  });

  it.each([undefined, "photo", "document"])("summary accepts kind=%s and returns exactly eight zero-filled buckets", async (kind) => {
    const res = await GETSummary(req(kind ? `?kind=${kind}` : ""));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(summary).toHaveBeenCalledWith(ctx, kind ? { kind } : {});
    expect(body).toEqual({ total: 0, propertyCount: 0, byCategory: {
      Title: 0, Rental: 0, Photos: 0, Legal: 0, Financial: 0, Estate: 0, Other: 0, uncategorized: 0,
    } });
  });

  it.each(["bogus", ""])("summary rejects kind=%s", async (kind) => {
    const res = await GETSummary(req(`?kind=${kind}`));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_request");
    expect(summary).not.toHaveBeenCalled();
  });
});
