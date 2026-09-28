"use client";

import { useState, useRef, useCallback } from "react";

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
    zip: s.postalCode ?? "",
  };
}

export async function geocodeQuery(query: string): Promise<GeocodeSuggestion[]> {
  const res = await fetch(`/api/v1/address/suggest?q=${encodeURIComponent(query)}`);
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

export function useGeocode(debounceMs = 300) {
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    (query: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);

      if (!query.trim() || query.length < 3) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      timerRef.current = setTimeout(async () => {
        try {
          setSuggestions(await geocodeQuery(query));
        } catch {
          setSuggestions([]);
        } finally {
          setLoading(false);
        }
      }, debounceMs);
    },
    [debounceMs],
  );

  // Resolve a composed address string to its single best match, for callers that have no dropdown
  // to pick from (manual entry). Returns null when it can't be looked up.
  const lookup = useCallback(async (query: string): Promise<GeocodeSuggestion | null> => {
    if (!query.trim()) return null;
    try {
      return (await geocodeQuery(query))[0] ?? null;
    } catch {
      return null;
    }
  }, []);

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
    if (timerRef.current) clearTimeout(timerRef.current);
    setSuggestions([]);
    setLoading(false);
  }, []);

  return { suggestions, loading, search, clear, lookup, reverseLookup };
}
