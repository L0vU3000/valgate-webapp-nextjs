import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Ctx } from "@/lib/services/_mapping";

// ---------------------------------------------------------------------------
// GET /api/v1/cadastre/parcel  and  POST /api/v1/properties/{id}/cadastre
//
// Both routes are mocked at the auth + service seam (no Clerk, no DB, no network), and these prove
// the four things a hand-made request could otherwise get away with:
//   1. no session -> 401, and nothing is fetched or written
//   2. outside France -> no outbound call at all, and a clean null
//   3. a bad coordinate -> 400 (Number(null) is 0, which would silently query the null island)
//   4. the write route refuses a cross-org / missing property (404) before attaching
//
// The geometry is never taken from the client, so there is no "polygon in the body" case to test:
// the service re-fetches by point. That is asserted instead.
// ---------------------------------------------------------------------------

const { resolveMock, parcelAtPointMock, attachCadastralMock, getPropertyMock, writeDeniedMock } =
  vi.hoisted(() => ({
    resolveMock: vi.fn(),
    parcelAtPointMock: vi.fn(),
    attachCadastralMock: vi.fn(),
    getPropertyMock: vi.fn(),
    writeDeniedMock: vi.fn(),
  }));

vi.mock("@/lib/api/v1/auth", () => ({ resolveApiV1Ctx: resolveMock }));
vi.mock("@/lib/services/cadastre", async (importOriginal) => {
  // isInFrance is pure and is the route's real gate — exercise it for real, mock only the network.
  const actual = await importOriginal<typeof import("@/lib/services/cadastre")>();
  return { ...actual, parcelAtPoint: parcelAtPointMock };
});
vi.mock("@/lib/services/property-boundary", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/property-boundary")>();
  return { ...actual, attachCadastralParcel: attachCadastralMock };
});
vi.mock("@/lib/services/properties", () => ({ getProperty: getPropertyMock }));
vi.mock("@/lib/api/v1/property-write", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/v1/property-write")>();
  return { ...actual, isWriteDeniedError: writeDeniedMock };
});

import { GET } from "@/app/api/v1/cadastre/parcel/route";
import { POST } from "@/app/api/v1/properties/[id]/cadastre/route";

const CTX: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };

const get = (qs: string) => GET(new Request(`http://localhost/api/v1/cadastre/parcel?${qs}`));
const post = (body: unknown, id = "PROP-0001") =>
  POST(
    new Request(`http://localhost/api/v1/properties/${id}/cadastre`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );

beforeEach(() => {
  vi.clearAllMocks();
  resolveMock.mockResolvedValue({ ok: true, ctx: CTX });
  writeDeniedMock.mockReturnValue(false);
  getPropertyMock.mockResolvedValue({ id: "PROP-0001", name: "Test" });
  attachCadastralMock.mockResolvedValue({
    landParcelId: "LPAR-0009",
    sizeM2: 27197,
    centroid: [48.86, 2.338],
    pinShiftM: 12,
    pinMoved: true,
    replaced: false,
  });
});

describe("GET /api/v1/cadastre/parcel", () => {
  it("returns 401 without a session and never calls the cadastre", async () => {
    resolveMock.mockResolvedValue({ ok: false, response: new Response(null, { status: 401 }) });
    const res = await get("lng=2.3376&lat=48.8606");
    expect(res.status).toBe(401);
    expect(parcelAtPointMock).not.toHaveBeenCalled();
  });

  it("returns 400 rather than querying the null island when coordinates are missing", async () => {
    // Number(null) === 0 and Number("") === 0, both finite — so a naive check would reverse-geocode
    // (0,0) and answer "no parcel" as though that were the user's question.
    for (const qs of ["", "lng=&lat=", "lng=2.3", "lng=abc&lat=48", "lng=200&lat=48"]) {
      const res = await get(qs);
      expect(res.status, `qs=${qs}`).toBe(400);
    }
    expect(parcelAtPointMock).not.toHaveBeenCalled();
  });

  it("answers null outside France without any outbound call", async () => {
    const res = await get("lng=104.9282&lat=11.5564"); // Phnom Penh
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ parcel: null });
    expect(parcelAtPointMock).not.toHaveBeenCalled();
  });

  it("returns the parcel for a point in France", async () => {
    parcelAtPointMock.mockResolvedValue({
      idu: "75101000AJ0002",
      section: "AJ",
      numero: "0002",
      commune: "Paris",
      codeInsee: "75056",
      contenanceM2: 27227,
      geometry: { type: "MultiPolygon", coordinates: [] },
    });
    const res = await get("lng=2.3376&lat=48.8606");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.parcel.idu).toBe("75101000AJ0002");
    expect(parcelAtPointMock).toHaveBeenCalledWith(2.3376, 48.8606);
  });

  it("returns 502, not a fake null, when the cadastre is unreachable", async () => {
    // An outage must NOT look like "this land is unregistered" — that would be a silent lie about
    // the user's property.
    parcelAtPointMock.mockRejectedValue(new Error("APICarto responded 503"));
    const res = await get("lng=2.3376&lat=48.8606");
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error.message).not.toContain("503");
  });
});

