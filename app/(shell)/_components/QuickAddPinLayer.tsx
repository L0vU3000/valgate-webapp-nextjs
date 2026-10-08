"use client";

import { useEffect, useRef } from "react";
import type { AnyMap, AnyMarker } from "@/components/map/types";

interface QuickAddPinLayerProps {
  mapRef: React.RefObject<AnyMap | null>;
  // True while the user is placing a pin (quick-add mode), false otherwise.
  active: boolean;
  // null before the pin is dropped. Anchoring on a coordinate rather than on the map's pointer means
  // the pin holds its place on the ground while the user zooms and pans to find the exact spot.
  pin: [number, number] | null;
  // True while `pin` is a suggestion being previewed rather than a location the user chose. Only the
  // look changes — a preview is not draggable, because dragging it would place a pin the user never
  // confirmed, on a coordinate the provider picked.
  preview?: boolean;
  onPinChange: (lngLat: [number, number]) => void;
  // Suppresses the pin's arrival travel for users who asked for reduced motion. The pin still
  // appears at its final position — it just does not move to get there.
  reducedMotion?: boolean;
  // Which renderer owns the map right now. Passed rather than inferred: each library's `Marker` may
  // only be added to its own map, and the two classes are indistinguishable at runtime.
  satellite?: boolean;
}

// The quick-add pin, as a Mapbox marker.
//
// Deliberately NOT drawn in MapView's own marker layer: MapView's layer is a Supercluster view of
// saved properties that clears and rebuilds on every `move`. A pin the user is dragging has to
// survive both, and it is not a property yet — it is a coordinate being chosen.
export function QuickAddPinLayer({
  mapRef,
  active,
  pin,
  preview = false,
  onPinChange,
  reducedMotion = false,
  satellite = false,
}: QuickAddPinLayerProps) {
  const markerRef = useRef<AnyMarker | null>(null);
  // Latest props, so the marker's own event handlers never read a stale closure. Same reason
  // MapView keeps refs for isDark/isSatellite. These are read at event time and at creation time,
  // which lets the marker live across pin moves instead of being torn down and rebuilt (which would
  // replay the arrival animation on every single drag).
  const onPinChangeRef = useRef(onPinChange);
  onPinChangeRef.current = onPinChange;
  const pinRef = useRef(pin);
  pinRef.current = pin;
  const previewRef = useRef(preview);
  previewRef.current = preview;
  // The circle element, so the preview look can be toggled without rebuilding the marker. Rebuilding
  // would replay the arrival animation the preview is exempt from — the same reason the marker's
  // lifecycle is keyed on existence, not value.
  const circleRef = useRef<HTMLDivElement | null>(null);
  const elRef = useRef<HTMLDivElement | null>(null);
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;

  // A marker may only exist once there is a coordinate. Mapbox's `addTo()` dereferences the marker's
  // own LngLat, so creating one before the user has dropped a pin throws inside this effect — which
  // takes the whole map subtree down with it, not just the pin.
  const hasPin = pin !== null;

  // Create and destroy the marker. Keyed on whether a pin EXISTS, never on its value — keying on the
  // value would tear the marker down on every drag and replay the arrival animation each time.
  useEffect(() => {
    if (!active || !hasPin) return;
    // Read once, at creation. A ref, not `pin`, so this effect does not re-run on every move.
    const initial = pinRef.current;
    if (!initial) return;
    let cancelled = false;

    void (async () => {
      const map = mapRef.current;
      if (cancelled || !map || markerRef.current) return;
      // The renderer is whichever one built this map — Mapbox for the light/dark view, MapLibre for
      // satellite. Each library's `Marker` may only be added to its OWN map, so this is not a
      // cosmetic choice: a MapLibre marker on a Mapbox map throws. Told, not sniffed: the two
      // classes look alike and minification renames them.
      const MarkerCtor = satellite
        ? (await import("maplibre-gl")).Marker
        : (await import("mapbox-gl")).default.Marker;
      // The import is async and the user can leave quick-add while it is in flight.
      if (cancelled || !mapRef.current) return;

      const el = document.createElement("div");
      el.setAttribute("data-quick-add-pin", "true");
      el.style.cssText = "width:36px;height:36px;";

      const circle = document.createElement("div");
      circle.style.cssText =
        "width:36px;height:36px;border-radius:50%;" +
        "background:#2563eb;border:3px solid #fff;" +
        "box-shadow:0 2px 8px rgba(0,0,0,0.25);" +
        "display:flex;align-items:center;justify-content:center;" +
        "transition:opacity 150ms ease;";
      circle.innerHTML =
        '<svg width="16" height="20" viewBox="0 0 16 20" fill="none"><path d="M8 0C3.589 0 0 3.589 0 8c0 5.25 7.125 11.438 7.438 11.703a.75.75 0 0 0 1.124 0C8.875 19.438 16 13.25 16 8c0-4.411-3.589-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" fill="#fff"/></svg>';
      el.appendChild(circle);
      circleRef.current = circle;
      elRef.current = el;
      // Set the preview look at creation as well as in the effect below: the marker is built inside an
      // async import, so the effect's first run happens before these elements exist and would skip.
      if (previewRef.current) {
        el.style.cursor = "default";
        circle.style.opacity = "0.65";
      }

      // Arrival animation. `pin-appear` is the same keyframe MapView already uses for a pin
      // entering the map, so the two read as the same gesture. A preview is exempt: it moves on
      // every arrow key, and replaying the arrival each time would read as a stutter.
      if (!reducedMotionRef.current && !previewRef.current) {
        circle.style.animation = "pin-appear 280ms cubic-bezier(0.16, 1, 0.3, 1) both";
      }

      // setLngLat MUST come before addTo, and in that order in one chain: Mapbox's addTo() reads the
      // marker's own LngLat to place it, so a marker that reaches addTo without one throws. Every
      // other marker in this repo chains them for the same reason.
      // One local cast for the whole marker lifecycle: the two `Marker` classes share this surface at
      // runtime, but TS will not merge overloads whose `this` types differ (same posture as
      // boundary-layer.ts's `sourceOf`). Which class is really in play was decided by `MarkerCtor`.
      const marker = new MarkerCtor({
        element: el,
        anchor: "center",
        draggable: !previewRef.current,
      })
        .setLngLat(initial)
        .addTo(map as never) as unknown as AnyMarker;

      // A preview is not a placement, so a drag on it must not create one. This is the only write in
      // the flow, and it belongs to a coordinate the user chose.
      marker.on("dragend", () => {
        if (previewRef.current) return;
        const { lng, lat } = marker.getLngLat();
        onPinChangeRef.current([lng, lat]);
      });

      markerRef.current = marker;
    })();

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      markerRef.current = null;
      circleRef.current = null;
      elRef.current = null;
    };
  }, [active, hasPin, mapRef, satellite]);

  // The preview look: dimmed and not draggable, so a suggestion being pointed at never reads as a
  // location already chosen. Toggled on the existing element — see circleRef.
  useEffect(() => {
    const el = elRef.current;
    const circle = circleRef.current;
    if (!el || !circle) return;
    circle.style.opacity = preview ? "0.65" : "1";
    el.style.cursor = preview ? "default" : "grab";
    markerRef.current?.setDraggable(!preview);
  }, [preview, pin]);

  // Follow the coordinate when it changes from outside (a fresh drop, or the user panned the map and
  // took that centre). A drag already moved the marker, so re-setting the same position is a no-op.
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || !pin) return;
    const { lng, lat } = marker.getLngLat();
    if (lng === pin[0] && lat === pin[1]) return;
    marker.setLngLat(pin);
  }, [pin]);

  return null;
}
