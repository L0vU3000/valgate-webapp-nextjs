"use client";

/**
 * The renderer seam for the home map, which is the one place in the app that draws through **two**
 * renderers: Mapbox for its light/dark basemap, MapLibre (Google 2D tiles) for satellite.
 *
 * Why the seam is a type and not an abstraction: the two renderers are used one at a time, never
 * together, and every shared module (`boundary-layer.ts`, `MapControls.tsx`) already accepts either.
 * A union is all that is needed to say "this call site works with whichever one exists".
 *
 * Neither union below is usable as-is in the libraries' own signatures — overloaded methods on
 * `Map` do not merge, and `Marker.remove()`/`setLngLat()` return `this` of their own class. So these
 * are named unions plus a local cast at the handful of call sites that need it, which is the same
 * posture `boundary-layer.ts` and `MapControls.tsx` already take.
 */
import type { Map as MapLibreMap } from "maplibre-gl";
import type { Map as MapboxMap } from "mapbox-gl";

export type AnyMap = MapLibreMap | MapboxMap;

/**
 * The feature shape both libraries hand back from `queryRenderedFeatures`. Named `mapboxgl.` on one
 * side and `MapGeoJSONFeature` on the other, but structurally identical for the fields this app reads
 * (properties, layer, source, id), so a local alias avoids importing either library by name.
 */
export type AnyGeoJSONFeature = {
  properties?: Record<string, unknown> | null;
  layer?: { id?: string };
  source?: string;
  id?: string | number;
};

/**
 * The pointer event both libraries fire on their layers. Mapbox's carries `features` and
 * `point`, MapLibre's the same; only the wrapper type name differs.
 */
export type AnyMapLayerMouseEvent = {
  features?: AnyGeoJSONFeature[];
  point?: { x: number; y: number };
  lngLat: { lng: number; lat: number };
  originalEvent?: { clientX: number; clientY: number };
};

/**
 * The event surface both libraries expose. `AnyMap` cannot express it because `on`/`off` are
 * overloaded, and TypeScript will not merge overloads across a union — the call is uncallable even
 * though both renderers accept it at runtime. Modules that need to subscribe cast to this at the
 * call site rather than widening their whole interface to `any`.
 */
export type MapEventTarget = {
  // Loose on purpose: the same method serves map-level `(event, handler)` and layer-level
  // `(event, layerId, handler)` calls, and each library types those as different overloads.
  on: (event: string, layerOrHandler: unknown, handler?: unknown) => unknown;
  off: (event: string, layerOrHandler: unknown, handler?: unknown) => unknown;
};

/** The marker surface both libraries implement identically at runtime. */
export interface AnyMarker {
  remove: () => unknown;
  getElement: () => HTMLElement;
  getLngLat: () => { lng: number; lat: number };
  setLngLat: (lngLat: [number, number]) => AnyMarker;
  addTo: (map: AnyMap) => AnyMarker;
  setDraggable: (draggable: boolean) => AnyMarker;
  on: (event: string, handler: () => void) => AnyMarker;
}
