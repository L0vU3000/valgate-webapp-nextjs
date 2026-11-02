import { describe, it, expect } from "vitest";
import type { LandscapeListing } from "@/lib/market-landscape";
import { marketFeatures, marketKeyOf, marketIdFromKey } from "./market-markers";

function listing(id: number, lat: number | null, lng: number | null): LandscapeListing {
  return {
    id,
    tab: "sale",
    headline: "Listing",
    address: "",
    lat,
    lng,
    distanceM: lat !== null && lng !== null ? 100 : null,
    priceLabel: "$1",
    pricePerSqmLabel: null,
    imageUrl: null,
    url: "https://www.realestate.com.kh/x",
  };
}

describe("marketFeatures", () => {
  it("drops approximate rows (null coordinates) and keeps precise ones as market points", () => {
    const precise = listing(1, 11.50995, 104.92979);
    const approximate = listing(2, null, null);
    const features = marketFeatures([precise, approximate]);
    expect(features).toHaveLength(1);
    expect(features[0].properties).toEqual({ id: 1, kind: "market" });
    expect(features[0].geometry.coordinates).toEqual([104.92979, 11.50995]);
  });

  it("keeps the marker kind on every feature so MapView routes them to pills", () => {
    const features = marketFeatures([listing(7, 11.5, 104.9)]);
    expect(features.every((f) => f.properties.kind === "market")).toBe(true);
  });
});

describe("marker-key routing", () => {
  it("round-trips a market id through its key", () => {
    const key = marketKeyOf(43123);
    expect(marketIdFromKey(key)).toBe(43123);
  });

  it("rejects every other marker key", () => {
    expect(marketIdFromKey("point-PROP-0016")).toBe(null);
    expect(marketIdFromKey("cluster-42")).toBe(null);
    expect(marketIdFromKey("point-market")).toBe(null);
    expect(marketIdFromKey("point-market-notanumber")).toBe(null);
  });
});