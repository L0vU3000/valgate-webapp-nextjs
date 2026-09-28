import "server-only"; // C1
import {
  GeoPlacesClient,
  SearchTextCommand,
  ReverseGeocodeCommand,
} from "@aws-sdk/client-geo-places";
import { env } from "@/lib/env";

// Address lookup for the add-property wizard. SearchText is deliberately the ONLY geo-places
// operation we call: it returns Position AND Address in a single hop (measured 2026-09-28), so the
// Suggest -> GetPlace two-step is unnecessary. One call = one billable unit and no place-id
// round-trip, and nothing we send back has to be storable-under-terms (GetPlace returns
// components AWS forbids caching).
//
// Provider: GrabMaps (`provider/default` in ap-southeast-1) — measured 22/23 street-level on the
// Cambodian demo corpus vs Mapbox's 0/23 (khan centroid). See
// conductor-logs/2026-09-28-valgate-webapp-address-required-grabmaps-bakeoff.md.
//
// ponytail: street/compound precision, NOT unit precision. All 8 unit variants of one building
// collapse to a single street result, and ~4/23 queries returned a neighbouring street. This is
// why the caller MUST present results as a pick-list — a silent auto-resolve would write wrong
// addresses. Upgrade path: none known; no provider resolves Cambodian unit numbers.
export type AddressSuggestion = {
  placeId: string;
  label: string;
  /**
   * The provider's name for this place — a BUILDING/POI name when one matched ("J Tower 2 BKK1")
   * and a street-ish label otherwise ("N159E0E1 St 215 Veal Vong"). Users search by building name,
   * so the pick list shows this first; `street` alone would hide the match.
   */
  title: string | null;
  street: string | null;
  subDistrict: string | null;
  district: string | null;
  locality: string | null;
  postalCode: string | null;
  country: string | null;
  /** [lng, lat] — GeoJSON order, matching the rest of this codebase. */
  position: [number, number];
};

export class GeoNotConfiguredError extends Error {
  constructor() {
    super("Address lookup not configured: STORAGE_ACCESS_KEY_ID/STORAGE_SECRET_ACCESS_KEY missing");
  }
}

// Reuses the S3 credentials (`valgate-storage`), which is also the principal holding the
// geo-places policy. Region is fixed to the region the provider ARN lives in — a different region
// cannot see it, so this is intentionally NOT read from STORAGE_REGION (which is ap-southeast-2
// for the buckets).
function getClient(): GeoPlacesClient {
  const { STORAGE_ACCESS_KEY_ID: accessKeyId, STORAGE_SECRET_ACCESS_KEY: secretAccessKey } = env;
  if (!accessKeyId || !secretAccessKey) throw new GeoNotConfiguredError();
  return new GeoPlacesClient({
    region: GEO_REGION,
    credentials: { accessKeyId, secretAccessKey },
  });
}

const GEO_REGION = "ap-southeast-1";
const MAX_RESULTS = 5;

// Phnom Penh city centre. Used as the bias when the caller has no map centre yet, so results are
// ordered around the capital instead of the whole planet. Callers that already know where the user
// is looking (a pinned map) pass that instead.
const PHNOM_PENH: [number, number] = [104.9282, 11.5564];

export async function searchAddress(
  query: string,
  bias?: [number, number],
): Promise<AddressSuggestion[]> {
  const client = getClient();
  const [lng, lat] = bias ?? PHNOM_PENH;

  const out = await client.send(
    new SearchTextCommand({
      QueryText: query,
      MaxResults: MAX_RESULTS,
      BiasPosition: [lng, lat],
      // Without this, Street/District/Locality come back in KHMER SCRIPT (measured 2026-09-28),
      // which silently blanks the English province <select> in the wizard. The UI is English-only.
      Language: "en",
    }),
  );

  return (out.ResultItems ?? [])
    .filter((r): r is typeof r & { Position: [number, number] } => Array.isArray(r.Position))
    .map((r) => ({
      placeId: r.PlaceId ?? "",
      label: r.Address?.Label ?? r.Title ?? "",
      // Title is the building/POI name when SearchText matched one. It is NOT duplicated in
      // Address, so it must be carried separately or "J Tower 2" shows up as "Street 398".
      title: r.Title ?? null,
      street: r.Address?.Street ?? null,
      subDistrict: r.Address?.SubDistrict ?? null,
      district: r.Address?.District ?? null,
      locality: r.Address?.Locality ?? null,
      postalCode: r.Address?.PostalCode ?? null,
      country: r.Address?.Country?.Name ?? null,
      position: [r.Position[0], r.Position[1]],
    }));
}

// Reverse geocode a single coordinate to the nearest address. Drives the pin: as the user drags,
// the address fields follow the pin instead of going stale.
//
// ponytail: one provider call per drag END, never per drag frame. GrabMaps reverse geocoding is
// street/compound precision, so a drag inside one block returns the same street — that is expected,
// not a bug. Upgrade path: debounce per ~50m of movement if per-drag calls prove noisy.
export async function reverseGeocode(
  position: [number, number],
): Promise<AddressSuggestion | null> {
  const client = getClient();

  const out = await client.send(
    new ReverseGeocodeCommand({
      QueryPosition: [position[0], position[1]],
      MaxResults: 1,
      Language: "en",
    }),
  );

  const r = out.ResultItems?.[0];
  if (!r || !Array.isArray(r.Position)) return null;

  return {
    placeId: r.PlaceId ?? "",
    label: r.Address?.Label ?? r.Title ?? "",
    title: r.Title ?? null,
    street: r.Address?.Street ?? null,
    subDistrict: r.Address?.SubDistrict ?? null,
    district: r.Address?.District ?? null,
    locality: r.Address?.Locality ?? null,
    postalCode: r.Address?.PostalCode ?? null,
    country: r.Address?.Country?.Name ?? null,
    position: [r.Position[0], r.Position[1]],
  };
}