describe("POST /api/v1/properties/[id]/cadastre", () => {
  it("returns 401 without a session and writes nothing", async () => {
    resolveMock.mockResolvedValue({ ok: false, response: new Response(null, { status: 401 }) });
    const res = await post({ lng: 2.3376, lat: 48.8606, ref: "75101000AJ0002" });
    expect(res.status).toBe(401);
    expect(attachCadastralMock).not.toHaveBeenCalled();
  });

  it("returns 404 for a property outside the caller's org, before attaching", async () => {
    getPropertyMock.mockResolvedValue(null); // org-scoped read misses it
    const res = await post({ lng: 2.3376, lat: 48.8606, ref: "75101000AJ0002" });
    expect(res.status).toBe(404);
    expect(attachCadastralMock).not.toHaveBeenCalled();
  });

  it("returns 403 for a viewer, before attaching", async () => {
    resolveMock.mockResolvedValue({ ok: true, ctx: { ...CTX, orgRole: "viewer" } });
    const res = await post({ lng: 2.3376, lat: 48.8606, ref: "75101000AJ0002" });
    expect(res.status).toBe(403);
    expect(attachCadastralMock).not.toHaveBeenCalled();
  });

  it("returns 400 rather than attaching from a missing or non-finite point", async () => {
    for (const body of [{}, { lng: 2.3 }, { lng: "2.3", lat: "48.8" }, { lng: null, lat: null }]) {
      const res = await post(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
    }
    expect(attachCadastralMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a point outside France instead of asking the cadastre", async () => {
    const res = await post({ lng: 104.9282, lat: 11.5564, ref: "x" });
    expect(res.status).toBe(400);
    expect(attachCadastralMock).not.toHaveBeenCalled();
  });

  it("attaches by POINT and never accepts geometry from the client", async () => {
    // The body carries no polygon field by design; if one is smuggled in it is ignored, because the
    // service re-fetches. Assert the call shape rather than trusting the intent.
    const res = await post({
      lng: 2.3376,
      lat: 48.8606,
      ref: "75101000AJ0002",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      geometry: { type: "Polygon", coordinates: [] } as any,
    });
    expect(res.status).toBe(200);
    expect(attachCadastralMock).toHaveBeenCalledWith(CTX, {
      propertyId: "PROP-0001",
      ref: "75101000AJ0002",
      point: [2.3376, 48.8606],
      movePin: true,
    });
    const body = await res.json();
    expect(body).toMatchObject({ landParcelId: "LPAR-0009", sizeM2: 27197, pinMoved: true });
  });

  it("keeps the pin when the caller asks it to", async () => {
    await post({ lng: 2.3376, lat: 48.8606, ref: "75101000AJ0002", movePin: false });
    expect(attachCadastralMock).toHaveBeenCalledWith(
      CTX,
      expect.objectContaining({ movePin: false }),
    );
  });

  it("returns 403 when the service refuses the write (demo mode), not a 500", async () => {
    attachCadastralMock.mockRejectedValue(new Error("Demo is read-only"));
    writeDeniedMock.mockReturnValue(true);
    const res = await post({ lng: 2.3376, lat: 48.8606, ref: "75101000AJ0002" });
    expect(res.status).toBe(403);
  });

  it("does not leak an internal error message", async () => {
    attachCadastralMock.mockRejectedValue(new Error("S3 bucket valgate-documents-dev is gone"));
    const res = await post({ lng: 2.3376, lat: 48.8606, ref: "75101000AJ0002" });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.message).not.toContain("bucket");
  });
});
