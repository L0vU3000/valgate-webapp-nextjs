"use client";

import type { StyleSpecification } from "maplibre-gl";
import { setWorkerUrl } from "maplibre-gl";
import { env } from "@/lib/env";

/**
 * Google Map Tiles (2D) as a MapLibre basemap.
 *
 * Why this module exists: Mapbox's `mapbox://styles/...` URLs are Mapbox-only, and mapbox-gl's
 * licence permits use "only with the relevant Mapbox product(s)". Rendering Google tiles through
 * it is not a config change, it is a licence violation. MapLibre GL is the BSD-3-Clause fork and
 * is the renderer Google's own policy anticipates ("Display the Google Maps logo with third-party
 * renderers"). So every interactive map now goes through here.
 *
 * Google 2D tiles are RASTER, which is why this returns a hand-built style instead of a URL
 * string: there is no vector style to point at, so there are no vector-only things downstream
 * (no `composite` source, no 3D buildings, no street labels to restyle).
 */
export type BasemapTheme = "satellite" | "terrain" | "roadmap";

/**
 * Point MapLibre at a worker it can actually load.
 *
 * v6 resolves its default worker against `import.meta.url`, which after bundling points at the app
 * chunk rather than the maplibre dist folder — so the URL comes out as an empty string and the map
 * silently never fires `load`. The failure mode is nasty: tiles still return 200 and the canvas
 * still exists, so it looks like a slow basemap rather than a broken one.
 *
 * Both files are copied into `public/` (same approach as the existing `pdf.worker.min.mjs`), and
 * the worker's own `./maplibre-gl-shared.mjs` import resolves next to it. MapLibre's v5→v6 migration
 * guide names this as a required one-time call for every bundler, not a Next-specific workaround.
 */
export function configureWorker() {
  setWorkerUrl("/maplibre-gl-worker.mjs");
}

const CREATE_SESSION = "https://tile.googleapis.com/v1/createSession";
const TILE_ROOT = "https://tile.googleapis.com/v1/2dtiles";

/**
 * A session token is a UUID identifying a set of display options; it lives ~2 weeks.
 *
 * Memoised per theme for the life of the page. Without this, a route that mounts several maps
 * (portfolio + expand modal + a drawer) mints one token per mount, and every extra mint is a
 * needless billable-ish call and a visible delay before the first tile.
 */
const sessions = new Map<BasemapTheme, Promise<string>>();

export function googleSession(mapType: BasemapTheme): Promise<string> {
  const existing = sessions.get(mapType);
  if (existing) return existing;

  // `terrain` requires the roadmap layer explicitly, per Google's docs. Without it the request
  // 400s rather than falling back.
  const body: Record<string, unknown> = { mapType, language: "en-US", region: "KH" };
  if (mapType === "terrain") body.layerTypes = ["layerRoadmap"];

  const p = fetch(`${CREATE_SESSION}?key=${env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`createSession ${r.status}`))))
    .then((d: { session?: string }) => {
      if (!d.session) throw new Error("createSession returned no session token");
      return d.session;
    })
    .catch((err) => {
      // Drop the memo so the next mount retries instead of replaying a rejected promise forever.
      sessions.delete(mapType);
      throw err;
    });

  sessions.set(mapType, p);
  return p;
}

/**
 * Build the raster style for a theme. `session` comes from {@link googleSession}.
 *
 * Dark mode: Google ships no dark theme (roadmap / satellite / terrain only). Rather than lose
 * dark altogether, roadmap is darkened with MapLibre's native raster paint properties — no CSS
 * filter, no second tile set. Satellite is left alone: it is already dark enough that dimming it
 * only destroys detail, which is the whole reason to look at satellite.
 */
export function basemapStyle(
  theme: BasemapTheme,
  isDark: boolean,
  session: string,
): StyleSpecification {
  const dark = isDark && theme === "roadmap";

  return {
    version: 8,
    // No glyphs/sprite: raster only. Anything downstream that asks for text will simply get none,
    // which is why the code no longer styles labels.
    sources: {
      google: {
        type: "raster",
        tiles: [`${TILE_ROOT}/{z}/{x}/{y}?session=${session}&key=${env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`],
        tileSize: 256,
        maxzoom: 22,
        attribution: ATTRIBUTION,
      },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": dark ? "#0f1117" : "#e8eaed" } },
      {
        id: "google",
        type: "raster",
        source: "google",
        ...(dark
          ? {
              paint: {
                "raster-saturation": -0.85,
                "raster-contrast": 0.05,
                "raster-brightness-min": 0.0,
                "raster-brightness-max": 0.45,
              },
            }
          : {}),
      },
    ],
  };
}

/**
 * Google requires attribution for the imagery, and the required string varies by viewport (it is
 * a list of imagery providers, not a constant). The static fallback below is what the viewport
 * call cannot be relied on for — it can fail, and a missing attribution is a compliance problem,
 * not a cosmetic one.
 *
 * ponytail: static fallback, not the live per-viewport string. Upgrade by calling VIEWPORT on
 * `moveend` and pushing the result into the source's `attribution` if legal review asks for it.
 */
const ATTRIBUTION =
  'Imagery &copy;2026 Google, Airbus, CNES / Airbus, Maxar Technologies, Landsat / Copernicus';

/** Where the Google logo must go. Exported so callers do not each invent a corner. */
export const ATTRIBUTION_POSITION = "bottom-left";

/** A blank but valid style, used between map construction and the session token arriving. */
export function placeholderStyle(isDark: boolean): StyleSpecification {
  return {
    version: 8,
    sources: {},
    layers: [
      { id: "background", type: "background", paint: { "background-color": isDark ? "#0f1117" : "#e8eaed" } },
    ],
  };
}
