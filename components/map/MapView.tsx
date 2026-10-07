"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Map as MapLibreMap, Marker as MapLibreMarker, LngLat as MapLibreLngLat, AttributionControl, type GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import Supercluster from "supercluster";
import { env } from "@/lib/env";
import { useShellContext } from "@/components/layout/shell-context";
import type { Property } from "@/lib/data/types/property";
import { addBoundaryLayer, BOUNDARY_SOURCE_ID } from "@/components/map/boundary-layer";
import {
  googleSession,
  basemapStyle,
  placeholderStyle,
  ATTRIBUTION_POSITION,
} from "@/components/map/basemap";

/**
 * Which renderer draws the basemap.
 *
 * Two, not one, and not by preference: Google's 2D tiles may not be drawn through `mapbox-gl`
 * (licence), and Google has no light/dark roadmap equivalent. So the light/dark basemap stays on
 * Mapbox and Google satellite is the only MapLibre surface. `boundary-layer.ts` and `MapControls.tsx`
 * already accept either renderer; this file is the one that has to pick.
 */
export type MapRenderer = "mapbox" | "maplibre";

import type { AnyMap, AnyMarker } from "@/components/map/types";

const CAMBODIA_CENTER: [number, number] = [104.9, 12.5];
const CAMBODIA_ZOOM = 7;

/** The Mapbox basemap for the light/dark (non-satellite) view. Satellite is MapLibre + Google. */
export function mapboxStyle(isDark: boolean): string {
  return isDark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11";
}

/** The marker class for whichever renderer is mounted. Both implement the {@link AnyMarker} surface. */
function MarkerFor(map: AnyMap): new (opts: { element: HTMLElement; anchor: string }) => AnyMarker {
  return (map instanceof mapboxgl.Map ? mapboxgl.Marker : MapLibreMarker) as never;
}

/** The coordinate class for whichever renderer is mounted; only `project()` needs it. */
function LngLatFor(map: AnyMap): new (lng: number, lat: number) => MapLibreLngLat {
  return (map instanceof mapboxgl.Map ? mapboxgl.LngLat : MapLibreLngLat) as never;
}

// The deepest zoom the map may reach, shared by Mapbox's `maxZoom` and Supercluster's `maxZoom`.
//
// Supercluster STOPS clustering above its `maxZoom` and hands back raw points. With Mapbox free to
// reach its default 22 while Supercluster stopped at 14, any coordinate shared by several properties
// (the seed has 8 Olympic units on one lat/lng) eventually un-clustered into 8 pins drawn on the same
// pixel — 8 real properties, so it reads as one duplicate that never goes away. Raising Supercluster
// alone only moves that wall: the map still out-zooms it. Pinning both to one value keeps the
// un-clustered regime unreachable, and identical coordinates stay a cluster, which is what the
// co-located swipe-card design wants.
// ponytail: at max zoom a stack is still possible if a real pair sits inside `radius` px; the honest
// fix there is the swipe cards, not a bigger number.
const MAP_MAX_ZOOM = 20;

// Boundaries are parcel-sized — at portfolio zoom a ring is a sub-pixel smudge, and shipping
// every org's geometry to the cluster view for that is pure waste. Draw them only once the user
// has zoomed to a single building, matching the 3D-buildings reveal at zoom 15.
const BOUNDARY_MIN_ZOOM = 16;

interface MapViewProps {
  properties: (Property & { boundary?: unknown })[];
  selectedId: string | null;
  onSelectProperty: (id: string | null) => void;
  onMapLoaded?: () => void;
  /**
   * The live map, for the callers that drive it from outside (quick-add's click handler and pin
   * layer). Typed as either renderer because which one exists depends on `isSatellite`.
   */
  onMapReady?: (map: AnyMap) => void;
  isSatellite?: boolean;
  className?: string;
}

