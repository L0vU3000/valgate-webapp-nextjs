import { beforeEach, describe, expect, it, vi } from "vitest";
import districtSale from "@/tests/fixtures/market-landscape/district-sale.json";
import districtRent from "@/tests/fixtures/market-landscape/district-rent.json";
import communeSale from "@/tests/fixtures/market-landscape/commune-sale.json";
import provinceSale from "@/tests/fixtures/market-landscape/province-sale.json";
import empty from "@/tests/fixtures/market-landscape/empty.json";

// The network seam is global fetch; the geocoder and the env flag are mocked. No live calls.
const { envMock, reverseMock } = vi.hoisted(() => ({
  envMock: { MARKET_LANDSCAPE_ENABLED: true },
  reverseMock: vi.fn(),
}));
vi.mock("@/lib/env", () => ({ env: envMock }));
vi.mock("@/lib/services/address", () => ({ reverseGeocode: reverseMock }));

import { getMarketLandscape } from "@/lib/services/market-landscape";

const MEANCHEY = { lat: 11.5262, lng: 104.9146, addressLine: "Chak Angre Leu, Meanchey" };

const fetchMock = vi.fn();
const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));

/** Route each portal request to a fixture by its query, the way the live API answers. */
function portalAnswers(overrides: { commune?: unknown } = {}) {
  fetchMock.mockImplementation((url: string) => {
    const q = new URL(url).searchParams;
    if (q.get("address_subdivision")) return json(provinceSale);
    if (q.get("address_line_2")) return json(overrides.commune ?? communeSale);
    return json(q.get("search_type") === "rent" ? districtRent : districtSale);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  envMock.MARKET_LANDSCAPE_ENABLED = true;
  vi.stubGlobal("fetch", fetchMock);
});

describe("getMarketLandscape", () => {
  it("is off unless the flag is set — and then makes no outbound call", async () => {
    envMock.MARKET_LANDSCAPE_ENABLED = false;
    const out = await getMarketLandscape(MEANCHEY);
    expect(out.coverage).toBe("disabled");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(reverseMock).not.toHaveBeenCalled();
  });

  it("answers 'unsupported' outside Cambodia without calling anyone", async () => {
    const out = await getMarketLandscape({ lat: 48.85, lng: 2.35, city: "Paris" });
    expect(out.coverage).toBe("unsupported");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(reverseMock).not.toHaveBeenCalled();
  });

  it("answers 'unmatched' when neither the address nor the geocoder names a district", async () => {
    reverseMock.mockResolvedValue({ district: null, locality: "Phnom Penh", subDistrict: null });
    const out = await getMarketLandscape({ lat: 11.55, lng: 104.92, city: "Phnom Penh" });
    expect(out.coverage).toBe("unmatched");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the stored address first and only geocodes when it can't", async () => {
    portalAnswers();
    await getMarketLandscape(MEANCHEY);
    expect(reverseMock).not.toHaveBeenCalled();

    reverseMock.mockResolvedValue({ district: "Mean Chey", locality: null, subDistrict: null });
    const out = await getMarketLandscape({ lat: 11.5262, lng: 104.9146, city: "Phnom Penh" });
    expect(reverseMock).toHaveBeenCalledWith([104.9146, 11.5262]);
    expect(out.area).toMatchObject({ district: "Meanchey", commune: null, listingsArea: "Meanchey" });
  });

  it("returns district stats, province medians and commune listings, all cached", async () => {
    portalAnswers();
    const out = await getMarketLandscape(MEANCHEY);

    expect(out.coverage).toBe("ok");
    expect(out.area).toEqual({
      district: "Meanchey", commune: "Chak Angrae Leu", province: "Phnom Penh", listingsArea: "Chak Angrae Leu",
    });
    expect(out.stats.sale?.median).toBe(135000);
    expect(out.stats.rent?.median).toBe(600);
    expect(out.districtMedians[0].name).toBe("Sen Sok");
    expect(out.listings.length).toBeGreaterThan(0);
    expect(out.source.name).toBe("realestate.com.kh");

    const urls = fetchMock.mock.calls.map(([u]) => new URL(u as string).searchParams);
    expect(urls.map((q) => q.get("search_type")).sort()).toEqual(["rent", "rent", "sale", "sale", "sale"]);
    for (const [, init] of fetchMock.mock.calls) {
      expect((init as { next?: { revalidate?: number } }).next?.revalidate).toBeGreaterThan(0);
      expect((init as RequestInit).signal).toBeInstanceOf(AbortSignal);
    }
  });

  it("falls back to district listings when the portal doesn't know the commune", async () => {
    portalAnswers({ commune: empty });
    const out = await getMarketLandscape(MEANCHEY);
    expect(out.area).toMatchObject({ commune: null, listingsArea: "Meanchey" });
    expect(out.listings.length).toBeGreaterThan(0);
  });

  it("throws on an upstream failure instead of reporting an empty area", async () => {
    fetchMock.mockImplementation(() => json({ detail: "busy" }, 503));
    await expect(getMarketLandscape(MEANCHEY)).rejects.toThrow("503");
  });
});
