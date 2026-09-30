import { describe, it, expect, vi, beforeEach } from "vitest";
import { deflateRawSync } from "node:zlib";
import type { Ctx } from "@/lib/services/_mapping";

// ---------------------------------------------------------------------------
// POST /api/property-boundary/preview and /commit — the auth seam, the rate limiter, and both
// services mocked (no Clerk, no DB, no S3). Proves the four things a hand-edited request could
// otherwise get away with: no auth -> 401, over the rate limit -> 429, a malformed instruction
// body -> 400 (never a 500), and one bad file in a batch NOT discarding the rest.
//
// The batch case is the point. The UI commits N files in one call, so a single unreadable KMZ
// must cost the user that one row — not the whole drop.
// ---------------------------------------------------------------------------

const { resolveRouteCtxMock, attachMock, previewMock, listPropertiesMock, putKmzMock, createDocumentMock, allowedMock, logMock } =
  vi.hoisted(() => ({
    resolveRouteCtxMock: vi.fn(),
    attachMock: vi.fn(),
    previewMock: vi.fn(),
    listPropertiesMock: vi.fn(),
    putKmzMock: vi.fn(),
    createDocumentMock: vi.fn(),
    allowedMock: vi.fn(),
    logMock: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  }));

vi.mock("@/lib/auth/ctx", () => ({ resolveRouteCtx: resolveRouteCtxMock }));
vi.mock("@/lib/ratelimit", () => ({ actionLimiter: {}, allowed: allowedMock }));
vi.mock("@/lib/log", () => ({ log: logMock }));
vi.mock("@/lib/cache/bust", () => ({ bustCache: vi.fn() }));
vi.mock("@/app/actions/_result", () => ({ revalidateFeTag: vi.fn(), TOO_MANY_REQUESTS: { ok: false } }));
vi.mock("@/lib/services/properties", () => ({ listProperties: listPropertiesMock }));
vi.mock("@/lib/services/storage", () => ({ putKmz: putKmzMock }));
vi.mock("@/lib/services/documents", () => ({ createDocument: createDocumentMock }));
vi.mock("@/lib/services/property-boundary", async (importOriginal) => {
  // matchBoundaries / previewBoundary are pure and worth exercising for real; only the writers
  // and the DB reader are mocked.
  const actual = await importOriginal<typeof import("@/lib/services/property-boundary")>();
  return {
    ...actual,
    attachBoundaryFromBytes: attachMock,
    previewBoundary: previewMock,
  };
});

import { POST as preview } from "@/app/api/property-boundary/preview/route";
import { POST as commit } from "@/app/api/property-boundary/commit/route";

const CTX: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };

// A real KMZ byte sequence, so the route parses rather than being handed a stub.
function kmz(coords: string): Buffer {
  const body = Buffer.from(
    `<?xml version="1.0"?><kml><Document><Placemark><Polygon><outerBoundaryIs><LinearRing>` +
      `<coordinates>${coords}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></Document></kml>`,
    "utf8",
  );
  const payload = deflateRawSync(body);
  const name = Buffer.from("doc.kml", "utf8");
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(8, 8);
  local.writeUInt32LE(payload.length, 18);
  local.writeUInt16LE(name.length, 26);
  return Buffer.concat([local, name, payload]);
}

const RING = "104.0,11.0,0 104.001,11.0,0 104.001,11.001,0 104.0,11.001,0 104.0,11.0,0";

function multipart(fields: Record<string, string>, files: { name: string; body: Buffer }[]) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  for (const f of files) {
    const bytes = new Uint8Array(f.body);
    form.append("files", new File([bytes], f.name, { type: "application/vnd.google-earth.kmz" }));
  }
  return new Request("http://localhost/api/property-boundary", { method: "POST", body: form });
}

beforeEach(() => {
  vi.clearAllMocks();
  allowedMock.mockResolvedValue(true);
  resolveRouteCtxMock.mockResolvedValue({ ok: true, ctx: CTX });
});

