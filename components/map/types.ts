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
