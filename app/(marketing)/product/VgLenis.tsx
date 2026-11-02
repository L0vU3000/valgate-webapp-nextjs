"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/* Buttery inertial scroll for the pitch page only; skipped for reduced-motion users
   (their scroll must feel native). Lenis drives window scroll, so the CSS
   scroll-driven entrances still scrub correctly. */
export function VgLenis() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ duration: 1.05, smoothWheel: true });
    let raf = 0;
    const loop = (t: number) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);
  return null;
}
