"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { ringAreaM2 } from "@/lib/utils/geo";

/**
 * Click-to-draw, and drag-to-edit, a land boundary on a Mapbox map.
 *
 * No draw library. What this needs is: collect clicks, draw a polygon, move a vertex, insert a vertex
 * on an edge, remove one. `@mapbox/mapbox-gl-draw` is ~100 kB and brings
 * its own styles, modes and event bus to do the same. Wrong trade today — but if general snapping or
 * multi-shape editing is ever wanted, that is the moment to reach for it.
 *
 * CONTROLLED: the ring lives in the parent, so undo / cancel / save sit beside that state rather than
 * behind a ref handle. This component only draws what it is given and reports edits back.
 *
 * The ring is [lng, lat] pairs — the same order the KMZ parser yields, so it feeds the same server
 * path rather than a parallel one.
 *
 * TWO MODES:
 *   draw — a click appends a corner; clicking near the first corner finishes the ring.
 *   edit — the ring exists. A click near an EDGE inserts a corner there; drag a handle to move one;
 *          hover a handle and click its minus to remove one. A click in open ground does nothing,
 *          because "add a corner at the end of the list" is meaningless when the list is the shape.
 *
 * MARKER LIFECYCLE, and why it is split across two effects. Handles are created only when the CORNER
 * COUNT changes, and their positions are pushed in afterwards. Rebuilding them whenever `points`
 * changed — the obvious version — tears the marker down mid-drag: `dragend` updates the ring, the
 * rebuild replaces the element the browser is still dragging, and the corner snaps back or lands
 * somewhere between. That is the drift. Creation is keyed on `count`; movement is imperative.
 */

const SRC = "valgate-draw";
const FILL = "valgate-draw-fill";
const LINE = "valgate-draw-line";
const PREVIEW = "valgate-draw-preview";

/** How near an edge a click must land to count as "insert a corner here", in screen pixels. */
const EDGE_HIT_PX = 14;

/**
 * The handle's box. Deliberately larger than the dot it draws.
 *
 * The remove badge sits ABOVE the dot, so with a dot-sized box the pointer crosses out of the element
 * on its way to the badge, `mouseleave` fires, the badge hides itself, and it can never be clicked.
 * A box that contains both keeps the hover alive across the whole gesture. The extra area also gives
 * a comfortable grab target, and blocks accidental edge-inserts right next to a corner.
 */
const HANDLE_PX = 30;
const DOT_PX = 14;

/**
 * Write the ring to the map's draw source, creating the source and layers on first call.
 *
 * One place builds the geometry, so the shape drawn on a click, on a drag and on a re-render are the
 * same shape. `[lng, lat]` pairs, closed with the first position because a GeoJSON polygon must be.
 */
function paintRing(map: mapboxgl.Map, pts: number[][]) {
  const features: GeoJSON.Feature[] =
    pts.length >= 3
      ? [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[...pts, pts[0]]] } }]
      : pts.length === 2
        ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: pts } }]
        : [];
  const data: GeoJSON.FeatureCollection = { type: "FeatureCollection", features };

  const src = map.getSource(SRC) as mapboxgl.GeoJSONSource | undefined;
  if (src) {
    src.setData(data);
    return;
  }
  map.addSource(SRC, { type: "geojson", data });
  map.addLayer({
    id: FILL, type: "fill", source: SRC,
    paint: { "fill-color": "#2563eb", "fill-opacity": 0.15 },
  });
  map.addLayer({
    id: LINE, type: "line", source: SRC,
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": "#2563eb", "line-width": 2, "line-dasharray": [2, 1] },
  });
}

/** The ring with corner `i` moved to `p`. */
function withCorner(pts: number[][], i: number, p: [number, number]): number[][] {
  const out = [...pts];
  out[i] = p;
  return out;
}

export type DrawMode = "draw" | "edit";

export type DrawProps = {
  map: mapboxgl.Map | null;
  enabled: boolean;
  mode?: DrawMode;
  /** The ring so far, in order. Empty when nothing has been placed. */
  points: number[][];
  onChange: (points: number[][]) => void;
  /** Live area of the ring in m², or null below 3 corners. Called as corners are added and dragged. */
  onArea?: (areaM2: number | null) => void;
  onFinish?: () => void;
};

