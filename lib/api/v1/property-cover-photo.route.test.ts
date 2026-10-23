import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Ctx } from "@/lib/services/_mapping";
import { apiError } from "./http";

const { resolveApiV1CtxMock, getPropertyMock, resolveDocumentUrlMock } = vi.hoisted(() => ({
  resolveApiV1CtxMock: vi.fn(),
  getPropertyMock: vi.fn(),
  resolveDocumentUrlMock: vi.fn(),
}));

vi.mock("./auth", () => ({ resolveApiV1Ctx: resolveApiV1CtxMock }));
vi.mock("@/lib/services/properties", () => ({ getProperty: getPropertyMock }));
vi.mock("@/lib/services/storage", () => ({ resolveDocumentUrl: resolveDocumentUrlMock }));

import { GET } from "@/app/api/v1/properties/[id]/cover-photo/route";

const CTX: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };
const PROPERTY = { id: "PROP-0001", coverStorageId: "ORG-0001/DOC-0001/cover.jpg" };

function params(id = "PROP-0001") {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: CTX });
});

describe("GET /api/v1/properties/[id]/cover-photo", () => {
  it("resolves the selected cover to a short-lived URL without exposing the storage key", async () => {
    getPropertyMock.mockResolvedValue(PROPERTY);
    resolveDocumentUrlMock.mockResolvedValue("https://storage.example.test/signed-cover.jpg");

    const res = await GET(new Request("http://localhost/api/v1/properties/PROP-0001/cover-photo"), params());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      url: "https://storage.example.test/signed-cover.jpg",
      urlExpiresAt: expect.any(Number),
    });
    expect(resolveDocumentUrlMock).toHaveBeenCalledWith(PROPERTY.coverStorageId);
  });

  it("returns 404 when the property has no selected cover", async () => {
    getPropertyMock.mockResolvedValue({ ...PROPERTY, coverStorageId: undefined });

    const res = await GET(new Request("http://localhost/api/v1/properties/PROP-0001/cover-photo"), params());

    expect(res.status).toBe(404);
    expect(resolveDocumentUrlMock).not.toHaveBeenCalled();
  });

  it("returns the auth failure without looking up a property", async () => {
    resolveApiV1CtxMock.mockResolvedValue({
      ok: false,
      response: apiError(401, "unauthorized", "Authentication required."),
    });

    const res = await GET(new Request("http://localhost/api/v1/properties/PROP-0001/cover-photo"), params());

    expect(res.status).toBe(401);
    expect(getPropertyMock).not.toHaveBeenCalled();
  });
});
