import "server-only"; // C1
import {
  GeoPlacesClient,
  SearchTextCommand,
  ReverseGeocodeCommand,
} from "@aws-sdk/client-geo-places";
import { env } from "@/lib/env";
import { isInFrance } from "@/lib/geo/france";
import { logger } from "@/lib/logger";

// The French national address base (BAN), the official counterpart to the cadastre: same Etalab
// licence, same publisher family, no key. Only ever called for points inside France.
const BAN_REVERSE = "https://api-adresse.data.gouv.fr/reverse";
const BAN_SEARCH = "https://api-adresse.data.gouv.fr/search";

/** BAN's feature properties, narrowed to the fields this app reads. */
type BanProperties = Record<string, unknown>;

function banToSuggestion(
  p: BanProperties,
  fallbackPosition: [number, number],
): AddressSuggestion {
  const str = (v: unknown) =>
    typeof v === "string" && v.trim() ? v.trim() : null;
  const street = str(p.street);
  const housenumber = str(p.housenumber);
  const label = str(p.label);
  // BAN returns the feature's own point. Fall back to the caller's coordinate only if it is absent,
  // which would be a malformed response rather than a normal one.
  const geom = p.__position as [number, number] | undefined;

  return {
    // BAN's own id is stable per address ("75101_8249_00091_ba"); the field is opaque to callers.
    placeId: str(p.id) ?? "",
    label: label ?? "",
    // House number + street is what a user recognises, and what the pick list shows first. Falls
    // back to the street alone when there is no number (a street- or municipality-level result).
    title: [housenumber, street].filter(Boolean).join(" ") || street,
    street,
    // BAN has no sub-district concept; the arrondissement is the closest match and is what a Paris
    // address needs to disambiguate ("Paris 1er Arrondissement").
    subDistrict: str(p.district),
    district: str(p.city),
    locality: str(p.city),
    postalCode: str(p.postcode),
    country: "France",
    position: geom ?? fallbackPosition,
  };
}

/**
 * French addresses matching a typed query — the BAN's type-ahead.
 *
 * Returns a PICK LIST, like the Cambodian path: BAN ranks house numbers above streets, and only the
 * user knows which one they meant ("91 Rue de Rivoli" versus the street as a whole).
 *
 * `bias` MUST be passed by callers. Measured: without lat/lon, a search for "rue de rivoli" returns
 * Rue de Rivoli in LILLE, NICE and LE HAVRE (BAN ranks by its own score, not proximity). With the
 * map centre, the same query returns Paris first at 228 m. So the bias is not a nicety here — it is
 * the difference between the right street and a different city entirely.
 */
async function searchFrenchAddress(
  query: string,
  bias?: [number, number],
): Promise<AddressSuggestion[]> {
  const near = bias ? `&lat=${bias[1]}&lon=${bias[0]}` : "";
  const res = await fetch(
    `${BAN_SEARCH}/?q=${encodeURIComponent(query)}&limit=${MAX_RESULTS}${near}`,
    {
      signal: AbortSignal.timeout(9000),
      headers: {
        Accept: "application/json",
        "User-Agent": "Valgate/1.0 (+https://www.valgate.co)",
      },
      cache: "no-store",
    },
  );
  if (!res.ok) throw new Error(`BAN search responded ${res.status}`);

  const body = (await res.json()) as {
    features?: Array<{
      geometry?: { coordinates?: unknown };
      properties?: BanProperties;
    }>;
  };

  return (body.features ?? []).flatMap((f) => {
    const p = f.properties;
    if (!p) return [];
    const c = f.geometry?.coordinates;
    const pos: [number, number] | null =
      Array.isArray(c) && typeof c[0] === "number" && typeof c[1] === "number"
        ? [c[0], c[1]]
        : null;
    // A result with no coordinate cannot place a pin, which is all this call is for.
    if (!pos) return [];
    return [{ ...banToSuggestion({ ...p, __position: pos }, pos) }];
  });
}

