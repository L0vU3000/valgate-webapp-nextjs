import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import type { Ctx } from "@/lib/services/_mapping";

// ---------------------------------------------------------------------------
// POST /api/documents/[id]/summarize — auth, id, rate limit, and org-scoped
// lookup fully mocked (no Clerk/DB/model). Proves: no session → 401, blank id
// → 400, over-limit → 429, missing/other-org document → 404 (no model call).
// ---------------------------------------------------------------------------

const CTX: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };

const { resolveRouteCtxMock, getDocumentMock, allowedMock, setDocumentAiStatusMock, generateObjectMock, scanDocumentMock } = vi.hoisted(
  () => ({
    resolveRouteCtxMock: vi.fn(),
    getDocumentMock: vi.fn(),
    allowedMock: vi.fn(),
    setDocumentAiStatusMock: vi.fn(),
    generateObjectMock: vi.fn(), scanDocumentMock: vi.fn(),
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
  docIngestLimiter: {},
  documentAiLimiter: {},
  allowed: allowedMock,
}));

vi.mock("@/lib/log", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("ai", () => ({ generateObject: generateObjectMock }));
vi.mock("@/lib/services/ai-model", () => ({ documentAiConfigured: () => true, documentModel: vi.fn(), summaryModelSlug: () => "test" }));
vi.mock("@/lib/services/document-scan", () => ({ scanDocument: scanDocumentMock }));
vi.mock("@/lib/services/properties", () => ({ getProperty: vi.fn() }));
afterEach(() => vi.unstubAllGlobals());

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

it.each(["summary", "translate", "suggest"])("fails without a model call when the stored file cannot be fetched (%s)", async (mode) => {
  getDocumentMock.mockResolvedValue({ id: "DOC-0001", propertyId: "PROP-0001", storageId: "ORG-0001/DOC-0001/x.pdf", mimeType: "application/pdf" });
  generateObjectMock.mockResolvedValue({ object: { summary: "x", keyFields: [], pageCount: 1 } });
  scanDocumentMock.mockResolvedValue({ extracted: {} });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("missing", { status: 404 })));
  const request = new NextRequest("http://localhost/api/documents/DOC-0001/summarize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode }) });
  const response = await POST(request, ctxParams("DOC-0001"));
  expect(response.status).toBe(500);
  expect(generateObjectMock).not.toHaveBeenCalled();
  expect(scanDocumentMock).not.toHaveBeenCalled();
  if (mode === "summary") expect(setDocumentAiStatusMock).toHaveBeenLastCalledWith(CTX, "DOC-0001", "failed");
  else expect(setDocumentAiStatusMock).not.toHaveBeenCalled();
});
