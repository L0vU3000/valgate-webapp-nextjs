"use client";

import { useState, useEffect } from "react";

/**
 * Controls a UI element that should show once in production (gated by
 * localStorage) but always show on every load in development.
 *
 * @param storageKey - The localStorage key used to remember dismissal in prod.
 */
export function useDismissable(storageKey: string, { delay = 0 }: { delay?: number } = {}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = () => {
      // E2E tests set window.__E2E__ before any page script runs. These onboarding
      // popovers always auto-show in development, which blocks Playwright clicks with
      // their backdrop. Suppress them under e2e. No-op in production (flag is never set).
      if (typeof window !== "undefined" && (window as { __E2E__?: boolean }).__E2E__) {
        return;
      }
      if (process.env.NODE_ENV === "development") {
        setVisible(true);
      } else if (!localStorage.getItem(storageKey)) {
        setVisible(true);
      }
    };
    if (delay > 0) {
      const t = setTimeout(show, delay);
      return () => clearTimeout(t);
    }
    show();
  }, [storageKey, delay]);

  function dismiss() {
    if (process.env.NODE_ENV !== "development") {
      localStorage.setItem(storageKey, "1");
    }
    setVisible(false);
  }

  return { visible, dismiss };
}
