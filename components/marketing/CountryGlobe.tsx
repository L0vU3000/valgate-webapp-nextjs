"use client";

import { useEffect, useRef, useState } from "react";
import createGlobe from "cobe";
import { parcelCoverage } from "@/lib/data/parcel-coverage";

/** Cambodia sits facing the viewer on load — it is where we start. */
const HOME = { lat: 11.55, lng: 104.92 };
/**
 * cobe centres the longitude at `3π/2 − λ` on the visible face. Read off its
 * marker shader, which projects `z ∝ sin(phi + a)` and culls `z < 0` — so the
 * wrong value silently hides the pin on the far side of the globe.
 */
const HOME_PHI = (3 * Math.PI) / 2 - (HOME.lng * Math.PI) / 180;
const TILT = 0.18;
const IDLE_SPIN = 0.0012;
const BRAND = "var(--interactive-primary)";
/** The dot and chip colour as literal channels, for cobe and for canvas work. */
const BRAND_HEX = "#2563EB";

/** cobe takes colour channels as 0–1 floats. */
const rgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16) / 255,
  parseInt(hex.slice(3, 5), 16) / 255,
  parseInt(hex.slice(5, 7), 16) / 255,
];

/**
 * Whether a marker sits on the half of the sphere facing us.
 *
 * Transcribed from cobe's marker vertex shader (`l.z`), the same test it uses to
 * discard markers on the far side. Labels need it because cobe keeps reporting a
 * position for hidden markers, so a country on the back would otherwise float its
 * label across the front of the globe.
 */
function markerZ(lat: number, lng: number, phi: number, theta: number) {
  const r = (lat * Math.PI) / 180;
  const a = (lng * Math.PI) / 180 - Math.PI;
  const scale = 0.8;
  const x = -scale * Math.cos(r) * Math.cos(a);
  const y = scale * Math.sin(r);
  const z = scale * Math.cos(r) * Math.sin(a);
  return -Math.sin(phi) * Math.cos(theta) * x + Math.sin(theta) * y + Math.cos(phi) * Math.cos(theta) * z;
}

/**
 * The countries on the globe: the ones we can read a boundary from, plus
 * Cambodia. Everything else is left off rather than drawn as a dot, so the
 * sphere only shows places Valgate can actually do something.
 */
const marked = parcelCoverage.filter((entry) => entry.served || entry.id === "kh");

