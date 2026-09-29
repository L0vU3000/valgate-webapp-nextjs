"use client";

import { useEffect, useRef } from "react";
// Type-only: MapView already loads mapbox-gl, so this adds it to no bundle.
import type mapboxgl from "mapbox-gl";

interface QuickAddPinLayerProps {
  mapRef: React.RefObject<mapboxgl.Map | null>;
  // True while the user is placing a pin (quick-add mode), false otherwise.
  active: boolean;
  // null before the pin is dropped. Anchoring on a coordinate rather than on the map's pointer means
  // the pin holds its place on the ground while the user zooms and pans to find the exact spot.
  pin: [number, number] | null;
  onPinChange: (lngLat: [number, number]) => void;
  // Called once the pin has animated in. The address panel waits for this so the panel does not
  // race the pin the user is looking at.
  onSettled?: () => void;
  // Suppresses the pin's arrival travel for users who asked for reduced motion. The pin still
  // appears at its final position — it just does not move to get there.
  reducedMotion?: boolean;
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
  onPinChange,
  onSettled,
  reducedMotion = false,
}: QuickAddPinLayerProps) {
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  // Latest props, so the marker's own event handlers never read a stale closure. Same reason
  // MapView keeps refs for isDark/isSatellite. These are read at event time and at creation time,
  // which lets the marker live across pin moves instead of being torn down and rebuilt (which would
  // replay the arrival animation on every single drag).
  const onPinChangeRef = useRef(onPinChange);
  onPinChangeRef.current = onPinChange;
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;
  const pinRef = useRef(pin);
  pinRef.current = pin;
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;

  // Create and destroy the marker. Keyed on `active` ONLY — see the note above about `pin`.
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;

    void (async () => {
      const map = mapRef.current;
      if (cancelled || !map || markerRef.current) return;
      const { default: mapboxgl } = await import("mapbox-gl");
      // The import is async and the user can leave quick-add while it is in flight.
      if (cancelled || !mapRef.current) return;

      const el = document.createElement("div");
      el.setAttribute("data-quick-add-pin", "true");
      el.style.cssText = "width:36px;height:36px;cursor:grab;";

      const circle = document.createElement("div");
      circle.style.cssText =
        "width:36px;height:36px;border-radius:50%;" +
        "background:#2563eb;border:3px solid #fff;" +
        "box-shadow:0 2px 8px rgba(0,0,0,0.25);" +
        "display:flex;align-items:center;justify-content:center;";
      circle.innerHTML =
        '<svg width="16" height="20" viewBox="0 0 16 20" fill="none"><path d="M8 0C3.589 0 0 3.589 0 8c0 5.25 7.125 11.438 7.438 11.703a.75.75 0 0 0 1.124 0C8.875 19.438 16 13.25 16 8c0-4.411-3.589-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" fill="#fff"/></svg>';
      el.appendChild(circle);

      // Arrival animation. `pin-appear` is the same keyframe MapView already uses for a pin
      // entering the map, so the two read as the same gesture.
      if (!reducedMotionRef.current) {
        circle.style.animation = "pin-appear 280ms cubic-bezier(0.16, 1, 0.3, 1) both";
      }

      const marker = new mapboxgl.Marker({ element: el, anchor: "center", draggable: true });
      if (pinRef.current) marker.setLngLat(pinRef.current);
      marker.addTo(map);

      marker.on("dragend", () => {
        const { lng, lat } = marker.getLngLat();
        onPinChangeRef.current([lng, lat]);
      });

      markerRef.current = marker;

      if (reducedMotionRef.current) {
        onSettledRef.current?.();
      } else {
        // Let the arrival finish before the address panel claims attention; the timeout matches the
        // keyframe's duration. Tracked out here so the cleanup can actually reach it — returning it
        // from the async IIFE would drop it on the floor.
        settleTimer = setTimeout(() => onSettledRef.current?.(), 280);
      }
    })();

    return () => {
      cancelled = true;
      if (settleTimer) clearTimeout(settleTimer);
      markerRef.current?.remove();
      markerRef.current = null;
    };
  }, [active, mapRef]);

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