describe("POST /api/property-boundary/preview", () => {
  it("returns 401 without a session, and touches nothing", async () => {
    resolveRouteCtxMock.mockResolvedValue({ ok: false });
    const res = await preview(multipart({}, [{ name: "KPS00002.kmz", body: kmz(RING) }]));
    expect(res.status).toBe(401);
    expect(listPropertiesMock).not.toHaveBeenCalled();
  });

  it("returns 429 when the limiter rejects, before reading any file", async () => {
    allowedMock.mockResolvedValue(false);
    const res = await preview(multipart({}, [{ name: "KPS00002.kmz", body: kmz(RING) }]));
    expect(res.status).toBe(429);
    expect(listPropertiesMock).not.toHaveBeenCalled();
  });

  it("returns 400 when no files are sent", async () => {
    const res = await preview(multipart({}, []));
    expect(res.status).toBe(400);
  });

  it("matches a filename to its property and reports the parsed size", async () => {
    listPropertiesMock.mockResolvedValue([
      { id: "PROP-0532", name: "KPS00002 — Land, Ampil Roung", totalArea: "12277" },
    ]);
    previewMock.mockResolvedValue({
      ok: true,
      preview: {
        sizeM2: 12362.24,
        centroid: [11.0, 104.0],
        pinShiftM: 199,
        pinMoved: true,
        replaced: false,
        geometry: { type: "Polygon", coordinates: [[[104, 11], [104.001, 11], [104.001, 11.001]]] },
      },
    });
    const res = await preview(multipart({}, [{ name: "KPS00002.kmz", body: kmz(RING) }]));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rows[0]).toMatchObject({
      propertyId: "PROP-0532",
      code: "KPS00002",
      status: "ready",
      sizeM2: 12362.24,
      declaredM2: 12277,
    });
    // Declared vs measured is surfaced, not resolved: +0.7% here.
    expect(body.rows[0].areaDiffPct).toBe(0.7);
  });

  it("does not guess when no property carries that code", async () => {
    listPropertiesMock.mockResolvedValue([{ id: "PROP-0532", name: "KPS00002 — Land, Ampil Roung" }]);
    const res = await preview(multipart({}, [{ name: "UNKNOWN01.kmz", body: kmz(RING) }]));
    const body = await res.json();
    expect(body.rows[0]).toMatchObject({ propertyId: "", status: "unmatched", reason: "no-match" });
    expect(previewMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/property-boundary/commit", () => {
  it("returns 401 without a session, and writes nothing", async () => {
    resolveRouteCtxMock.mockResolvedValue({ ok: false });
    const res = await commit(multipart({ instructions: "[]" }, []));
    expect(res.status).toBe(401);
    expect(attachMock).not.toHaveBeenCalled();
  });

  it("returns 400 on a malformed instruction body rather than 500", async () => {
    const res = await commit(multipart({ instructions: "{not json" }, []));
    expect(res.status).toBe(400);
  });

  it("returns 400 when there is nothing to attach", async () => {
    const res = await commit(multipart({ instructions: "[]" }, []));
    expect(res.status).toBe(400);
  });

  it("attaches and stores the KMZ for a valid instruction", async () => {
    attachMock.mockResolvedValue({ sizeM2: 100, landParcelId: "LPAR-0009", pinMoved: true, replaced: false });
    const res = await commit(
      multipart({ instructions: JSON.stringify([{ propertyId: "PROP-0532", file: "KPS00002.kmz" }]) }, [
        { name: "KPS00002.kmz", body: kmz(RING) },
      ]),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results[0]).toMatchObject({ ok: true, landParcelId: "LPAR-0009" });
    // storeFiles: true is what makes the original .kmz land in S3 as a Document.
    expect(attachMock).toHaveBeenCalledWith(CTX, "PROP-0532", expect.any(Buffer), "KPS00002.kmz", {
      storeFiles: true,
      movePin: true,
    });
  });

  it("keeps the pin when the user declined the move", async () => {
    attachMock.mockResolvedValue({ sizeM2: 100, landParcelId: "LPAR-0009", pinMoved: false, replaced: false });
    await commit(
      multipart({ instructions: JSON.stringify([{ propertyId: "PROP-0532", file: "a.kmz", movePin: false }]) }, [
        { name: "a.kmz", body: kmz(RING) },
      ]),
    );
    expect(attachMock).toHaveBeenCalledWith(CTX, "PROP-0532", expect.any(Buffer), "a.kmz", {
      storeFiles: true,
      movePin: false,
    });
  });

  // The batch guarantee. One unreadable file must cost its own row only.
  it("keeps the rest of a batch when one file fails", async () => {
    attachMock
      .mockResolvedValueOnce({ sizeM2: 100, landParcelId: "LPAR-0009", pinMoved: true, replaced: false })
      .mockRejectedValueOnce(new Error("S3 unreachable"))
      .mockResolvedValueOnce({ sizeM2: 300, landParcelId: "LPAR-0011", pinMoved: true, replaced: false });
    const res = await commit(
      multipart(
        {
          instructions: JSON.stringify([
            { propertyId: "PROP-1", file: "a.kmz" },
            { propertyId: "PROP-2", file: "b.kmz" },
            { propertyId: "PROP-3", file: "c.kmz" },
          ]),
        },
        [
          { name: "a.kmz", body: kmz(RING) },
          { name: "b.kmz", body: kmz(RING) },
          { name: "c.kmz", body: kmz(RING) },
        ],
      ),
    );
    const body = await res.json();
    expect(body.results.map((r: { ok: boolean }) => r.ok)).toEqual([true, false, true]);
    // An unexpected error is logged and reported generically — never echoed to the client.
    expect(body.results[1].error).toBe("Could not attach that boundary.");
    expect(body.results[1].error).not.toContain("S3 unreachable");
    expect(logMock.error).toHaveBeenCalled();
  });

  it("reports a row as failed when its file is absent from the request", async () => {
    const res = await commit(
      multipart({ instructions: JSON.stringify([{ propertyId: "PROP-1", file: "ghost.kmz" }]) }, [
        { name: "a.kmz", body: kmz(RING) },
      ]),
    );
    const body = await res.json();
    expect(body.results[0]).toMatchObject({ ok: false, error: "File missing from the request." });
    expect(attachMock).not.toHaveBeenCalled();
  });
});
