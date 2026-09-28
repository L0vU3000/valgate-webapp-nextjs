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
    mainText: s.street ?? parts[0] ?? s.label,
    secondaryText: parts.slice(1).join(", "),
    center: s.position,
    addressLine: s.street ?? parts[0] ?? s.label,
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

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSuggestions([]);
    setLoading(false);
  }, []);

  return { suggestions, loading, search, clear, lookup };
}
