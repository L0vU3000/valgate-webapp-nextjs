"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Supercluster from "supercluster";
import { env } from "@/lib/env";
import { useShellContext } from "@/components/layout/shell-context";
import type { Property } from "@/lib/data/types/property";

const CAMBODIA_CENTER: [number, number] = [104.9, 12.5];
const CAMBODIA_ZOOM = 7;

interface MapViewProps {
  properties: Property[];
  selectedId: string | null;
  onSelectProperty: (id: string | null) => void;
  onMapLoaded?: () => void;
  onMapReady?: (map: mapboxgl.Map) => void;
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
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const activeMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const pinMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const clusterIndex = useRef<Supercluster | null>(null);
  const exitingMarkersRef = useRef<
    Map<string, { marker: mapboxgl.Marker; timeout: ReturnType<typeof setTimeout> }>
  >(new Map());
  const { isDark } = useShellContext();
  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;
  const isSatelliteRef = useRef(isSatellite);
  isSatelliteRef.current = isSatellite;

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = env.NEXT_PUBLIC_MAPBOX_TOKEN;

    // Build cluster index once
    const index = new Supercluster({ radius: 60, maxZoom: 14 });
    index.load(
      properties.map((p) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
        properties: { id: p.id },
      }))
    );
    clusterIndex.current = index;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: isSatellite
        ? "mapbox://styles/mapbox/satellite-streets-v12"
        : isDark
          ? "mapbox://styles/mapbox/dark-v11"
          : "mapbox://styles/mapbox/light-v11",
      center: CAMBODIA_CENTER,
      zoom: CAMBODIA_ZOOM,
      pitch: 45,
      bearing: -17.6,
      antialias: true,
    });

    mapRef.current = map;
    let destroyed = false;

    map.on("load", () => {
      if (destroyed) return;
      add3DBuildings(map);
      onMapLoaded?.();
      onMapReady?.(map);
      updateClusters(map);
    });

    map.on("move", () => {
      if (destroyed) return;
      updateClusters(map);
    });

    map.on("style.load", () => {
      if (destroyed) return;
      add3DBuildings(map);
      exitingMarkersRef.current.forEach(e => { clearTimeout(e.timeout); e.marker.remove(); });
      exitingMarkersRef.current.clear();
      activeMarkersRef.current.clear();
      pinMarkersRef.current.clear();
      updateClusters(map);
    });

    return () => {
      destroyed = true;
      map.remove();
      exitingMarkersRef.current.forEach(e => { clearTimeout(e.timeout); e.marker.remove(); });
      exitingMarkersRef.current.clear();
      activeMarkersRef.current.clear();
      pinMarkersRef.current.clear();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch style when theme or satellite mode changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const style = isSatellite
      ? "mapbox://styles/mapbox/satellite-streets-v12"
      : isDark
        ? "mapbox://styles/mapbox/dark-v11"
        : "mapbox://styles/mapbox/light-v11";
    map.setStyle(style);
  }, [isDark, isSatellite]);

  // Update marker highlight when selectedId changes
  useEffect(() => {
    pinMarkersRef.current.forEach((marker, id) => {
      const el = marker.getElement().querySelector<HTMLElement>("[data-pin]");
      if (!el) return;
      if (id === selectedId) {
        el.style.transform = "scale(1.5)";
        el.style.boxShadow = "0 0 0 4px rgba(var(--color-interactive-primary), 0.35)";
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

  function updateClusters(map: mapboxgl.Map) {
    if (!clusterIndex.current) return;

    const bounds = map.getBounds();
    if (!bounds) return;
    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ];
    const zoom = Math.floor(map.getZoom());
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

    const canvas = map.getCanvas();

    // Returns true if a lngLat is outside or within 40px of the viewport edge.
    // canvas.clientWidth/clientHeight are CSS pixels — same space as map.project() output.
    // canvas.width/height are physical pixels (2× on retina) and must not be used here.
    const EDGE_BUFFER = 40;
    const isOffScreen = (lngLat: mapboxgl.LngLat) => {
      const { x, y } = map.project(lngLat);
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
    const nearestIncomingCluster = (lngLat: mapboxgl.LngLat): { dx: number; dy: number } | null => {
      const fromPx = map.project(lngLat);
      let bestDx = 0, bestDy = 0, minSq = Infinity;
      for (const f of clusters) {
        if (!f.properties.cluster) continue;
        const toPx = map.project(f.geometry.coordinates as [number, number]);
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
    const nearestExitingCluster = (lngLat: mapboxgl.LngLat): { dx: number; dy: number } | null => {
      const toPx = map.project(lngLat);
      let bestDx = 0, bestDy = 0, minSq = Infinity;
      for (const [key, entry] of exitingMarkersRef.current) {
        if (!key.startsWith("cluster-")) continue;
        const fromPx = map.project(entry.marker.getLngLat());
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
          const lngLat = marker.getLngLat();
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
          const origin = nearestExitingCluster(new mapboxgl.LngLat(lng, lat));
          if (origin) {
            circle.style.setProperty("--cluster-ox", `${origin.dx}px`);
            circle.style.setProperty("--cluster-oy", `${origin.dy}px`);
            circle.style.animation = "cluster-emerge 400ms cubic-bezier(0.16, 1, 0.3, 1) both";
          } else {
            circle.style.animation = "cluster-appear 380ms cubic-bezier(0.16, 1, 0.3, 1) both";
          }
        }
        const m = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat([lng, lat])
          .addTo(map);
        el.addEventListener("click", () => {
          const z = Math.min(
            clusterIndex.current!.getClusterExpansionZoom(f.properties.cluster_id),
            20
          );
          map.easeTo({ center: [lng, lat], zoom: z });
        });
        activeMarkersRef.current.set(key, m);
      } else {
        const property = properties.find((p) => p.id === f.properties.id)!;
        const { wrapper } = createPinElement(property);
        const pin = wrapper.querySelector<HTMLElement>("[data-pin]");
        if (pin) {
          const origin = nearestExitingCluster(new mapboxgl.LngLat(lng, lat));
          const delay = Math.floor(Math.random() * 80);
          if (origin) {
            pin.style.setProperty("--pin-ox", `${origin.dx}px`);
            pin.style.setProperty("--pin-oy", `${origin.dy}px`);
            pin.style.animation = `pin-emerge 300ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms both`;
          } else {
            pin.style.animation = `pin-appear 280ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms both`;
          }
        }
        const m = new mapboxgl.Marker({ element: wrapper, anchor: "center" })
          .setLngLat([lng, lat])
          .addTo(map);
        activeMarkersRef.current.set(key, m);
        pinMarkersRef.current.set(property.id, m);
      }
    }
  }

  function add3DBuildings(map: mapboxgl.Map) {
    if (isSatelliteRef.current) return;
    // Skip if layer already exists (e.g. called twice on style reload)
    if (map.getLayer("3d-buildings")) return;

    map.addLayer({
      id: "3d-buildings",
      source: "composite",
      "source-layer": "building",
      type: "fill-extrusion",
      minzoom: 15,
      paint: {
        "fill-extrusion-color": isDarkRef.current ? "#1e2235" : "#c8cdd6",
        // Animate buildings rising from the ground as the user zooms past zoom 15
        "fill-extrusion-height": [
          "interpolate", ["linear"], ["zoom"],
          15, 0,
          15.05, ["get", "height"],
        ],
        "fill-extrusion-base": [
          "interpolate", ["linear"], ["zoom"],
          15, 0,
          15.05, ["get", "min_height"],
        ],
        "fill-extrusion-opacity": isDarkRef.current ? 0.7 : 0.5,
      },
    });
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
