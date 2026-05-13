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
