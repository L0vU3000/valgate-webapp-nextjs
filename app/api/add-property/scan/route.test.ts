import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { Ctx } from "@/lib/services/_mapping";
import { MAX_BYTES } from "@/lib/upload-constants";

// ---------------------------------------------------------------------------
// POST /api/add-property/scan — auth, rate limit, and file validation mocked
// (no Clerk/DB/model). Proves: no session → 401, over-limit → 429, missing /
// bad-type / oversized file → 400, valid file reaches scanDocument.
// ---------------------------------------------------------------------------

const CTX: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };

const { resolveRouteCtxMock, scanDocumentMock, allowedMock } = vi.hoisted(() => ({
  resolveRouteCtxMock: vi.fn(),
  scanDocumentMock: vi.fn(),
  allowedMock: vi.fn(),
}));

vi.mock("@/lib/auth/ctx", () => ({
  resolveRouteCtx: resolveRouteCtxMock,
}));

vi.mock("@/lib/services/document-scan", () => ({
  scanDocument: scanDocumentMock,
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
 * Builds a POST NextRequest whose body is multipart form data with an optional file field.
 */
function scanRequest(file: File | null): NextRequest {
  const formData = new FormData();
  if (file) formData.append("file", file);
  return new NextRequest("http://localhost/api/add-property/scan", {
    method: "POST",
    body: formData,
  });
}

/**
 * Builds a small PDF File the MIME allowlist accepts.
 */
function pdfFile(): File {
  return new File(["fake-pdf"], "deed.pdf", { type: "application/pdf" });
}

beforeEach(() => {
  vi.clearAllMocks();
  resolveRouteCtxMock.mockResolvedValue({ ok: true, ctx: CTX });
  allowedMock.mockResolvedValue(true);
});

describe("POST /api/add-property/scan", () => {
  it("returns 401 when the caller is not signed in, and never reads the file", async () => {
    resolveRouteCtxMock.mockResolvedValue({ ok: false });

    const res = await POST(scanRequest(pdfFile()));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: "Unauthorized." });
    expect(scanDocumentMock).not.toHaveBeenCalled();
  });

  it("returns 429 when the paid-model limiter blocks the caller", async () => {
    allowedMock.mockResolvedValue(false);

    const res = await POST(scanRequest(pdfFile()));

    expect(res.status).toBe(429);
    expect(scanDocumentMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the multipart body has no file field", async () => {
    const res = await POST(scanRequest(null));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(scanDocumentMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the file MIME type is not on the upload allowlist", async () => {
    const res = await POST(scanRequest(new File(["x"], "note.txt", { type: "text/plain" })));

    expect(res.status).toBe(400);
    expect(scanDocumentMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the file is over the 10 MB cap", async () => {
    const big = new File([new ArrayBuffer(MAX_BYTES + 1)], "big.pdf", { type: "application/pdf" });

    const res = await POST(scanRequest(big));

    expect(res.status).toBe(400);
    expect(scanDocumentMock).not.toHaveBeenCalled();
  });

  it("calls scanDocument and returns extracted fields for an allowed PDF", async () => {
    scanDocumentMock.mockResolvedValue({
      extracted: { propertyName: "Riverside Villa" },
      lowConfidence: [],
    });

    const res = await POST(scanRequest(pdfFile()));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.extracted.propertyName).toBe("Riverside Villa");
    expect(scanDocumentMock).toHaveBeenCalledOnce();
  });
});
