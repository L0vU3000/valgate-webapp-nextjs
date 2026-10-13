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
import { boundarySides, formatMeters, ringSpanM, type ParcelMeasurement, type ParcelSide } from "@/lib/data/derivations/boundary-sides";
import type { BoundaryGeometry } from "@/lib/data/types/land-parcel";
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

/**
 * The marker class for whichever renderer is mounted. Both implement the {@link AnyMarker} surface.
 *
 * The rotation options are part of that shared surface too — the same knobs came from the same
 * lineage — and the side-length labels need them: a label floats upright above its edge rather than
 * being written into the map's tilted plane, which is what `rotationAlignment`/`pitchAlignment`
 * control. {@link LngLatFor} is the other half of the same seam.
 */
function MarkerFor(map: AnyMap): new (opts: {
  element: HTMLElement;
  anchor: string;
  rotation?: number;
  rotationAlignment?: "map" | "viewport" | "auto";
  pitchAlignment?: "map" | "viewport" | "auto";
}) => AnyMarker {
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

/**
 * A ring is labelled once it covers this much of the screen. Close enough per parcel, not per zoom:
 * a 300 m parcel is readable when a 40 m one is still a smudge.
 */
const LABEL_MIN_SPAN_PX = 80;

/** Metres per pixel at zoom 0 on the equator, for a 512-px tile — the standard Web Mercator scale. */
const METRES_PER_PIXEL_Z0 = 78271.516964;

/**
 * Zoom a pin tap eases to. 17 is one step past the boundary layer's minzoom, so the parcel's ring is
 * on screen after the tap and the pin keeps its surroundings — the cluster path eases to a similar
 * range via Supercluster's expansion zoom, so a tap behaves the same way whether it hit a badge or a
 * single pin.
 */
const PIN_FOCUS_ZOOM = 17;

/** The camera HomePage carries across a terrain toggle. */
export interface MapCamera {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
}

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
  /**
   * Camera to open at. The satellite toggle REMOUNTS this component (a style swap cannot cross
   * renderers), so without this the mount default would snap the viewport back to the whole country
   * on every toggle. HomePage passes the outgoing map's camera.
   */
  initialCamera?: MapCamera;
  /**
   * The live camera, on every move. HomePage keeps it in a ref so the satellite toggle can hand the
   * outgoing viewport to the incoming renderer. Deliberately NOT `onMapReady`: that one fires from
   * the `load` handler, and a toggle must not be able to lose the viewport just because the basemap
   * has not finished loading yet (or never does).
   */
  onCameraChange?: (camera: MapCamera) => void;
  /**
   * Draw the length of each side of a parcel ring.
   *
   * A selected parcel shows its own ring only: the portfolio map carries 41 rings and 471 sides, and
   * a number on every edge buries the parcel whose card is open. With nothing selected it labels
   * every ring inside the viewport instead, so the control is not dead before a parcel is picked and
   * what you see is what is on screen. Off by default — the caller owns that state.
   */
  showMeasurements?: boolean;
  className?: string;
}

