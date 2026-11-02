import { describe, expect, it } from "vitest";
import districtSale from "@/tests/fixtures/market-landscape/district-sale.json";
import districtRent from "@/tests/fixtures/market-landscape/district-rent.json";
import provinceSale from "@/tests/fixtures/market-landscape/province-sale.json";
import empty from "@/tests/fixtures/market-landscape/empty.json";
import {
  haversineM,
  isApproximateCoordinate,
  isInCambodia,
  matchDistrict,
  nearestListings,
  resolveAreaFromGeocode,
  resolveAreaFromText,
  toDistrictMedians,
  toListings,
  toTabStats,
} from "@/lib/market-landscape";

// Fixtures are trimmed live realestate.com.kh responses (2026-11-02): Meanchey district sale/rent,
// Phnom Penh province, and a commune the portal doesn't know.
const PIN = { lat: 11.5262, lng: 104.9146 }; // Chak Angre Leu, Meanchey

describe("district matching", () => {
  it("matches the portal's own spelling, ignoring case, spacing and admin prefixes", () => {
    expect(matchDistrict("Meanchey")?.district).toBe("Meanchey");
    expect(matchDistrict("Khan Mean Chey")?.district).toBe("Meanchey");
    expect(matchDistrict("Chamkar Mon")).toEqual({ district: "Chamkarmon", province: "Phnom Penh" });
  });

  it("maps other romanisations through the alias table", () => {
    expect(matchDistrict("Tuol Kouk")?.district).toBe("Toul Kork");
    expect(matchDistrict("Prampir Makara")?.district).toBe("7 Makara");
    expect(matchDistrict("Boeung Keng Kang")?.district).toBe("Boeng Keng Kang");
    expect(matchDistrict("Ta Khmao")).toEqual({ district: "Ta Khmau", province: "Kandal" });
  });

  it("does not treat a province or an unknown name as a district", () => {
    expect(matchDistrict("Phnom Penh")).toBeNull();
    expect(matchDistrict("Atlantis")).toBeNull();
    expect(matchDistrict("")).toBeNull();
  });
});

describe("area from stored address text", () => {
  it("takes the district and the commune just before it, skipping streets and notes", () => {
    expect(resolveAreaFromText(["No. 12, Street 106, Phsar Kandal 2, Daun Penh"])).toEqual({
      district: "Daun Penh", province: "Phnom Penh", commune: "Phsar Kandal 2",
    });
    expect(resolveAreaFromText(["Chak Angre Leu, Meanchey (near National Road 1 overpass)"])).toEqual({
      district: "Meanchey", province: "Phnom Penh", commune: "Chak Angrae Leu",
    });
    expect(resolveAreaFromText(["No. 158, Street 71, Boeung Keng Kang 1, Chamkar Mon"])?.commune).toBe("BKK 1");
  });

  it("never uses a street as the commune", () => {
    expect(resolveAreaFromText(["Street 271, Toul Kork"])).toEqual({
      district: "Toul Kork", province: "Phnom Penh", commune: null,
    });
  });

  it("falls through to later fields and returns null when none names a district", () => {
    expect(resolveAreaFromText([undefined, "Floor 21", "Sen Sok"])?.district).toBe("Sen Sok");
    expect(resolveAreaFromText(["Floor 21", "Phnom Penh"])).toBeNull();
  });
});

describe("area from the reverse geocoder", () => {
  it("uses district, then locality, with subDistrict as the commune", () => {
    expect(resolveAreaFromGeocode({ district: "Mean Chey", locality: "Phnom Penh", subDistrict: "Chak Angre Leu" }))
      .toEqual({ district: "Meanchey", province: "Phnom Penh", commune: "Chak Angrae Leu" });
    expect(resolveAreaFromGeocode({ district: null, locality: "Siem Reap", subDistrict: null }))
      .toEqual({ district: "Siem Reap", province: "Siem Reap", commune: null });
    expect(resolveAreaFromGeocode({ district: null, locality: "Bangkok", subDistrict: null })).toBeNull();
  });
});

describe("geometry", () => {
  it("bounds Cambodia", () => {
    expect(isInCambodia(104.92, 11.55)).toBe(true);
    expect(isInCambodia(2.35, 48.85)).toBe(false);
  });

  it("computes great-circle distance", () => {
    // 0.01° of latitude ≈ 1,112 m everywhere.
    expect(Math.round(haversineM({ lat: 11.5, lng: 104.9 }, { lat: 11.51, lng: 104.9 }))).toBe(1112);
  });

  it("flags the portal's placeholder locations, not real fixes", () => {
    expect(isApproximateCoordinate(11.55, 104.91667)).toBe(true); // whole minutes both axes
    expect(isApproximateCoordinate(13.33333, 103.83333)).toBe(true);
    expect(isApproximateCoordinate(11.55, 104.89)).toBe(true); // two decimals
    expect(isApproximateCoordinate(11.526338665469751, 104.9144979454403)).toBe(false);
    expect(isApproximateCoordinate(11.55345, 104.92487)).toBe(false);
  });
});

describe("portal response mapping", () => {
  it("reads the market block as stats", () => {
    expect(toTabStats(districtSale)).toEqual({
      total: 697, median: 135000, p20: 69275, p80: 450000, sqmMedian: 1387, currency: "USD",
    });
    expect(toTabStats(districtRent)?.median).toBe(600);
    expect(toTabStats(empty)).toBeNull();
  });

  it("reads province district medians", () => {
    const medians = toDistrictMedians(provinceSale);
    expect(medians.length).toBeGreaterThan(0);
    expect(medians[0]).toEqual({ name: "Sen Sok", count: expect.any(Number), median: expect.any(Number) });
  });

  it("maps listings with absolute urls, tab-specific prices and honest distances", () => {
    const sale = toListings(districtSale, "sale", PIN);
    expect(sale).toHaveLength(3);
    expect(sale.every((l) => l.url.startsWith("https://www.realestate.com.kh/"))).toBe(true);
    expect(sale[0].priceLabel).toBe(districtSale.results[0].display_price);
    // First fixture result sits on the Meanchey placeholder point → no distance at all.
    expect(sale[0]).toMatchObject({ lat: null, lng: null, distanceM: null });
    const rent = toListings(districtRent, "rent", PIN);
    expect(rent[0].priceLabel).toBe(districtRent.results[0].display_rent);
    expect(rent.some((l) => typeof l.distanceM === "number")).toBe(true);
  });

  it("puts located listings first, nearest first, and dedupes per tab", () => {
    const sale = toListings(districtSale, "sale", PIN);
    const rent = toListings(districtRent, "rent", PIN);
    const merged = nearestListings([sale, rent, sale]);
    expect(merged).toHaveLength(6);
    const located = merged.filter((l) => l.distanceM !== null).map((l) => l.distanceM as number);
    expect(merged.slice(0, located.length).every((l) => l.distanceM !== null)).toBe(true);
    expect(located).toEqual([...located].sort((a, b) => a - b));
  });
});
