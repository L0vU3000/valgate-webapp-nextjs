import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Parity: the wizard's client hook must read the SAME response key the route emits.
//
// This is a regression test for a real bug that shipped: the route returned
// `{ items: [...] }` while use-geocode.ts read `data.suggestions`. The result was
// a SILENTLY empty pick list — HTTP 200, no console error, no suggestions. The
// per-route tests could not catch it because they mock `searchAddress` and stop at
// the route's own JSON; nothing ever fed the route's actual body through the hook's
// parser. This test does exactly that: real route handler -> real hook parser.
// ---------------------------------------------------------------------------

const { resolveApiV1CtxMock, searchAddressMock, reverseGeocodeMock, loggerMock } = vi.hoisted(() => ({
  resolveApiV1CtxMock: vi.fn(),
  searchAddressMock: vi.fn(),
  reverseGeocodeMock: vi.fn(),
  loggerMock: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

vi.mock("@/lib/api/v1/auth", () => ({ resolveApiV1Ctx: resolveApiV1CtxMock }));
vi.mock("@/lib/services/address", () => ({
  searchAddress: searchAddressMock,
  reverseGeocode: reverseGeocodeMock,
}));
vi.mock("@/lib/logger", () => ({ logger: loggerMock }));

import { GET } from "@/app/api/v1/address/suggest/route";
import { GET as GET_REVERSE } from "@/app/api/v1/address/reverse/route";
import { geocodeQuery, reverseQuery } from "@/app/_shared/add-property/_lib/use-geocode";

beforeEach(() => {
  vi.clearAllMocks();
  resolveApiV1CtxMock.mockResolvedValue({
    ok: true,
    ctx: { userId: "USR-0001", orgId: "ORG-0001", orgRole: "admin" },
  });
});

describe("wizard hook ↔ /api/v1/address/suggest parity", () => {
  it("parses the route's real response body into a non-empty pick list", async () => {
    searchAddressMock.mockResolvedValue([
      {
        placeId: "p1",
        label: "St 215, Veal Vong, 7 Makara, Phnom Penh, Cambodia, 120307",
        street: "St 215",
        district: "7 Makara",
        locality: "Phnom Penh",
        postalCode: "120307",
        country: "Cambodia",
        position: [104.908, 11.5595],
      },
    ]);

    // What the route actually emits over the wire...
    const res = await GET(
      new Request("http://localhost/api/v1/address/suggest?q=St%20215%20Phnom%20Penh"),
    );
    expect(res.status).toBe(200);
    const wireBody = await res.json();

    // ...fed through the hook's parser unchanged (no hand-written fixture, so the
    // two sides cannot drift apart while this test keeps passing).
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(wireBody), { status: 200 })),
    );

    const parsed = await geocodeQuery("St 215 Phnom Penh");
    vi.unstubAllGlobals();

    // A wrong response key shows up here as length 0, which is the bug's signature.
    expect(parsed).toHaveLength(1);
    expect(parsed[0].mainText).toBe("St 215");
    // Coordinates must survive the hop — the pin can't be set without them.
    expect(parsed[0].center).toEqual([104.908, 11.5595]);
    expect(parsed[0].province).toBe("7 Makara");
    expect(parsed[0].zip).toBe("120307");
  });

  it("returns [] on a non-200 instead of throwing into the UI", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })));
    const parsed = await geocodeQuery("St 215 Phnom Penh");
    vi.unstubAllGlobals();
    expect(parsed).toEqual([]);
  });

  // Users search by BUILDING NAME ("J Tower 2"). GrabMaps puts that name in `Title` and the street
  // in `street`; before this, the hook showed `street`, so the pick list never displayed the thing
  // that was searched for and the name was dropped from the saved address.
  it("shows the provider's building name, not just the street", async () => {
    searchAddressMock.mockResolvedValue([
      {
        placeId: "p2",
        label: "Street 398, Boeng Keng Kang 1, Boeng Keng Kang, Phnom Penh, Cambodia, 121301",
        title: "J Tower 2 BKK1",
        street: "Street 398",
        district: "Boeng Keng Kang",
        locality: "Phnom Penh",
        postalCode: "121301",
        country: "Cambodia",
        position: [104.9239, 11.5454],
      },
    ]);

    const res = await GET(new Request("http://localhost/api/v1/address/suggest?q=J%20Tower%202"));
    const wireBody = await res.json();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(wireBody), { status: 200 })));

    const parsed = await geocodeQuery("J Tower 2");
    vi.unstubAllGlobals();

    expect(parsed[0].mainText).toBe("J Tower 2 BKK1");
    // The name must reach the saved address line too, not be discarded for the street.
    expect(parsed[0].addressLine).toBe("J Tower 2 BKK1");
  });

  it("falls back to the street when the provider returned no title", async () => {
    searchAddressMock.mockResolvedValue([
      {
        placeId: "p3",
        label: "St 215, Veal Vong, Phnom Penh, Cambodia",
        title: null,
        street: "St 215",
        district: "7 Makara",
        locality: "Phnom Penh",
        postalCode: null,
        country: "Cambodia",
        position: [104.908, 11.5595],
      },
    ]);

    const res = await GET(new Request("http://localhost/api/v1/address/suggest?q=St%20215"));
    const wireBody = await res.json();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(wireBody), { status: 200 })));

    const parsed = await geocodeQuery("St 215");
    vi.unstubAllGlobals();

    expect(parsed[0].mainText).toBe("St 215");
  });
});

describe("wizard hook ↔ /api/v1/address/reverse parity", () => {
  // Same class of bug as above: the route wraps its result in `item`, so the hook reading anything
  // else would silently never refresh the address when the pin moves.
  it("parses the route's real body into a suggestion", async () => {
    reverseGeocodeMock.mockResolvedValue({
      placeId: "p9",
      label: "St 215, Veal Vong, 7 Makara, Phnom Penh, Cambodia, 120307",
      title: "N159E0E1 St 215 Veal Vong",
      street: "St 215",
      district: "7 Makara",
      locality: "Phnom Penh",
      postalCode: "120307",
      country: "Cambodia",
      position: [104.908, 11.5595],
    });

    const res = await GET_REVERSE(new Request("http://localhost/api/v1/address/reverse?lng=104.908&lat=11.5595"));
    const wireBody = await res.json();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(wireBody), { status: 200 })));

    const parsed = await reverseQuery([104.908, 11.5595]);
    vi.unstubAllGlobals();

    expect(parsed).not.toBeNull();
    expect(parsed!.center).toEqual([104.908, 11.5595]);
    expect(parsed!.province).toBe("7 Makara");
  });

  it("maps a null item to null instead of a blank suggestion", async () => {
    reverseGeocodeMock.mockResolvedValue(null);
    const res = await GET_REVERSE(new Request("http://localhost/api/v1/address/reverse?lng=103.5&lat=12.1"));
    const wireBody = await res.json();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(wireBody), { status: 200 })));

    const parsed = await reverseQuery([103.5, 12.1]);
    vi.unstubAllGlobals();

    expect(parsed).toBeNull();
  });
});
