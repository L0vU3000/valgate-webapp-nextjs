"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";

export type GeocodeSuggestion = {
  id: string;
  placeName: string;
  mainText: string;
  secondaryText: string;
  center: [number, number]; // [lng, lat]
  addressLine: string;
  city: string;
  province: string;
  country: string;
  /** [w, s, e, n] extent for area results, so a country frames instead of zooming to a point. */
  bbox?: [number, number, number, number] | null;
  /** True when this names an AREA (country, city, region) rather than a point. Picking an area moves the
   *  camera only; picking a precise result also places the pin. */
  isArea?: boolean;
  zip: string;
};

// Address lookup for the wizard. Server-side /api/v1/address/suggest (GrabMaps SearchText via
// SigV4) replaces the old client-side Mapbox geocoding: measured 22/23 street-level on the
// Cambodian demo corpus vs Mapbox's 0/23 (khan centroid). The token never reaches the browser.
//
// ponytail: street/compound precision only. ~4/23 queries return a neighbouring street, so the
// caller must present these as a PICK LIST — never silently take [0]. See
// conductor-logs/2026-09-28-valgate-webapp-address-required-grabmaps-bakeoff.md.
type ApiSuggestion = {
  placeId: string;
  label: string;
  title: string | null;
  street: string | null;
  district: string | null;
  locality: string | null;
  postalCode: string | null;
  country: string | null;
  position: [number, number];
  bbox?: [number, number, number, number] | null;
  isArea?: boolean;
};

function toSuggestion(s: ApiSuggestion): GeocodeSuggestion {
  const parts = s.label.split(",").map((p) => p.trim());
  return {
    id: s.placeId,
    placeName: s.label,
    // Title first: for a building match the provider puts the NAME here ("J Tower 2 BKK1") and the
    // street in `street` — showing `street` alone would hide the thing the user actually searched for.
    // Only fall back to the street when the provider returned no title (plain street queries).
    mainText: s.title || s.street || parts[0] || s.label,
    secondaryText: parts.slice(1).join(", "),
    center: s.position,
    // ponytail: the building name goes into the free-text addressLine, so "J Tower 2" is preserved
    // in the saved address instead of being thrown away in favour of the street. Upgrading to a
    // real unit/floor field needs a schema change — not worth it until users ask.
    addressLine: s.title || s.street || parts[0] || s.label,
    city: s.locality ?? "",
    province: s.district ?? "",
    country: s.country ?? "",
    // Preserved through the mapper: the caller decides pin-vs-camera from this, so dropping it here
    // would silently make every area result look like a precise one.
    isArea: s.isArea ?? false,
    zip: s.postalCode ?? "",
  };
}

/**
 * Address candidates for a typed query.
 *
 * `bias` is where the user is looking, and it is what picks the PROVIDER server-side: inside France
 * the BAN answers, everywhere else GrabMaps. Passing it is therefore not a ranking nicety — without
 * it a French query gets Cambodian results. Both callers already know a map centre, so they pass it.
 */
