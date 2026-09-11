import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { Ctx } from "@/lib/services/_mapping";

// ---------------------------------------------------------------------------
// POST /api/documents/[id]/summarize — auth, id, rate limit, and org-scoped
// lookup fully mocked (no Clerk/DB/model). Proves: no session → 401, blank id
// → 400, over-limit → 429, missing/other-org document → 404 (no model call).
// ---------------------------------------------------------------------------

const CTX: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };

const { resolveRouteCtxMock, getDocumentMock, allowedMock, setDocumentAiStatusMock } = vi.hoisted(
  () => ({
    resolveRouteCtxMock: vi.fn(),
    getDocumentMock: vi.fn(),
    allowedMock: vi.fn(),
    setDocumentAiStatusMock: vi.fn(),
  }),
);

vi.mock("@/lib/auth/ctx", () => ({
  resolveRouteCtx: resolveRouteCtxMock,
}));

vi.mock("@/lib/services/documents", () => ({
  getDocument: getDocumentMock,
  setDocumentAiStatus: setDocumentAiStatusMock,
  saveDocumentSummary: vi.fn(),
}));

vi.mock("@/lib/services/storage", () => ({
  resolveDocumentUrl: vi.fn(),
}));

vi.mock("@/lib/ratelimit", () => ({
  aiLimiter: {},
  allowed: allowedMock,
}));

vi.mock("@/lib/log", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { POST } from "./route";

/**
 * Builds the Next.js 15 `params` promise the summarize route awaits.
 */
function ctxParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

/**
 * Builds a dummy POST request. The handler does not read the body.
 */
function summarizeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/documents/DOC-0001/summarize", {
    method: "POST",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  resolveRouteCtxMock.mockResolvedValue({ ok: true, ctx: CTX });
  allowedMock.mockResolvedValue(true);
});

describe("POST /api/documents/[id]/summarize", () => {
  it("returns 401 when the caller is not signed in, before looking up the document", async () => {
    resolveRouteCtxMock.mockResolvedValue({ ok: false });

    const res = await POST(summarizeRequest(), ctxParams("DOC-0001"));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: "Unauthorized." });
    expect(getDocumentMock).not.toHaveBeenCalled();
  });

  it("returns 429 when the paid-model limiter blocks the caller", async () => {
    allowedMock.mockResolvedValue(false);

    const res = await POST(summarizeRequest(), ctxParams("DOC-0001"));

    expect(res.status).toBe(429);
    expect(getDocumentMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the path id is blank or whitespace", async () => {
    const res = await POST(summarizeRequest(), ctxParams("   "));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: "Invalid document id." });
    expect(getDocumentMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the document is missing or belongs to another org", async () => {
    getDocumentMock.mockResolvedValue(null);

    const res = await POST(summarizeRequest(), ctxParams("DOC-9999"));

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: "Not found" });
    expect(getDocumentMock).toHaveBeenCalledWith(CTX, "DOC-9999");
    expect(setDocumentAiStatusMock).not.toHaveBeenCalled();
  });
});
