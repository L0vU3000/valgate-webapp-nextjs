"use client";

import { useState, useRef, useCallback } from "react";
import { env } from "@/lib/env";

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
          const encoded = encodeURIComponent(query);
          const url =
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json` +
            `?access_token=${env.NEXT_PUBLIC_MAPBOX_TOKEN}` +
            `&limit=5&types=address,place,locality,neighborhood`;

          const res = await fetch(url);
          const data = await res.json();

          const items: GeocodeSuggestion[] = (data.features ?? []).map(
            (f: {
              id: string;
              place_name: string;
              center: [number, number];
              text: string;
              address?: string;
              context?: { id: string; text: string; short_code?: string }[];
            }) => {
              const context = f.context ?? [];
              const zip =
                context.find((c) => c.id.startsWith("postcode"))?.text ?? "";
              const city =
                context.find((c) => c.id.startsWith("place"))?.text ?? "";
              const province =
                context.find((c) => c.id.startsWith("region"))?.text ?? "";
              const country =
                context
                  .find((c) => c.id.startsWith("country"))
                  ?.short_code?.toUpperCase() ?? "";

              const parts = f.place_name.split(",");
              const mainText = parts[0]?.trim() ?? "";
              const secondaryText = parts.slice(1).join(",").trim();
              const addressLine = f.address
                ? `${f.address} ${f.text}`
                : f.text;

              return {
                id: f.id,
                placeName: f.place_name,
                mainText,
                secondaryText,
                center: f.center,
                addressLine,
                city,
                province,
                country,
                zip,
              };
            },
          );

          setSuggestions(items);
        } catch {
          setSuggestions([]);
        } finally {
          setLoading(false);
        }
      }, debounceMs);
    },
    [debounceMs],
  );

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSuggestions([]);
    setLoading(false);
  }, []);

  return { suggestions, loading, search, clear };
}
