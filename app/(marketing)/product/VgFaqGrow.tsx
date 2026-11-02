"use client";

import { useEffect } from "react";

/* The page's only script: the FAQ section has fixed-height absolute children, so an
   open answer can't grow it in CSS — grow the section while an answer is open. */
export function VgFaqGrow() {
  useEffect(() => {
    const section = document.querySelector<HTMLElement>(".s-faq");
    const details = document.querySelector<HTMLDetailsElement>(".faq details");
    if (!section || !details) return;
    const t = () => {
      section.style.minHeight = details.open ? `${section.scrollHeight + 16}px` : "";
    };
    details.addEventListener("toggle", t);
    t();
    return () => details.removeEventListener("toggle", t);
  }, []);
  return null;
}
