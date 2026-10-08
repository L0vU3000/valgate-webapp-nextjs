import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// The BAN hand-off in lib/services/address.ts#reverseGeocode.
//
// Why this is worth a test: the dispatch is by POINT, and getting it wrong is invisible. If a
// French point fell through to GrabMaps it would answer with a Cambodian street (both providers
// return a plausible-looking AddressSuggestion), and if a Cambodian point hit the BAN it would
// return null and silently blank the address. Neither failure raises an error, so only an explicit
// assertion on WHICH provider was called catches it.
//
// The AWS client is mocked at the module boundary; global fetch is stubbed, which is the BAN call.
// ---------------------------------------------------------------------------

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
}));

vi.mock("@aws-sdk/client-geo-places", () => ({
  GeoPlacesClient: class {
    send = sendMock;
  },
  // Command objects are constructed with `new`, so these must be classes, not arrow functions.
  SearchTextCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
  ReverseGeocodeCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
}));
vi.mock("@/lib/env", () => ({
  env: { STORAGE_ACCESS_KEY_ID: "k", STORAGE_SECRET_ACCESS_KEY: "s" },
}));

import { reverseGeocode, searchAddress } from "@/lib/services/address";

const PARIS: [number, number] = [2.3376, 48.8606];
const PHNOM_PENH: [number, number] = [104.9282, 11.5564];