export async function geocodeQuery(
  query: string,
  bias?: [number, number],
): Promise<GeocodeSuggestion[]> {
  const q = encodeURIComponent(query);
  const b = bias ? `&lng=${bias[0]}&lat=${bias[1]}` : "";
  const res = await fetch(`/api/v1/address/suggest?q=${q}${b}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { items?: ApiSuggestion[] };
  // `items` matches the OpenAPI contract (docs/api-spec/valgate-api-v1.yaml) and the route.
  // Getting this key wrong fails SILENTLY (empty list, no error) — see the parity test.
  return (data.items ?? []).map(toSuggestion);
}

// The address at a coordinate. `null` means "no address near here" (a valid answer over water or
// farmland) — distinct from a network failure, which also returns null. Neither should block the
// pin: the coordinate is already known, the address is a nicety.
export async function reverseQuery(
  position: [number, number],
): Promise<GeocodeSuggestion | null> {
  const [lng, lat] = position;
  const res = await fetch(`/api/v1/address/reverse?lng=${lng}&lat=${lat}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { item?: ApiSuggestion | null };
  return data.item ? toSuggestion(data.item) : null;
}

// Both map searches share provider thresholds, ordering and cancellation. A late reply after
// clearing or closing either surface must never repopulate its old suggestions.
export function usePlaceSearch(getBias?: () => [number, number] | undefined) {
  const {
    suggestions,
    loading,
    search: searchAddress,
    clear: clearAddress,
  } = useGeocode(300, 2);
  const [places, setPlaces] = useState<GeocodeSuggestion[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sequence = useRef(0);
  const biasRef = useRef(getBias);
  biasRef.current = getBias;

  useEffect(
    () => () => {
      sequence.current += 1;
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const clear = useCallback(() => {
    sequence.current += 1;
    if (timer.current) clearTimeout(timer.current);
    clearAddress();
    setPlaces([]);
    setPlacesLoading(false);
  }, [clearAddress]);

  const search = useCallback(
    (query: string) => {
      const q = query.trim();
      const bias = biasRef.current?.();
      searchAddress(q, bias);
      const seq = ++sequence.current;
      if (timer.current) clearTimeout(timer.current);
      if (q.length < 3) {
        setPlaces([]);
        setPlacesLoading(false);
        return;
      }
      setPlacesLoading(true);
      timer.current = setTimeout(async () => {
        const found = await searchPlaces(q, bias);
        if (seq !== sequence.current) return;
        setPlaces(found.filter((p) => p.isArea));
        setPlacesLoading(false);
      }, 300);
    },
    [searchAddress],
  );

  const precise = useMemo(
    () => suggestions.filter((s) => !s.isArea),
    [suggestions],
  );
  const areas = useMemo(
    () => [...suggestions.filter((s) => s.isArea), ...places],
    [suggestions, places],
  );
  const rows = useMemo(() => [...precise, ...areas], [precise, areas]);
  return {
    precise,
    areas,
    rows,
    loading: loading || placesLoading,
    search,
    clear,
  };
}

export function useGeocode(debounceMs = 300, minLength = 3) {
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const requestSeq = useRef(0);
  useEffect(
    () => () => {
      requestSeq.current += 1;
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  // The point the user is looking at, kept in a ref because `search` is called from onChange on
  // every keystroke and must not be rebuilt (and re-debounced) when the map pans.
  //
  // ponytail: read at request time, not tracked as state — a pan that lands mid-typing simply
  // applies to the next keystroke. Upgrade to state only if a provider switch mid-query ever
  // strands a list the user is looking at.
  const biasRef = useRef<[number, number] | undefined>(undefined);

  const search = useCallback(
    (query: string, bias?: [number, number]) => {
      const seq = ++requestSeq.current;
      biasRef.current = bias;
      if (timerRef.current) clearTimeout(timerRef.current);

      if (!query.trim() || query.trim().length < minLength) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      timerRef.current = setTimeout(async () => {
        try {
          const found = await geocodeQuery(query, biasRef.current);
          if (seq === requestSeq.current) setSuggestions(found);
        } catch {
          if (seq === requestSeq.current) setSuggestions([]);
        } finally {
          if (seq === requestSeq.current) setLoading(false);
        }
      }, debounceMs);
    },
    [debounceMs, minLength],
  );

  // Resolve a composed address string to its single best match, for callers that have no dropdown
  // to pick from (manual entry). Returns null when it can't be looked up.
  const lookup = useCallback(
    async (query: string): Promise<GeocodeSuggestion | null> => {
      if (!query.trim()) return null;
      try {
        return (await geocodeQuery(query))[0] ?? null;
      } catch {
        return null;
      }
    },
    [],
  );

  // Address at a coordinate, for the map pin. Same contract as `lookup`: null means "nothing to
  // write", never an error the caller has to handle.
  const reverseLookup = useCallback(
    async (position: [number, number]): Promise<GeocodeSuggestion | null> => {
      try {
        return await reverseQuery(position);
      } catch {
        return null;
      }
    },
    [],
  );

  const clear = useCallback(() => {
    requestSeq.current += 1;
    if (timerRef.current) clearTimeout(timerRef.current);
    setSuggestions([]);
    setLoading(false);
  }, []);

  return { suggestions, loading, search, clear, lookup, reverseLookup };
}

/**
 * Query the typed text for PLACES, for the ⌘K search bar.
 *
 * Deliberately not `useGeocode`: that hook debounces every keystroke against a provider billed per
 * request. A search box is only queried when the user presses Enter, so this runs on demand and never
 * spends a request on a partially-typed word.
 *
 * Both providers are asked server-side and their own rankings interleaved, so a country, a city or a
 * street all resolve regardless of where the map happens to be looking — the same rule the wizard's
 * search already follows.
 *
 * Returns [] rather than throwing: a search box that shows an error for "no such place" would be worse
 * than one that simply finds nothing.
 *
 * ponytail: relies on the provider understanding a bare place name for "France"/"Cambodia". GrabMaps
 * is street-and-place oriented and returns Phnom Penh streets for "Battambang"; a gazetteer with
 * admin-level entries is the upgrade if country/city queries must be exact.
 */
export async function searchPlaces(
  query: string,
  bias?: [number, number],
): Promise<GeocodeSuggestion[]> {
  const q = encodeURIComponent(query);
  const b = bias ? `&lng=${bias[0]}&lat=${bias[1]}` : "";
  try {
    // The dedicated places route, NOT /address/suggest: the search bar asks "where is this place?"
    // (country/city/suburb), which the address providers cannot answer. See app/api/v1/address/places.
    const res = await fetch(`/api/v1/address/places?q=${q}${b}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: ApiSuggestion[] };
    return (data.items ?? []).map((s) => ({
      ...toSuggestion(s),
      // Carried through so the map can fitBounds on an area result; a point result has none.
      bbox: s.bbox ?? null,
      // Decides pin-vs-camera. Absent from the payload (an older server) reads as a point, which is the
      // pre-existing behaviour.
      isArea: s.isArea ?? false,
    }));
  } catch {
    return [];
  }
}
