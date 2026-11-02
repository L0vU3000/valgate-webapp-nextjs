import "server-only"; // C1

// Market landscape around a property pin — the fetching half. Pure matching/mapping lives in
// lib/market-landscape.ts; read its header for what the portal API does and doesn't support.
//
// Off by default (env.MARKET_LANDSCAPE_ENABLED): the portal's robots.txt disallows /api/ and the
// owner is still securing re-use permission. Off means no outbound call at all.
//
// Call budget per uncached area: district sale + district rent + province (shared by every pin in
// the province) + commune sale + commune rent when a commune is known — all in parallel, all on
// Next's data cache, so repeat pins in the same area cost nothing for the TTL.

import { env } from "@/lib/env";
import { reverseGeocode } from "@/lib/services/address";
import {
  emptyLandscape,
  isInCambodia,
  isPortalPayload,
  nearestListings,
  PORTAL_ORIGIN,
  resolveAreaFromGeocode,
  resolveAreaFromText,
  toDistrictMedians,
  toListings,
  toTabStats,
  type MarketLandscapeDTO,
} from "@/lib/market-landscape";

const RESULTS_URL = `${PORTAL_ORIGIN}/api/portal/pages/results/`;
const AREA_TTL_S = 60 * 60; // listings move daily; an hour is fresh enough for a glance panel
const PROVINCE_TTL_S = 6 * 60 * 60; // top-district medians barely move within a day

type Body = Record<string, unknown>;

async function portal(params: Record<string, string>, revalidate: number): Promise<Body> {
  const url = `${RESULTS_URL}?${new URLSearchParams(params)}`;
  const res = await fetch(url, {
    // Measured 0.3–1.8 s live. 9 s matches the cadastre call: above every measurement, inside a
    // serverless default.
    signal: AbortSignal.timeout(9000),
    headers: { Accept: "application/json", "User-Agent": "Valgate/1.0 (+https://www.valgate.co)" },
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`realestate.com.kh responded ${res.status}`);
  const body: unknown = await res.json();
  if (!isPortalPayload(body)) throw new Error("realestate.com.kh returned an unexpected payload");
  return body;
}

export type LandscapeProperty = {
  lat: number;
  lng: number;
  addressLine?: string | null;
  addressLine2?: string | null;
  city?: string | null;
};

/**
 * The landscape around a stored property. Non-"ok" coverage is a normal answer; an upstream
 * failure THROWS, so an outage is never shown to the user as "no listings here".
 */
export async function getMarketLandscape(property: LandscapeProperty): Promise<MarketLandscapeDTO> {
  if (!env.MARKET_LANDSCAPE_ENABLED) return emptyLandscape("disabled");

  const pin = { lat: property.lat, lng: property.lng };
  if (!isInCambodia(pin.lng, pin.lat)) return emptyLandscape("unsupported");

  // Stored address first (free); the geocoder only when the text names no known district.
  let area = resolveAreaFromText([property.addressLine, property.addressLine2, property.city]);
  if (!area) {
    const g = await reverseGeocode([pin.lng, pin.lat]);
    area = g ? resolveAreaFromGeocode(g) : null;
  }
  if (!area) return emptyLandscape("unmatched");

  // Filters AND together on the portal (verified: a commune under the wrong district returns 0), so
  // every area query carries its parents — a commune name that repeats elsewhere can't leak in.
  const district = { address_subdivision: area.province, address_locality: area.district, order_by: "date-desc" };
  const commune = area.commune ? { ...district, address_line_2: area.commune } : null;

  const [dSale, dRent, province, cSale, cRent] = await Promise.all([
    portal({ search_type: "sale", ...district }, AREA_TTL_S),
    portal({ search_type: "rent", ...district }, AREA_TTL_S),
    portal({ search_type: "sale", address_subdivision: area.province }, PROVINCE_TTL_S),
    commune ? portal({ search_type: "sale", ...commune }, AREA_TTL_S) : null,
    commune ? portal({ search_type: "rent", ...commune }, AREA_TTL_S) : null,
  ]);

  const communeListings = cSale && cRent ? [toListings(cSale, "sale", pin), toListings(cRent, "rent", pin)] : [];
  const useCommune = communeListings.some((l) => l.length > 0);
  const listings = nearestListings(
    useCommune ? communeListings : [toListings(dSale, "sale", pin), toListings(dRent, "rent", pin)],
  );

  return {
    coverage: "ok",
    area: {
      district: area.district,
      commune: useCommune ? area.commune : null,
      province: area.province,
      listingsArea: useCommune && area.commune ? area.commune : area.district,
    },
    stats: { sale: toTabStats(dSale), rent: toTabStats(dRent) },
    districtMedians: toDistrictMedians(province),
    listings,
    source: { name: "realestate.com.kh", url: PORTAL_ORIGIN, fetchedAt: new Date().toISOString() },
  };
}