export function MapView({
  properties,
  selectedId,
  onSelectProperty,
  onMapLoaded,
  onMapReady,
  isSatellite = false,
  className,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AnyMap | null>(null);
  const activeMarkersRef = useRef<Map<string, AnyMarker>>(new Map());
  const pinMarkersRef = useRef<Map<string, AnyMarker>>(new Map());
  const clusterIndex = useRef<Supercluster | null>(null);
  // Latest properties, so the map's own event handlers (bound once, in the init effect) never read
  // a stale closure — same reason isDark/isSatellite keep refs. A property created after mount must
  // be findable by updateClusters, which is called from map `move` long after that first render.
  const propertiesRef = useRef(properties);
  propertiesRef.current = properties;

  // Boundary geometry as a single FeatureCollection, derived from propertiesRef at draw time rather
  // than captured at mount — a boundary uploaded after mount must appear without remounting the map.
  // Only properties that actually carry geometry: a null-geometry feature is a Mapbox warning per
  // frame for no visual result.
  function boundaryData(): GeoJSON.FeatureCollection {
    return {
      type: "FeatureCollection",
      features: propertiesRef.current
        .filter((p) => p.boundary)
        .map((p) => ({
          type: "Feature" as const,
          properties: { id: p.id },
          geometry: p.boundary as GeoJSON.Geometry,
        })),
    };
  }
  const exitingMarkersRef = useRef<
    Map<string, { marker: AnyMarker; timeout: ReturnType<typeof setTimeout> }>
  >(new Map());
  const { isDark } = useShellContext();
  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;
  const isSatelliteRef = useRef(isSatellite);
  isSatelliteRef.current = isSatellite;

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Which renderer this mount uses. Read ONCE, at mount: the map object is created here and only
    // re-created by a full remount, which is what the satellite toggle triggers (via `key`). A style
    // swap cannot cross renderers, so this is deliberately not reactive.
    const useMapbox = !isSatelliteRef.current;

    if (useMapbox) {
      // Mapbox draws its own style URL; there is no session token to wait for, so no blank-style
      // phase and no swap. `mapbox-gl` needs the token on the module, not per map.
      mapboxgl.accessToken = env.NEXT_PUBLIC_MAPBOX_TOKEN;
    }
    // MapLibre's worker URL is configured in basemap.ts at module scope, not here — see the note
    // there on why a per-mount call races the module's own initialisation.

    // Build cluster index once. `maxZoom` matches the map's own ceiling — see MAP_MAX_ZOOM.
    const index = new Supercluster({ radius: 60, maxZoom: MAP_MAX_ZOOM });
    index.load(
      propertiesRef.current.map((p) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
        properties: { id: p.id },
      }))
    );
    clusterIndex.current = index;

    // Both renderers take the same camera options; only the style differs.
    const camera = {
      container: containerRef.current,
      center: CAMBODIA_CENTER,
      zoom: CAMBODIA_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      pitch: 45,
      bearing: -17.6,
    };

    const map: AnyMap = useMapbox
      ? new mapboxgl.Map({ ...camera, style: mapboxStyle(isDarkRef.current), attributionControl: false })
      : new MapLibreMap({ ...camera, style: placeholderStyle(isDarkRef.current) });

    // `Map` is a union of two classes whose overloaded methods do not merge, so `on`/`off`/`addControl`
    // are addressed through one renderer's type. At runtime both libraries implement this surface
    // identically, and which one is really there is already decided by `useMapbox` above. This is the
    // single narrowing point for the whole mount, matching boundary-layer.ts's `sourceOf`.
    const m = map as MapLibreMap;

    if (useMapbox) {
      (map as mapboxgl.Map).addControl(
        new mapboxgl.AttributionControl({ compact: true }),
        ATTRIBUTION_POSITION,
      );
    } else {
      m.addControl(new AttributionControl({ compact: true }), ATTRIBUTION_POSITION);
    }
    mapRef.current = map;
    let destroyed = false;

    // Satellite only: Google's session token is an async round trip, so the basemap is swapped in
    // after the map exists. The `style.load` handler below is what makes that swap safe: it re-adds
    // the boundary layer and the pins, which is the same path a theme switch already used.
    if (!useMapbox) {
      googleSession("satellite")
        .then((session) => {
          if (destroyed || mapRef.current !== map) return;
          m.setStyle(basemapStyle("satellite", isDarkRef.current, session));
        })
        .catch((err) => {
          // Blank basemap, still usable: pins and boundaries draw regardless. Same posture as
          // PropertyLocationMap's no-WebGL fallback. Logged rather than swallowed — this catch also
          // wraps `setStyle`, and a silent failure there is indistinguishable from a slow basemap.
          console.error("[MapView] satellite basemap failed", err);
        });
    }

    m.on("load", () => {
      if (destroyed) return;
      addBoundaries(m);
      onMapLoaded?.();
      onMapReady?.(map);
      updateClusters(m);
    });

    m.on("move", () => {
      if (destroyed) return;
      updateClusters(m);
    });

    m.on("style.load", () => {
      if (destroyed) return;
      addBoundaries(m);
      clearMarkers();
      updateClusters(m);
    });

    return () => {
      destroyed = true;
      clearMarkers();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A theme switch, Mapbox only. Its style is a URL, so a theme change is one `setStyle` call.
  // Satellite is not re-styled: Google has no dark variant, and the satellite toggle remounts the map
  // (see the `key` in HomePage) rather than swapping its style.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || isSatelliteRef.current) return;
    (map as mapboxgl.Map).setStyle(mapboxStyle(isDark));
  }, [isDark]);

  // Rebuild the cluster index when the property set changes — a property created by Quick Add lands
  // in the list but not in the index built on mount, so it would be in the sidebar and invisible on
  // the map. updateClusters then diffs the new cluster set against the visible markers, which adds
  // the new pin and animates the removed ones out.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !clusterIndex.current) return;
    clusterIndex.current.load(
      properties.map((p) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
        properties: { id: p.id },
      }))
    );
    updateClusters(map);
    // updateClusters is redeclared every render; depending on it would loop. The property list is
    // the only real input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties]);

  // Update marker highlight when selectedId changes
  useEffect(() => {
    pinMarkersRef.current.forEach((marker, id) => {
      const el = marker.getElement().querySelector<HTMLElement>("[data-pin]");
      if (!el) return;
      if (id === selectedId) {
        el.style.transform = "scale(1.5)";
        // color-mix, not rgba(): `rgba(var(--x), 0.35)` is invalid CSS — custom properties are
        // substituted as raw token streams, so the ring silently never rendered and a selected pin
        // had no indicator beyond its own 1.5× scale. Every other token-based shadow in
        // styles/theme.css uses this form for the same reason.
        el.style.boxShadow =
          "0 0 0 4px color-mix(in srgb, var(--interactive-primary) 35%, transparent)";
        el.setAttribute("data-selected", "true");
      } else {
        el.style.transform = "scale(1)";
        el.style.boxShadow = "";
        el.removeAttribute("data-selected");
      }
    });
  }, [selectedId]);

  function createClusterElement(count: number): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "width:36px; height:36px; cursor:pointer;";

    // Inner container owns position:relative so the ring can use position:absolute
    // The outer wrapper is left untouched so Mapbox can position it freely
    const inner = document.createElement("div");
    inner.style.cssText = "position:relative; width:36px; height:36px;";

    const ring = document.createElement("div");
    ring.style.cssText = `
      position: absolute; inset: -4px; border-radius: 50%;
      border: 2px solid var(--color-interactive-primary, #2563eb);
      animation: cluster-ring-pulse 650ms cubic-bezier(0.16, 1, 0.3, 1) both;
      pointer-events: none;
    `;

    const circle = document.createElement("div");
    circle.setAttribute("data-cluster-circle", "true");
    circle.style.cssText = `
      width: 36px; height: 36px; border-radius: 50%;
      border: 2px solid var(--color-surface-base, #fff);
      background: var(--color-interactive-primary, #2563eb);
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
      transition: transform 150ms ease;
    `;
    circle.innerHTML = `<span style="color:#fff;font-size:11px;font-weight:600;line-height:1;pointer-events:none;">${count > 99 ? "99+" : count}</span>`;

    inner.appendChild(ring);
    inner.appendChild(circle);
    wrapper.appendChild(inner);
    wrapper.addEventListener("mouseenter", () => {
      circle.style.transform = "scale(1.15)";
    });
    wrapper.addEventListener("mouseleave", () => {
      circle.style.transform = "scale(1)";
    });
    return wrapper;
  }

  function createPinElement(p: Property): { wrapper: HTMLElement } {
    const pin = document.createElement("div");
    pin.setAttribute("data-pin", "true");
    pin.style.cssText = `
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 2px solid var(--color-surface-base, #fff);
      background: var(--color-interactive-primary, #2563eb);
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      transition: transform 200ms ease, box-shadow 200ms ease;
    `;

    const tooltip = document.createElement("div");
    tooltip.style.cssText = `
      position: absolute;
      left: 50%;
      bottom: calc(100% + 8px);
      transform: translateX(-50%);
      background: var(--color-glass-panel-fill, rgba(255,255,255,0.85));
      backdrop-filter: blur(12px);
      border: 1px solid var(--color-glass-panel-border, rgba(0,0,0,0.1));
      border-radius: 6px;
      padding: 3px 8px;
      font-size: 12px;
      color: var(--color-foreground, #111);
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 150ms ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      z-index: 10;
    `;
    tooltip.textContent = p.name;

    const wrapper = document.createElement("div");
    wrapper.style.cssText = "width: 16px; height: 16px;";
    wrapper.appendChild(tooltip);
    wrapper.appendChild(pin);

    pin.addEventListener("mouseenter", () => {
      tooltip.style.opacity = "1";
      if (!pin.hasAttribute("data-selected")) {
        pin.style.transform = "scale(1.4)";
      }
    });
    pin.addEventListener("mouseleave", () => {
      tooltip.style.opacity = "0";
      if (!pin.hasAttribute("data-selected")) {
        pin.style.transform = "scale(1)";
      }
    });
    pin.addEventListener("click", (e) => {
      e.stopPropagation();
      onSelectProperty(p.id);
    });

    return { wrapper };
  }

  // Tear every marker out of the map, including the ones mid-exit. Clearing the refs alone is not
  // enough: `setStyle` leaves marker DOM in the canvas container untouched, so a bare `.clear()`
  // orphans those elements — they stay drawn on the map with nothing holding a handle to remove
  // them, and the next updateClusters stacks a fresh marker on top. That is the glitch: duplicates
  // that never go away, one more per style switch.
  function clearMarkers() {
    exitingMarkersRef.current.forEach((e) => {
      clearTimeout(e.timeout);
      e.marker.remove();
    });
    exitingMarkersRef.current.clear();
    activeMarkersRef.current.forEach((m) => m.remove());
    activeMarkersRef.current.clear();
    pinMarkersRef.current.clear();
  }

  function updateClusters(map: AnyMap) {
    if (!clusterIndex.current) return;

    const ml = map as MapLibreMap;
    const Mk = MarkerFor(map);
    const LL = LngLatFor(map);

    const bounds = ml.getBounds();
    if (!bounds) return;
    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ];
    const zoom = Math.floor(ml.getZoom());
    const clusters = clusterIndex.current.getClusters(bbox, zoom);

    // Determine which keys should be visible
    const nextKeys = new Set<string>();
    for (const f of clusters) {
      nextKeys.add(
        f.properties.cluster
          ? `cluster-${f.properties.cluster_id}`
          : `point-${f.properties.id}`
      );
    }

    const canvas = ml.getCanvas();

    // Returns true if a lngLat is outside or within 40px of the viewport edge.
    // canvas.clientWidth/clientHeight are CSS pixels — same space as map.project() output.
    // canvas.width/height are physical pixels (2× on retina) and must not be used here.
    const EDGE_BUFFER = 40;
    const isOffScreen = (lngLat: MapLibreLngLat) => {
      const { x, y } = ml.project(lngLat);
      return (
        x < EDGE_BUFFER ||
        x > canvas.clientWidth - EDGE_BUFFER ||
        y < EDGE_BUFFER ||
        y > canvas.clientHeight - EDGE_BUFFER
      );
    };

    // Nearest incoming cluster within 350px — returns pre-computed pixel delta or null.
    // When zooming in, the splitting cluster has no nearby absorbing cluster → returns null.
    // When zooming out, the absorbing cluster is nearby → returns delta.
    // Skips target clusters that are off-screen so edge pins don't fly off the viewport.
    const nearestIncomingCluster = (lngLat: MapLibreLngLat): { dx: number; dy: number } | null => {
      const fromPx = ml.project(lngLat);
      let bestDx = 0, bestDy = 0, minSq = Infinity;
      for (const f of clusters) {
        if (!f.properties.cluster) continue;
        const toPx = ml.project(f.geometry.coordinates as [number, number]);
        if (toPx.x < 0 || toPx.x > canvas.clientWidth || toPx.y < 0 || toPx.y > canvas.clientHeight) continue;
        const dx = toPx.x - fromPx.x;
        const dy = toPx.y - fromPx.y;
        const sq = dx * dx + dy * dy;
        if (sq < minSq) { minSq = sq; bestDx = dx; bestDy = dy; }
      }
      return minSq <= 350 * 350 ? { dx: bestDx, dy: bestDy } : null;
    };

    // Nearest exiting cluster within 350px — used for emerge-from-cluster entrance animations.
    // exitingMarkersRef is already populated for this frame before this loop runs.
    const nearestExitingCluster = (lngLat: MapLibreLngLat): { dx: number; dy: number } | null => {
      const toPx = ml.project(lngLat);
      let bestDx = 0, bestDy = 0, minSq = Infinity;
      for (const [key, entry] of exitingMarkersRef.current) {
        if (!key.startsWith("cluster-")) continue;
        const fromPx = ml.project(entry.marker.getLngLat() as unknown as [number, number]);
        const dx = fromPx.x - toPx.x;
        const dy = fromPx.y - toPx.y;
        const sq = dx * dx + dy * dy;
        if (sq < minSq) { minSq = sq; bestDx = dx; bestDy = dy; }
      }
      return minSq <= 350 * 350 ? { dx: bestDx, dy: bestDy } : null;
    };

    // Animate out stale markers
    for (const [key, marker] of activeMarkersRef.current) {
      if (!nextKeys.has(key) && !exitingMarkersRef.current.has(key)) {
        activeMarkersRef.current.delete(key);
        const isPin = key.startsWith("point-");
        const markerEl = marker.getElement();
        const innerEl = markerEl.querySelector<HTMLElement>(
          isPin ? "[data-pin]" : "[data-cluster-circle]"
        );
        if (innerEl) {
          const lngLat = marker.getLngLat() as unknown as MapLibreLngLat;
          const offScreen = isOffScreen(lngLat);
          if (!offScreen) {
            const target = nearestIncomingCluster(lngLat);
            if (isPin && target) {
              innerEl.style.setProperty("--pin-tx", `${target.dx}px`);
              innerEl.style.setProperty("--pin-ty", `${target.dy}px`);
              innerEl.style.animation = "pin-converge-exit 220ms cubic-bezier(0.4, 0, 1, 1) both";
            } else if (!isPin && target) {
              innerEl.style.setProperty("--cluster-tx", `${target.dx}px`);
              innerEl.style.setProperty("--cluster-ty", `${target.dy}px`);
              innerEl.style.animation = "cluster-converge-exit 220ms cubic-bezier(0.4, 0, 1, 1) both";
            } else {
              innerEl.style.animation = isPin
                ? "pin-exit 180ms cubic-bezier(0.4, 0, 1, 1) both"
                : "cluster-exit 220ms cubic-bezier(0.4, 0, 1, 1) both";
            }
          } else {
            innerEl.style.animation = isPin
              ? "pin-exit 180ms cubic-bezier(0.4, 0, 1, 1) both"
              : "cluster-exit 220ms cubic-bezier(0.4, 0, 1, 1) both";
          }
        }
        const timeout = setTimeout(() => {
          marker.remove();
          exitingMarkersRef.current.delete(key);
          if (isPin) {
            pinMarkersRef.current.delete(key.replace("point-", ""));
          }
        }, 220);
        exitingMarkersRef.current.set(key, { marker, timeout });
      }
    }

    // Add new markers
    for (const f of clusters) {
      const isCluster = f.properties.cluster;
      const key = isCluster
        ? `cluster-${f.properties.cluster_id}`
        : `point-${f.properties.id}`;

      // Already visible — skip
      if (activeMarkersRef.current.has(key)) continue;

      // Currently exiting — cancel exit and revive
      if (exitingMarkersRef.current.has(key)) {
        const entry = exitingMarkersRef.current.get(key)!;
        clearTimeout(entry.timeout);
        exitingMarkersRef.current.delete(key);
        const innerEl = entry.marker.getElement().querySelector<HTMLElement>(
          "[data-cluster-circle], [data-pin]"
        );
        if (innerEl) innerEl.style.animation = "";
        activeMarkersRef.current.set(key, entry.marker);
        if (key.startsWith("point-")) {
          const id = key.replace("point-", "");
          pinMarkersRef.current.set(id, entry.marker);
        }
        continue;
      }

      const [lng, lat] = f.geometry.coordinates;

      if (isCluster) {
        const el = createClusterElement(f.properties.point_count);
        const circle = el.querySelector<HTMLElement>("[data-cluster-circle]");
        if (circle) {
          const origin = nearestExitingCluster(new LL(lng, lat));
          if (origin) {
            circle.style.setProperty("--cluster-ox", `${origin.dx}px`);
            circle.style.setProperty("--cluster-oy", `${origin.dy}px`);
            circle.style.animation = "cluster-emerge 400ms cubic-bezier(0.16, 1, 0.3, 1) both";
          } else {
            circle.style.animation = "cluster-appear 380ms cubic-bezier(0.16, 1, 0.3, 1) both";
          }
        }
        const m = new Mk({ element: el, anchor: "center" })
          .setLngLat([lng, lat])
          .addTo(map);
        el.addEventListener("click", () => {
          const expansion = clusterIndex.current!.getClusterExpansionZoom(f.properties.cluster_id);
          // Expansion zoom above the ceiling means the cluster can never split — every member sits
          // on the same coordinate (8 Olympic units in the seed do). Easing to a clamped zoom would
          // be a no-op, leaving those properties unreachable on the map. Select the first member
          // instead, so the badge still opens the drawer.
          // ponytail: opens the first member only; the co-located swipe cards are the real design.
          if (expansion > MAP_MAX_ZOOM) {
            const first = clusterIndex.current!.getLeaves(f.properties.cluster_id, 1)[0];
            if (first) {
              onSelectProperty((first.properties as { id: string }).id);
              return;
            }
          }
          const z = Math.min(expansion, MAP_MAX_ZOOM);
          map.easeTo({ center: [lng, lat], zoom: z });
        });
        activeMarkersRef.current.set(key, m);
      } else {
        const property = propertiesRef.current.find((p) => p.id === f.properties.id)!;
        const { wrapper } = createPinElement(property);
        const pin = wrapper.querySelector<HTMLElement>("[data-pin]");
        if (pin) {
          const origin = nearestExitingCluster(new LL(lng, lat));
          const delay = Math.floor(Math.random() * 80);
          if (origin) {
            pin.style.setProperty("--pin-ox", `${origin.dx}px`);
            pin.style.setProperty("--pin-oy", `${origin.dy}px`);
            pin.style.animation = `pin-emerge 300ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms both`;
          } else {
            pin.style.animation = `pin-appear 280ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms both`;
          }
        }
        const m = new Mk({ element: wrapper, anchor: "center" })
          .setLngLat([lng, lat])
          .addTo(map);
        activeMarkersRef.current.set(key, m);
        pinMarkersRef.current.set(property.id, m);
      }
    }
  }

  // 3D buildings used to be drawn here from Mapbox's `composite` vector source. Google's 2D Map
  // Tiles are raster, so there is no building source layer to extrude from and no vector source at
  // all — the function had no reachable path, so it is gone rather than left disabled. Restoring it
  // needs a vector basemap alongside the raster imagery, which is a product decision, not a flag.

  // Portfolio boundaries live in ONE source with a minzoom, not one layer per property: they share
  // a style and are invisible below BOUNDARY_MIN_ZOOM, so N layers would be N× the style
  // bookkeeping for identical pixels.
  function addBoundaries(map: AnyMap) {
    addBoundaryLayer(map, null, { minZoom: BOUNDARY_MIN_ZOOM });
    const src = (map as MapLibreMap).getSource(BOUNDARY_SOURCE_ID) as GeoJSONSource | undefined;
    src?.setData(boundaryData());
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