export function MapView({
  properties,
  selectedId,
  onSelectProperty,
  onMapLoaded,
  onMapReady,
  isSatellite = false,
  initialCamera,
  onCameraChange,
  showMeasurements = false,
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
  const initialCameraRef = useRef(initialCamera);
  initialCameraRef.current = initialCamera;
  const onCameraChangeRef = useRef(onCameraChange);
  onCameraChangeRef.current = onCameraChange;
  const isSatelliteRef = useRef(isSatellite);
  isSatelliteRef.current = isSatellite;

  // Side-length labels live only on the selected ring, and the pin-focus effect can change that
  // selection from a plain render — so these are read through refs by handlers bound once at mount.
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const showMeasurementsRef = useRef(showMeasurements);
  showMeasurementsRef.current = showMeasurements;
  const sideMarkersRef = useRef<AnyMarker[]>([]);

  // Initialize map
  useEffect(() => {
    // StrictMode discards its first mount immediately. Do not start Mapbox's async style/sprite
    // work for that mount: remove() cannot cancel every callback once the load has started.
    let dispose: (() => void) | undefined;
    const timer = setTimeout(() => {
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

      // Both renderers take the same camera options; only the style differs. `initialCamera` is what
      // keeps a terrain toggle seamless: this component is remounted on the toggle, and the default
      // below would otherwise rewind the viewport to the whole country.
      const opening = initialCameraRef.current;
      const camera = {
        container: containerRef.current,
        center: opening?.center ?? CAMBODIA_CENTER,
        zoom: opening?.zoom ?? CAMBODIA_ZOOM,
        maxZoom: MAP_MAX_ZOOM,
        pitch: opening?.pitch ?? 45,
        bearing: opening?.bearing ?? -17.6,
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

      // Hand the shell the map (HomePage keeps it as `mapRef`, which the zoom and recentre controls
      // drive) from whichever signal happens first: `load` usually, the first `styledata` otherwise.
      // A `load`-only handoff is a trap — a style that never finishes loading (an unloadable worker,
      // a session swap that stalls) still renders raster tiles and still looks fine, while those
      // controls go dead and the only way left to move the camera is a pinch. Runs once.
      let reported = false;
      const reportReady = () => {
        if (destroyed || reported) return;
        reported = true;
        onMapReady?.(map);
      };

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
        reportReady();
        updateClusters(m);
        updateMeasurements(m);
      });

      m.on("move", () => {
        if (destroyed) return;
        const centre = m.getCenter();
        onCameraChangeRef.current?.({
          center: [centre.lng, centre.lat],
          zoom: m.getZoom(),
          bearing: m.getBearing(),
          pitch: m.getPitch(),
        });
        updateClusters(m);
      });

      // Labels cover what is on screen, so the set has to be rebuilt when the camera settles — not
      // on `move`, where every frame would rebuild the same 40 markers.
      m.on("moveend", () => {
        if (destroyed) return;
        updateMeasurements(m);
      });

      m.on("style.load", () => {
        if (destroyed) return;
        addBoundaries(m);
        clearMarkers();
        updateClusters(m);
        updateMeasurements(m);
        reportReady();
      });

      m.on("styledata", reportReady);

      dispose = () => {
        destroyed = true;
        clearMarkers();
        clearSideMarkers();
        mapRef.current = null;
        map.remove();
      };
    }, 0);
    return () => {
      clearTimeout(timer);
      dispose?.();
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

  // Selection or toggle changed: the labels belong to one ring, so they are rebuilt rather than
  // patched. `mapRef` can be null here — the mount effect has not handed the map over yet.
  useEffect(() => {
    const live = mapRef.current;
    if (live) updateMeasurements(live);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, showMeasurements]);

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
      // Selecting from the map is also a navigation. Tapping a cluster eases to its expansion zoom;
      // tapping one of its members used to move nothing, so the pin you chose stayed wherever it
      // happened to sit while the card opened over it. Ease to the same kind of range instead.
      // `Math.max` with the current zoom means this only ever zooms IN — a tap while already closer
      // than 17 keeps the user's own zoom rather than pulling back.
      const live = mapRef.current;
      if (live) {
        live.easeTo({
          center: [p.lng, p.lat],
          zoom: Math.max(live.getZoom(), PIN_FOCUS_ZOOM),
          duration: 500,
        });
      }
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

  function clearSideMarkers() {
    sideMarkersRef.current.forEach((marker) => marker.remove());
    sideMarkersRef.current = [];
  }

  /**
   * A length label. Deliberately a DOM marker rather than a symbol layer: the Google basemap is
   * raster-only, its style carries no `glyphs`, and a text layer against a missing glyph URL renders
   * nothing at all (see basemap.ts). DOM also means the label inherits the app's own type — the same
   * metrics as the cluster count — instead of a font stack served by someone else.
   */
  function createSideLabelElement(side: ParcelSide): HTMLElement {
    const el = document.createElement("div");
    el.setAttribute("data-side-label", "true");
    el.textContent = formatMeters(side.meters);
    el.style.cssText = `
      padding: 2.4px 5.6px;
      border-radius: 4px;
      background: var(--color-surface-base, #fff);
      border: 1px solid var(--color-border-default, rgba(0,0,0,0.12));
      color: var(--color-foreground, #121c28);
      font-size: 9.6px;
      font-weight: 600;
      letter-spacing: 0.08em;
      line-height: 1.2;
      white-space: nowrap;
      pointer-events: none;
      box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    `;
    return el;
  }

  /**
   * Lengths along parcel edges. Rebuilt when the selection, the toggle, the style or the settled
   * camera changes — a marker is anchored to a coordinate, so it follows the camera for free and
   * rebuilding on every `move` frame would be the same numbers at 60 fps for nothing.
   *
   * A selected parcel shows its own ring only; with nothing selected every ring inside the viewport
   * is labelled, so the ruler covers what is on screen instead of one ring you had to guess at. The
   * labels float above their edge and stay upright — see the marker options below.
   */
  function updateMeasurements(map: AnyMap) {
    clearSideMarkers();
    if (!showMeasurementsRef.current) return;

    const selectedId = selectedIdRef.current;
    const ml = map as MapLibreMap;
    const zoom = ml.getZoom();
    const bounds = selectedId ? null : ml.getBounds();
    // How close is close enough, as screen size rather than a zoom number: the ring is labelled once
    // it covers this much of the glass, so a large parcel gets its numbers sooner than a small one.
    // Below BOUNDARY_MIN_ZOOM nothing is labelled at all — the ring itself is not drawn there, and
    // numbers over a missing outline are worse than no numbers.
    const metresPerPixel =
      (METRES_PER_PIXEL_Z0 * Math.cos((ml.getCenter().lat * Math.PI) / 180)) / 2 ** (zoom + 1);
    const Mk = MarkerFor(map);

    for (const property of propertiesRef.current) {
      if (selectedId && property.id !== selectedId) continue;
      const measurement = boundarySides(property.boundary as BoundaryGeometry | null | undefined);
      if (!measurement) continue;
      if (
        !selectedId &&
        (zoom < BOUNDARY_MIN_ZOOM || ringSpanM(measurement) / metresPerPixel < LABEL_MIN_SPAN_PX)
      ) {
        continue;
      }
      if (
        bounds &&
        !measurementInView(
          measurement,
          bounds.getWest(),
          bounds.getSouth(),
          bounds.getEast(),
          bounds.getNorth(),
        )
      ) {
        continue;
      }
      for (const side of measurement.sides) {
        const marker = new Mk({
          element: createSideLabelElement(side),
          // Anchored at its own bottom, so the chip floats above the edge rather than sitting on it.
          anchor: "bottom",
          // Floating and upright, not written on the ground: at 45° pitch the number stays readable
          // instead of lying in a tilted plane. That is why the edge bearing is no longer applied —
          // rotating the text along the edge and pinning it upright are the same knob.
          rotationAlignment: "viewport",
          pitchAlignment: "viewport",
        })
          .setLngLat([(side.a[0] + side.b[0]) / 2, (side.a[1] + side.b[1]) / 2])
          .addTo(map);
        sideMarkersRef.current.push(marker);
      }
    }
  }

  /**
   * Is any corner of the ring inside the current bounds? Corner-wise rather than a true
   * polygon-over-rectangle overlap: a parcel is far smaller than the screen at every zoom this map
   * reaches, so a ring that clips the edge still has a corner in view.
   */
  function measurementInView(
    measurement: ParcelMeasurement,
    west: number,
    south: number,
    east: number,
    north: number,
  ): boolean {
    return measurement.sides.some(
      ({ a, b }) =>
        (a[0] >= west && a[0] <= east && a[1] >= south && a[1] <= north) ||
        (b[0] >= west && b[0] <= east && b[1] >= south && b[1] <= north),
    );
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