/** Perpendicular distance from `p` to segment `a`–`b`, in the same units as the inputs (pixels). */
function distanceToSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  // Clamp the projection to the segment, so the distance to an ENDPOINT is measured to that endpoint.
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Index of the edge nearest the click, or null if the click was not near any edge. */
function nearestEdgeIndex(
  map: mapboxgl.Map,
  points: number[][],
  click: { x: number; y: number },
): number | null {
  if (points.length < 2) return null;
  const px = points.map((p) => map.project(p as [number, number]));
  let best: number | null = null;
  let bestDist = Infinity;
  for (let i = 0; i < px.length; i++) {
    const d = distanceToSegment(click, px[i], px[(i + 1) % px.length]);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return bestDist <= EDGE_HIT_PX ? best : null;
}

export function DrawBoundaryTool({ map, enabled, mode = "draw", points, onChange, onArea, onFinish }: DrawProps) {
  // Latest values, so the handlers bound once below never read a stale closure.
  const pointsRef = useRef(points);
  pointsRef.current = points;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const count = points.length;

  // ── Clicks on the map ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!map || !enabled) return;
    const canvas = map.getCanvas();
    // Edges advertise insertion with `copy`; handles override the canvas with `grab`.
    canvas.style.cursor = "crosshair";
    map.addSource(PREVIEW, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({
      id: PREVIEW, type: "line", source: PREVIEW,
      paint: { "line-color": "#2563eb", "line-width": 2, "line-dasharray": [2, 1] },
    });
    const onMove = (e: mapboxgl.MapMouseEvent) => {
      const pts = pointsRef.current;
      canvas.style.cursor = modeRef.current === "edit" && nearestEdgeIndex(map, pts, e.point) !== null
        ? "copy" : "crosshair";
      (map.getSource(PREVIEW) as mapboxgl.GeoJSONSource).setData({
        type: "FeatureCollection",
        features: modeRef.current === "draw" && pts.length ? [{
          type: "Feature", properties: {},
          geometry: { type: "LineString", coordinates: [pts[pts.length - 1], [e.lngLat.lng, e.lngLat.lat]] },
        }] : [],
      });
    };
    const clearPreview = () => {
      (map.getSource(PREVIEW) as mapboxgl.GeoJSONSource).setData({ type: "FeatureCollection", features: [] });
    };
    // The remove gesture is a badge click, not a double-click, so Mapbox's double-click zoom is only
    // a hazard; disabling it stops an accidental zoom-out mid-edit.
    const dblWasEnabled = map.doubleClickZoom.isEnabled();
    map.doubleClickZoom.disable();

    const onClick = (e: mapboxgl.MapMouseEvent) => {
      // A click on a handle is a grab or a removal, not a new corner. Markers are siblings of the
      // canvas, so Mapbox still fires the map handler — the event's target being inside a marker is
      // how the two are told apart.
      const target = e.originalEvent.target as HTMLElement | null;
      if (modeRef.current === "draw" && pointsRef.current.length >= 3 && !target?.closest("button")) {
        const first = map.project(pointsRef.current[0] as [number, number]);
        if (Math.hypot(first.x - e.point.x, first.y - e.point.y) <= 12) {
          markersRef.current[0]?.getElement().firstElementChild?.animate(
            [{ outline: "3px solid #2563eb", outlineOffset: "3px" }, { outline: "0px solid transparent", outlineOffset: "6px" }],
            { duration: 200 },
          );
          clearPreview();
          onFinishRef.current?.();
          return;
        }
      }
      if (target?.closest?.(".mapboxgl-marker")) return;

      if (modeRef.current === "draw") {
        onChangeRef.current([...pointsRef.current, [e.lngLat.lng, e.lngLat.lat]]);
        return;
      }
      // Edit: insert on the nearest edge — after it, so the ring's order is preserved.
      const i = nearestEdgeIndex(map, pointsRef.current, e.point);
      if (i === null) return;
      const out = [...pointsRef.current];
      out.splice(i + 1, 0, [e.lngLat.lng, e.lngLat.lat]);
      onChangeRef.current(out);
    };
    map.on("click", onClick);
    map.on("mousemove", onMove);
    map.on("mouseout", clearPreview);

    return () => {
      map.off("click", onClick);
      map.off("mousemove", onMove);
      map.off("mouseout", clearPreview);
      if (map.getLayer(PREVIEW)) map.removeLayer(PREVIEW);
      if (map.getSource(PREVIEW)) map.removeSource(PREVIEW);
      if (dblWasEnabled) map.doubleClickZoom.enable();
      canvas.style.cursor = "";
    };
  }, [map, enabled]);

  // ── The drawn ring ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!map) return;
    paintRing(map, points);
    const preview = map.getSource(PREVIEW) as mapboxgl.GeoJSONSource | undefined;
    preview?.setData({ type: "FeatureCollection", features: [] });
  }, [map, points, mode]);

  // ── Handles: created on a count change, never on a move ──────────────────────
  //
  // `count` is the only dependency that may rebuild. Reading the positions through `pointsRef` keeps
  // `points` out of the dependency list, which is what stops a drag from destroying its own marker.
  useEffect(() => {
    if (!map || !enabled) return;

    const markers: mapboxgl.Marker[] = [];
    for (let i = 0; i < count; i++) {
      const p = pointsRef.current[i];
      if (!p) continue;

      // A 30px box with the 14px dot centred in it, so the anchor is still the corner itself.
      //
      // `position:absolute; top:0; left:0` — NOT `relative`. Mapbox places a marker purely with a
      // `transform`, and its own `.mapboxgl-marker` rule supplies this positioning. An inline
      // `position:relative` overrides that class, so every handle falls back into normal document
      // flow and stacks BELOW the previous one by its own height. Measured: handles landed 0, 30, 60
      // and 90 px below their true corners — one handle-height per index. Absolute positioning also
      // establishes the containing block the dot and the minus need, so the children still anchor here.
      const el = document.createElement("div");
      el.style.cssText = `position:absolute;top:0;left:0;width:${HANDLE_PX}px;height:${HANDLE_PX}px;`;

      const dot = document.createElement("div");
      dot.style.cssText =
        `position:absolute;left:${(HANDLE_PX - DOT_PX) / 2}px;top:${(HANDLE_PX - DOT_PX) / 2}px;` +
        `width:${DOT_PX}px;height:${DOT_PX}px;border-radius:50%;background:${i === 0 ? "#2563eb" : "#fff"};border:2px solid #2563eb;` +
        "box-shadow:0 1px 3px rgba(0,0,0,0.35);cursor:grab;transition:transform 120ms ease;";
      el.appendChild(dot);

      const minus = document.createElement("button");
      minus.type = "button";
      minus.setAttribute("aria-label", "Remove this corner");
      minus.textContent = "−";
      minus.style.cssText =
        "position:absolute;left:50%;top:0;transform:translateX(-50%);width:20px;height:20px;" +
        "border-radius:50%;background:#dc2626;color:#fff;border:1.5px solid #fff;" +
        "font:700 11px/1 system-ui;display:none;align-items:center;justify-content:center;" +
        "padding:0;cursor:pointer;";
      // `pointerdown` must not reach the map: it would start a pan and swallow the click.
      minus.addEventListener("pointerdown", (ev) => ev.stopPropagation());
      minus.addEventListener("click", (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        // A ring needs 3 corners to stay a shape. Read live, not captured: the count changes while
        // this element stays mounted, so a value baked in at creation would go stale.
        if (dragging || pointsRef.current.length <= 3) return;
        onChangeRef.current(pointsRef.current.filter((_, j) => j !== i));
      });
      el.appendChild(minus);

      let dragging = false;
      el.addEventListener("pointerenter", () => {
        dot.style.transform = "scale(1.25)";
        if (!dragging) minus.style.display = "flex";
      });
      el.addEventListener("pointerleave", () => {
        dot.style.transform = "scale(1)";
        minus.style.display = "none";
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: "center", draggable: true })
        .setLngLat(p as [number, number])
        .addTo(map);
      // The closed-hand cursor while dragging is the one affordance that says "this is moving".
      marker.on("dragstart", () => {
        dragging = true;
        el.style.cursor = "grabbing";
        minus.style.display = "none";
      });
      // The SHAPE follows the corner as it moves, not just on release. Redrawing the source on each
      // frame is what makes it read as dragging a vertex rather than teleporting it. Only the map is
      // touched here — reporting upward on every frame would re-render the tool and, worse, push a
      // history entry per frame.
      marker.on("drag", () => {
        const { lng, lat } = marker.getLngLat();
        paintRing(map, withCorner(pointsRef.current, i, [lng, lat]));
      });
      marker.on("dragend", () => {
        dragging = false;
        minus.style.display = el.matches(":hover") ? "flex" : "none";
        el.style.cursor = "";
        const { lng, lat } = marker.getLngLat();
        onChangeRef.current(withCorner(pointsRef.current, i, [lng, lat]));
      });

      markers.push(marker);
    }
    markersRef.current = markers;

    return () => {
      markers.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [map, enabled, count]);

  // ── Handles: positions pushed in, so a move never rebuilds them ──────────────
  useEffect(() => {
    markersRef.current.forEach((marker, i) => {
      const p = points[i];
      if (!p) return;
      const cur = marker.getLngLat();
      // Compare before writing: `setLngLat` during a drag would fight the browser's own move.
      if (Math.abs(cur.lng - p[0]) > 1e-9 || Math.abs(cur.lat - p[1]) > 1e-9) {
        marker.setLngLat(p as [number, number]);
      }
    });
  }, [points]);

  // The live area. Computed here from the same `ringAreaM2` the server stores, so the figure shown
  // while drawing cannot disagree with the figure saved. Held in a ref so an absent callback does not
  // widen this effect's dependency list.
  const onAreaRef = useRef(onArea);
  onAreaRef.current = onArea;
  useEffect(() => {
    if (!onAreaRef.current) return;
    onAreaRef.current(count >= 3 ? Math.round(ringAreaM2(points) * 100) / 100 : null);
  }, [points, count]);

  // Leaving the tool tears its own ring down, so a committed boundary is not overdrawn.
  useEffect(() => {
    if (!map || enabled) return;
    for (const id of [FILL, LINE]) if (map.getLayer(id)) map.removeLayer(id);
    if (map.getSource(SRC)) map.removeSource(SRC);
  }, [map, enabled]);

  return null;
}