/**
 * The street address at a French coordinate, or null when there is none nearby.
 *
 * Maps BAN's shape onto the same AddressSuggestion the rest of the app consumes, via the shared
 * banToSuggestion above, so no caller can tell which provider answered.
 */
async function reverseFrenchAddress(
  lng: number,
  lat: number,
): Promise<AddressSuggestion | null> {
  const res = await fetch(`${BAN_REVERSE}/?lon=${lng}&lat=${lat}&limit=1`, {
    // Same leash as the cadastre call: this is a click-to-answer path, and BAN is fast.
    signal: AbortSignal.timeout(9000),
    headers: {
      Accept: "application/json",
      "User-Agent": "Valgate/1.0 (+https://www.valgate.co)",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`BAN reverse responded ${res.status}`);

  const body = (await res.json()) as {
    features?: Array<{
      geometry?: { coordinates?: unknown };
      properties?: BanProperties;
    }>;
  };
  const f = body.features?.[0];
  if (!f?.properties) return null;

  // The feature's own point when BAN supplies one, else the coordinate asked about — they agree to
  // within the ~92 m of BAN's own interpolation.
  const c = f.geometry?.coordinates;
  const pos: [number, number] =
    Array.isArray(c) && typeof c[0] === "number" && typeof c[1] === "number"
      ? [c[0], c[1]]
      : [lng, lat];

  return banToSuggestion(f.properties, pos);
}

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
  /** Area extent for country/region/place results, [w, s, e, n]. Lets the map FRAME the result rather
   *  than zoom to a point. Absent for point results (addresses, POIs). */
  bbox?: [number, number, number, number] | null;
  /** True when this names an AREA (country, region, city) rather than a single point. Picking an area
   *  moves the camera only; picking a precise result also places the pin. */
  isArea?: boolean;
  // A PLACE rather than a street address: a country, a city, a suburb, or a street. This is the only
  // gazetteer available to us — GrabMaps' SearchText has none (measured: it answers "Tokyo" and
  // "Battambang" with Phnom Penh streets) and the French BAN is France-only. Mapbox is already a
  // dependency of this repo and already geocodes server-side in lib/services/property-import.ts, so
  // this reuses that provider and that token rather than adding a new one.
  //
  // `types` is left unset on purpose: filtering to place/region would drop street results, and the
  // search bar is meant to find a street too.
  // Set only by the PLACES search (Mapbox); the address providers have no such id, so this is optional
  // rather than forcing every existing mapper to invent one.
  mapboxId?: string | null;
};

export class GeoNotConfiguredError extends Error {
  constructor() {
    super(
      "Address lookup not configured: STORAGE_ACCESS_KEY_ID/STORAGE_SECRET_ACCESS_KEY missing",
    );
  }
}

/**
 * Mapbox place types that describe an AREA rather than a point. Picking one of these should move the
 * camera, not place a pin: a property is a single point, so a pin dropped on "Battambang" is a wrong
 * location the user then has to drag.
 */
const AREA_PLACE_TYPES = new Set([
  "country",
  "region",
  "postcode",
  "district",
  "place",
  "locality",
  "neighborhood",
]);

/**
 * Search for a PLACE — a country, a city, a suburb, or a street — for the ⌘K search bar.
 *
 * Uses Mapbox, the only gazetteer this stack has. Verified limitation of the alternatives: GrabMaps'
 * SearchText is address/POI oriented and returns Phnom Penh streets for "Tokyo" or "Battambang" (it
 * is not a gazetteer), and the French BAN only covers France. So neither can answer this.
 *
 * Mapbox is not a new dependency — the repo already geocodes with it server-side in
 * lib/services/property-import.ts, and the token is already configured for the map.
 *
 * Never throws and never returns wrong-looking data: a failure yields an empty list, and a coordinate
 * is only included when the provider supplied one, because a result the map cannot be sent to is not a
 * result. `ponytail:` Mapbox's own ranking, not a merge — unlike the address paths, there is no second
 * gazetteer to merge with.
 */
export async function searchPlaces(
  query: string,
  bias?: [number, number],
): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  // `proximity` orders results near the map, and is what makes a common name ("Springfield") resolve
  // to the one the user means. `language=en` keeps names in English, matching the UI.
  const params = new URLSearchParams({ limit: "8", language: "en" });
  if (bias) params.set("proximity", `${bias[0]},${bias[1]}`);

  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?${params}` +
        `&access_token=${env.NEXT_PUBLIC_MAPBOX_TOKEN}`,
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      features?: {
        id?: string;
        text?: string;
        place_name?: string;
        center?: [number, number];
        /** Mapbox's own classification. Decides whether picking this result PLACES A PIN (a precise
         *  point: address, POI) or merely GOES TO AN AREA (country, region, city). */
        place_type?: string[];
        /** Present for area features (country, region, place). Used to FRAME the result instead of
         *  zooming to a point, so searching a country shows the country. */
        bbox?: [number, number, number, number];
        context?: { id?: string; text?: string }[];
      }[];
    };

    return (data.features ?? [])
      .filter((f): f is typeof f & { center: [number, number] } =>
        Array.isArray(f.center),
      )
      .map((f) => {
        const ctx = f.context ?? [];
        const find = (prefix: string) =>
          ctx.find((c) => c.id?.startsWith(prefix))?.text ?? null;
        return {
          placeId: f.id ?? "",
          label: f.place_name ?? f.text ?? "",
          title: f.text ?? null,
          street: null,
          subDistrict: null,
          district: find("district") ?? find("place"),
          locality: find("place") ?? find("locality"),
          postalCode: find("postcode"),
          country: find("country"),
          position: f.center,
          // Area types move the camera; precise types place the pin. See AddressSuggestion.isArea.
          isArea:
            (f.place_type ?? []).some((t) => AREA_PLACE_TYPES.has(t)) ||
            (f.place_type ?? []).length === 0,
          bbox: f.bbox ?? null,
          mapboxId: f.id ?? null,
        };
      });
  } catch (err) {
    logger.warn("mapbox place search failed", { err: String(err) });
    return [];
  }
}

// Reuses the S3 credentials (`valgate-storage`), which is also the principal holding the
// geo-places policy. Region is fixed to the region the provider ARN lives in — a different region
// cannot see it, so this is intentionally NOT read from STORAGE_REGION (which is ap-southeast-2
// for the buckets).
function getClient(): GeoPlacesClient {
  const {
    STORAGE_ACCESS_KEY_ID: accessKeyId,
    STORAGE_SECRET_ACCESS_KEY: secretAccessKey,
  } = env;
  if (!accessKeyId || !secretAccessKey) throw new GeoNotConfiguredError();
  return new GeoPlacesClient({
    region: GEO_REGION,
    credentials: { accessKeyId, secretAccessKey },
  });
}

const GEO_REGION = "ap-southeast-1";
// Provider page size AND the cap on the merged list — it is passed straight through as BAN's `limit`
// and GrabMaps' `MaxResults`, so raising it costs a bigger request per provider, not just more UI
// rows. 5 was too tight to be useful: the bias only re-orders results, so at the home map's default
// country view (104.9, 12.5 — ~100 km north of Phnom Penh) a real target fell off the end. "J Tower 2
// BKK1" lands at rank 6 at that bias (measured 2026-10-07), i.e. invisible at 5 and visible at 8.
// ponytail: still an arbitrary cutoff — rank 9+ remains hidden until search ranks better than a
// distance bias; 8 covers the observed miss without an API-contract change.
const MAX_RESULTS = 8;

// Phnom Penh city centre. Used as the bias when the caller has no map centre yet, so results are
// ordered around the capital instead of the whole planet. Callers that already know where the user
// is looking (a pinned map) pass that instead.
const PHNOM_PENH: [number, number] = [104.9282, 11.5564];

export async function searchAddress(
  query: string,
  bias?: [number, number],
): Promise<AddressSuggestion[]> {
  const [lng, lat] = bias ?? PHNOM_PENH;

  // BOTH providers, always — not one chosen by the map centre.
  //
  // Dispatch-on-location was WRONG, and measurably so: this app's maps open on Cambodia, so a search
  // for "91 rue de rivoli paris" was answered by GrabMaps with Cambodian bakeries named "Paris"
  // ("Niroza Paris", "Paris 2 Bakery"). A French address could therefore never be found from the
  // default view — which made the whole cadastre feature unreachable, since reaching France required
  // searching an address you could not search for.
  //
  // Merging is safe and cheap here:
  //   - The BAN is FREE and has no rate limit for this volume, so an unconditional call costs nothing
  //     but one request (and only when the query could plausibly be French — see the gate below).
  //   - BAN returns an EMPTY feature set outside France, so it cannot pollute Cambodian results.
  // The BAN is only asked when the query LOOKS like an address rather than a business name. It
  // indexes addresses, not places, so "Niroza Paris" would waste a call and add nothing — while
  // "91 rue de rivoli paris" is exactly what it is for.
  const looksLikeAddress =
    /\d/.test(query) ||
    /\b(rue|avenue|boulevard|place|chemin|impasse|allee|allée|route|quai)\b/i.test(
      query,
    );

  const wantFrench = isInFrance(lng, lat) || looksLikeAddress;
  const [fr, kh] = await Promise.all([
    wantFrench
      ? searchFrenchAddress(query, [lng, lat]).catch(() => [])
      : Promise.resolve([]),
    // GrabMaps still answers everywhere: it is the only provider with POI names, which is what a user
    // typing a place rather than a street address wants.
    searchWithGrabMaps(query, lng, lat).catch(() => []),
  ]);

  // Ordering: INTERLEAVE the two providers' own rankings, not distance.
  //
  // Distance was my first attempt and it silently destroyed the feature: sorting by distance from the
  // bias put the Paris result ~8,000 km last and the `slice` below then dropped it, so a French address
  // searched from Cambodia still returned nothing but bakeries. A provider's own order is already its
  // best relevance judgement — the BAN puts the exact house number first, GrabMaps puts the nearest
  // POI first — so alternating preserves both instead of letting whichever is closer win outright.
  //
  // Effect: the leading result is whichever provider ranked the query best, and a French address is
  // always in the list however far away the user's map is looking.
  const ordered: AddressSuggestion[] = [];
  for (let i = 0; i < Math.max(fr.length, kh.length); i++) {
    if (fr[i]) ordered.push(fr[i]);
    if (kh[i]) ordered.push(kh[i]);
  }

  return ordered.slice(0, MAX_RESULTS);
}

/** The GrabMaps half of a merged search, extracted so the merge above stays readable. */
async function searchWithGrabMaps(
  query: string,
  lng: number,
  lat: number,
): Promise<AddressSuggestion[]> {
  const client = getClient();
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
    .filter((r): r is typeof r & { Position: [number, number] } =>
      Array.isArray(r.Position),
    )
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
// TWO providers, chosen by the POINT, because one alone cannot answer:
//   - Inside France: the BAN (api-adresse.data.gouv.fr). It is the French national address base —
//     the same data.gouv.fr family as the cadastre, no key, CORS-open, and it returns a real
//     house-number address ("91BA Rue de Rivoli 75001 Paris", 92 m, score 0.99 when measured).
//   - Everywhere else: GrabMaps, which is what actually knows Cambodian streets.
// This matters for the cadastre flow: a parcel can only be picked in France, and GrabMaps has no
// French street data at all, so without this the address fields stayed EMPTY exactly where the
// feature is usable. BAN returns an empty feature set outside France, so neither provider can
// pollute the other's answers.
//
// ponytail: one provider call per drag END, never per drag frame. Upgrade path: debounce per ~50m
// of movement if per-drag calls prove noisy.
export async function reverseGeocode(
  position: [number, number],
): Promise<AddressSuggestion | null> {
  const [lng, lat] = position;
  if (isInFrance(lng, lat)) {
    const fr = await reverseFrenchAddress(lng, lat);
    // A French point with no BAN hit is genuinely addressless (a field, a forest) — do NOT fall
    // through to GrabMaps, which would answer with a Cambodian street for a French coordinate.
    return fr;
  }

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