function banResponse(features: unknown[]) {
  return { ok: true, json: async () => ({ type: "FeatureCollection", features }) };
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("reverseGeocode provider dispatch", () => {
  it("uses the French BAN (not GrabMaps) for a point inside France", async () => {
    fetchMock.mockResolvedValue(
      banResponse([
        {
          properties: {
            id: "75101_8249_00091_ba",
            label: "91BA Rue de Rivoli 75001 Paris",
            street: "Rue de Rivoli",
            housenumber: "91BA",
            postcode: "75001",
            city: "Paris",
            district: "Paris 1er Arrondissement",
          },
        },
      ]),
    );

    const out = await reverseGeocode(PARIS);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("api-adresse.data.gouv.fr");
    // AWS must not be touched: one point, one provider.
    expect(sendMock).not.toHaveBeenCalled();

    expect(out).not.toBeNull();
    expect(out!.label).toBe("91BA Rue de Rivoli 75001 Paris");
    expect(out!.title).toBe("91BA Rue de Rivoli");
    expect(out!.street).toBe("Rue de Rivoli");
    expect(out!.postalCode).toBe("75001");
    expect(out!.country).toBe("France");
    // The sub-district slot carries the arrondissement — the piece a Paris address needs.
    expect(out!.subDistrict).toBe("Paris 1er Arrondissement");
  });

  it("uses GrabMaps (not the BAN) for a point outside France", async () => {
    sendMock.mockResolvedValue({
      ResultItems: [
        {
          PlaceId: "gm-1",
          Title: "Independence Monument",
          Address: { Label: "Preah Sihanouk Blvd, Phnom Penh", Street: "Preah Sihanouk Boulevard", Country: { Name: "Cambodia" } },
          Position: [104.9282, 11.5564],
        },
      ],
    });

    const out = await reverseGeocode(PHNOM_PENH);

    // The critical assertion: no BAN call for a Cambodian coordinate.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(out!.street).toBe("Preah Sihanouk Boulevard");
  });

  it("returns null for a French point with no BAN hit, WITHOUT falling through to GrabMaps", async () => {
    // A forest or a field: genuinely addressless. Falling through would answer a French
    // coordinate with a Cambodian street, which is worse than no address at all.
    fetchMock.mockResolvedValue(banResponse([]));

    const out = await reverseGeocode(PARIS);

    expect(out).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("surfaces a BAN outage as a throw rather than a silent null", async () => {
    // The route turns a throw into a generic 500; a null would look like "no address here",
    // which is a different (and wrong) answer.
    fetchMock.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });

    await expect(reverseGeocode(PARIS)).rejects.toThrow(/BAN reverse responded 503/);
  });
});

describe("searchAddress provider dispatch", () => {
  it("asks the BAN and PASSES the bias, even for a point in France", async () => {
    // Both providers are asked now, so GrabMaps is also called — mock it so the merge has both sides.
    sendMock.mockResolvedValue({ ResultItems: [] });
    fetchMock.mockResolvedValue(
      banResponse([
        {
          geometry: { coordinates: [2.3362, 48.862442] },
          properties: {
            id: "75101_8249",
            label: "Rue de Rivoli 75001 Paris",
            street: "Rue de Rivoli",
            housenumber: "91",
            postcode: "75001",
            city: "Paris",
          },
        },
      ]),
    );

    const out = await searchAddress("rue de rivoli", PARIS);

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("api-adresse.data.gouv.fr/search");
    // THE regression guard. Without lat/lon the BAN answers from Lille, Nice and Le Havre — measured
    // live: "rue de rivoli" returned all three, none of them Paris. The bias must reach the wire.
    expect(url).toContain("lat=48.8606");
    expect(url).toContain("lon=2.3376");

    expect(out).toHaveLength(1);
    expect(out[0].label).toBe("Rue de Rivoli 75001 Paris");
    expect(out[0].title).toBe("91 Rue de Rivoli");
    expect(out[0].subDistrict).toBeNull();
    // The feature's own point, not the point asked about.
    expect(out[0].position).toEqual([2.3362, 48.862442]);
  });

  it("finds a FRENCH address even when the user's map is in Cambodia", async () => {
    // The bug this guards. Dispatch-by-map-centre meant a user in Cambodia could never search a French
    // address, so the cadastre could not be reached at all. Measured before the fix: "91 rue de rivoli
    // paris" returned five Cambodian bakeries named "Paris" and nothing else.
    sendMock.mockResolvedValue({
      ResultItems: [
        {
          Position: [104.92, 11.55],
          PlaceId: "kh-1",
          Title: "Niroza Paris",
          Address: { Label: "Niroza Paris, Phnom Penh", Country: { Name: "Cambodia" } },
        },
      ],
    });
    fetchMock.mockResolvedValue(
      banResponse([
        {
          geometry: { coordinates: [2.3394, 48.8591] },
          properties: { id: "75101_8249_00091", label: "91 Rue de Rivoli 75001 Paris", street: "Rue de Rivoli", housenumber: "91", city: "Paris" },
        },
      ]),
    );

    const out = await searchAddress("91 rue de rivoli paris", PHNOM_PENH);

    // The French address must survive the merge — and must not be pushed past the result limit by the
    // local Cambodian hit, which is what a distance sort did.
    const labels = out.map((o) => o.label);
    expect(labels).toContain("91 Rue de Rivoli 75001 Paris");
  });

  it("uses GrabMaps for a point outside France, and never calls the BAN", async () => {
    sendMock.mockResolvedValue({
      ResultItems: [
        {
          Position: [104.92, 11.55],
          PlaceId: "place-1",
          Title: "Independence Monument",
          Address: { Label: "Preah Sihanouk Blvd", Country: { Name: "Cambodia" } },
        },
      ],
    });

    // A POI-style query (no digit, no street word) — the case where the BAN is skipped entirely.
    const out = await searchAddress("independence monument", PHNOM_PENH);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(out[0].title).toBe("Independence Monument");
  });

  it("drops BAN results with no coordinate, because a pin cannot be placed", async () => {
    // GrabMaps contributes nothing here, so the ONLY results are the two BAN features.
    sendMock.mockResolvedValue({ ResultItems: [] });
    fetchMock.mockResolvedValue(
      banResponse([
        { properties: { id: "a", label: "No Geometry Street" } },
        { geometry: { coordinates: [2.34, 48.86] }, properties: { id: "b", label: "Real Street" } },
      ]),
    );

    const out = await searchAddress("street", PARIS);

    expect(out).toHaveLength(1);
    expect(out[0].label).toBe("Real Street");
  });
});
