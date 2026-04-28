"use client";

import { useState, useEffect, useCallback } from "react";
import type { FormData, Step } from "../_components/types";
import { defaultForm } from "../_components/types";

const STORAGE_KEY = "add-property-drafts";
const ACTIVE_KEY = "add-property-active-draft";

interface Draft {
  id: string;
  form: FormData;
  step: Step;
  updatedAt: number;
}

interface UseDraftsReturn {
  drafts: Draft[];
  activeId: string | null;
  mounted: boolean;
  setActive: (id: string) => void;
  upsert: (id: string, form: FormData, step: Step) => void;
  remove: (id: string) => void;
  clearActive: () => void;
}

function readDrafts(): Draft[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeDrafts(drafts: Draft[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}

export function useDrafts(): UseDraftsReturn {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDrafts(readDrafts());
    setActiveId(localStorage.getItem(ACTIVE_KEY));
    setMounted(true);
  }, []);

  const setActive = useCallback((id: string) => {
    setActiveId(id);
    localStorage.setItem(ACTIVE_KEY, id);
  }, []);

  const upsert = useCallback((id: string, form: FormData, step: Step) => {
    setDrafts((prev) => {
      const existing = prev.find((d) => d.id === id);
      const updated: Draft = { id, form, step, updatedAt: Date.now() };
      const next = existing
        ? prev.map((d) => (d.id === id ? updated : d))
        : [...prev, updated];
      writeDrafts(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setDrafts((prev) => {
      const next = prev.filter((d) => d.id !== id);
      writeDrafts(next);
      return next;
    });
    setActiveId((prev) => {
      if (prev === id) {
        localStorage.removeItem(ACTIVE_KEY);
        return null;
      }
      return prev;
    });
  }, []);

  const clearActive = useCallback(() => {
    setActiveId(null);
    localStorage.removeItem(ACTIVE_KEY);
  }, []);

  return { drafts, activeId, mounted, setActive, upsert, remove, clearActive };
}