export function CountryGlobe({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUnsupported, setIsUnsupported] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let phi = HOME_PHI;
    let theta = TILT;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let velocity = 0;

    const globe = createGlobe(canvas, {
      devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      width: 600,
      height: 600,
      phi,
      theta,
      dark: 0,
      diffuse: 1.15,
      mapSamples: 22000,
      mapBrightness: 6,
      mapBaseBrightness: 0.05,
      // Greys from our own surface tokens, so the globe reads like the light map
      // style the rest of the app uses rather than a blue orb.
      baseColor: rgb("#E8EAED"),
      glowColor: rgb("#FFFFFF"),
      markerColor: rgb(BRAND_HEX),
      opacity: 1,
      markers: marked.map((entry) => ({
        location: [entry.lat, entry.lng] as [number, number],
        size: entry.id === "kh" ? 0.05 : 0.032,
        color: rgb(BRAND_HEX),
        id: entry.id,
      })),
    });

    // A browser without WebGL cannot draw the globe: cobe returns nothing rather
    // than throwing. Fall back to the coverage list below instead of leaving an
    // empty square where the hero should be.
    if (!globe) {
      setIsUnsupported(true);
      return;
    }

    // Labels track cobe's own marker wrappers. Those wrappers carry the marker's
    // projected position as `left`/`top` percentages, so reading them keeps the
    // label glued to the dot without relying on CSS anchor positioning, which
    // only Chrome ships today.
    const holder = canvas.parentElement ?? container;
    const labelFor = marked.flatMap((entry) => {
      const anchor = holder.querySelector<HTMLElement>(`[style*='--cobe-${entry.id}']`);
      if (!anchor) return [];
      const label = document.createElement("div");
      label.textContent = entry.short ?? entry.id.toUpperCase();
      label.dataset.marker = entry.id;
      // Chip styling follows cobe's own label recipe — uppercase text on a solid
      // block, small padding, square corners — tinted with the Valgate action
      // token, so the chips read as ours rather than as a dark tooltip.
      label.style.cssText =
        "position:absolute;transform:translate(-50%,-100%) translateY(-11px);pointer-events:none;" +
        `background:${BRAND};color:var(--interactive-primary-text);font-size:9.5px;font-weight:500;` +
        "letter-spacing:.07em;text-transform:uppercase;line-height:1;padding:3px 6px;white-space:nowrap;" +
        "opacity:0;transition:opacity .3s ease";
      holder.appendChild(label);
      // Sizes are fixed once the text is set, so measure them here rather than
      // forcing layout on every frame.
      return [
        {
          label,
          anchor,
          lat: entry.lat,
          lng: entry.lng,
          shown: false,
          width: label.offsetWidth,
          height: label.offsetHeight,
        },
      ];
    });

    // Every marked country's wrapper, used to keep labels off the dots.
    const dotAnchors = marked
      .map((entry) => holder.querySelector<HTMLElement>(`[style*='--cobe-${entry.id}']`))
      .filter((el): el is HTMLElement => Boolean(el));

    const onPointerDown = (event: PointerEvent) => {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      container.setPointerCapture(event.pointerId);
      setIsDragging(true);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      velocity = (event.clientX - lastX) * 0.008;
      lastX = event.clientX;
      // Vertical drag: cobe's theta has to gain for the hemisphere you pull
      // toward the viewer to come forward. Subtracting sent it the wrong way, so
      // the point under the cursor travelled against the pointer.
      theta = Math.max(-0.9, Math.min(0.9, theta + (event.clientY - lastY) * 0.006));
      lastY = event.clientY;
      phi += velocity;
    };

    const onPointerUp = (event: PointerEvent) => {
      dragging = false;
      if (container.hasPointerCapture(event.pointerId)) {
        container.releasePointerCapture(event.pointerId);
      }
      setIsDragging(false);
    };

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", onPointerUp);
    container.addEventListener("pointercancel", onPointerUp);

    // cobe 2.0.1 publishes no `onRender` and never sets its documented
    // `--cobe-visible-*` variable, so both the rotation and the label placement
    // are driven from here through the typed `update()`.
    //
    // ponytail: placement is a single greedy pass over the labels in list order,
    // so a crowded cluster can still run labels down the page rather than finding
    // the tidiest arrangement. Swap for a real label-placer if the globe ever
    // carries many more countries than this.
    let frame = 0;
    const step = () => {
      if (!dragging) {
        velocity *= 0.94;
        phi += velocity + (reduced ? 0 : IDLE_SPIN);
      }
      globe.update({ phi, theta });

      const size = holder.getBoundingClientRect();
      const dots = dotAnchors.map((anchor) => ({
        x: (parseFloat(anchor.style.left) / 100) * size.width,
        y: (parseFloat(anchor.style.top) / 100) * size.height,
      }));
      const placed: { x1: number; x2: number; y1: number; y2: number }[] = [];

      for (const item of labelFor) {
        const left = parseFloat(item.anchor.style.left);
        const top = parseFloat(item.anchor.style.top);
        // cobe keeps reporting a position for markers round the back, so gate on
        // the same hemisphere test its shader culls by.
        const visible = !Number.isNaN(left) && markerZ(item.lat, item.lng, phi, theta) > 0.12;
        if (visible) {
          const x = (left / 100) * size.width;
          const y = (top / 100) * size.height;
          // Where the chip would sit if nothing were in its way: its bottom edge
          // 11px above the dot, matching the transform above.
          const box = {
            x1: x - item.width / 2,
            x2: x + item.width / 2,
            y1: y - item.height - 11,
            y2: y - 11,
          };
          // Nudge it clear of every label already placed, and off any dot. Dots
          // are ~17px across, so they are tested as boxes rather than points or a
          // label will still clip their edge.
          let offset = 0;
          const clashRadius = 10;
          const clashes = (b: typeof box) =>
            placed.some((p) => b.x1 < p.x2 && b.x2 > p.x1 && b.y1 < p.y2 && b.y2 > p.y1) ||
            dots.some(
              (d) =>
                d.x + clashRadius > b.x1 &&
                d.x - clashRadius < b.x2 &&
                d.y + clashRadius > b.y1 &&
                d.y - clashRadius < b.y2,
            );
          while (clashes({ ...box, y1: box.y1 + offset, y2: box.y2 + offset }) && offset < size.height / 2) {
            offset += item.height + 3;
          }
          item.label.style.left = `${left}%`;
          item.label.style.top = `calc(${top}% + ${offset}px)`;
          placed.push({ x1: box.x1, x2: box.x2, y1: box.y1 + offset, y2: box.y2 + offset });
        }
        if (visible !== item.shown) {
          item.label.style.opacity = visible ? "1" : "0";
          item.shown = visible;
        }
      }
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(frame);
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("pointercancel", onPointerUp);
      labelFor.forEach(({ label }) => label.remove());
      globe.destroy();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={`relative aspect-square w-full touch-none select-none ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
      } ${className ?? ""}`}
    >
      <canvas ref={canvasRef} className="size-full" />
      {isUnsupported ? (
        <p className="absolute inset-0 flex items-center justify-center px-8 text-center text-sm leading-relaxed text-secondary">
          This browser cannot draw the globe. The country list below covers the
          same ground.
        </p>
      ) : null}
    </div>
  );
}
