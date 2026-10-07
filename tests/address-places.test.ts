import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// searchPlaces — the PLACES gazetteer behind the address bar.
//
// The behaviour under test is the rule the address bar depends on: a result must say whether picking
// it PLACES A PIN (a precise point) or only GOES TO AN AREA (a country, region, city). A pin dropped on
// "Battambang" would save a wrong location, so the split is load-bearing, not cosmetic.
//
// Mapbox is stubbed; no network, no token.
// ---------------------------------------------------------------------------

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/lib/env", () => ({
  env: { NEXT_PUBLIC_MAPBOX_TOKEN: "pk.test" },
}));

import { searchPlaces } from "@/lib/services/address";

function mockMapbox(features: unknown[]) {
  return vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      new Response(JSON.stringify({ features }), { status: 200 }),
    );
}

beforeEach(() => vi.restoreAllMocks());
afterEach(() => vi.restoreAllMocks());

describe("searchPlaces — places vs points", () => {
  it("marks a country as an AREA, so picking it will not drop a pin", async () => {
    mockMapbox([
      {
        id: "country.1",
        text: "France",
        place_name: "France",
        center: [2.62, 47.82],
        place_type: ["country"],
        bbox: [-5.14, 41.33, 9.56, 51.09],
      },
    ]);
    const [fr] = await searchPlaces("France");
    expect(fr.isArea).toBe(true);
    expect(fr.bbox).toEqual([-5.14, 41.33, 9.56, 51.09]);
  });

  it("marks a city as an AREA but a street address as a POINT", async () => {
    mockMapbox([
      {
        id: "place.1",
        text: "Battambang",
        center: [103.2, 13.1],
        place_type: ["place"],
      },
      {
        id: "address.1",
        text: "91 Rue de Rivoli",
        center: [2.34, 48.86],
        place_type: ["address"],
      },
    ]);
    const out = await searchPlaces("mixed");
    const city = out.find((s) => s.placeId === "place.1");
    const street = out.find((s) => s.placeId === "address.1");
    expect(city?.isArea).toBe(true);
    expect(street?.isArea).toBe(false);
  });

  it("treats a result with no place_type as an AREA (unclassified != a safe pin)", async () => {
    mockMapbox([{ id: "x.1", text: "Nowhere", center: [1, 1] }]);
    const [r] = await searchPlaces("Nowhere");
    expect(r.isArea).toBe(true);
  });

  it("drops a feature with no centre — a result the map cannot be sent to is not a result", async () => {
    mockMapbox([
      {
        id: "ok",
        text: "Phnom Penh",
        center: [104.9, 11.5],
        place_type: ["place"],
      },
      { id: "bad", text: "No centre here" },
    ]);
    const out = await searchPlaces("Phnom Penh");
    expect(out).toHaveLength(1);
    expect(out[0].placeId).toBe("ok");
  });

  it("returns an empty list rather than throwing when the provider fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    await expect(searchPlaces("anywhere")).resolves.toEqual([]);
  });

  it("does not call the provider for a one-character query", async () => {
    const spy = mockMapbox([]);
    await expect(searchPlaces("F")).resolves.toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });
});
