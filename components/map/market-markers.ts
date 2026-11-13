// Pure helpers for the map's market-listing pills — the Airbnb-style white price markers that
// showcase the 12 portal listings when a property drawer is open. No map, no DOM here: this module
// is unit-tested, which marker-creating MapView cannot be. DOM halves live in MapView
// (createMarketPillElement and the card it opens).
import type { LandscapeListing } from "@/lib/market-landscape";

export type MarketPointFeature = GeoJSON.Feature<GeoJSON.Point, { id: number; kind: "market" }>;

/**
 * Only listings with precise portal coordinates draw a pill on the map — approximate rows have
 * lat/lng null and stay in the drawer list, where they are already labelled "location approximate".
 * Never invent coordinates for them.
 */
export function marketFeatures(listings: LandscapeListing[]): MarketPointFeature[] {
  return listings
    .filter((l) => l.lat !== null && l.lng !== null)
    .map((l) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [l.lng as number, l.lat as number] },
      properties: { id: l.id, kind: "market" as const },
    }));
}

/** Marker key for a market leaf. The `point-market-` prefix is what routes it to the pill DOM, and
 * what keeps it out of the property-key paths (`point-<id>`, cluster ids never look like those). */
export function marketKeyOf(id: number): string {
  return `point-market-${id}`;
}

/** The listing id inside a `point-market-<id>` marker key, or null for any other marker key. */
export function marketIdFromKey(key: string): number | null {
  const m = /^point-market-(-?\d+)$/.exec(key);
  return m ? Number(m[1]) : null;
}