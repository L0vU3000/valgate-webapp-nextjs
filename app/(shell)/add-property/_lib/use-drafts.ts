"use client";

import { useState, useEffect, useCallback } from "react";
import type { FormData, Step, DraftRecord } from "../_components/types";

const STORAGE_KEY = "valgate:add-property:drafts:v1";
const ACTIVE_KEY = "valgate:add-property:active-draft:v1";
const LEGACY_DRAFTS_KEY = "add-property-drafts";
const LEGACY_ACTIVE_KEY = "add-property-active-draft";

interface UseDraftsReturn {
  drafts: DraftRecord[];
  activeId: string | null;
  mounted: boolean;
  setActive: (id: string) => void;
  upsert: (id: string, form: FormData, step: Step) => void;
  remove: (id: string) => void;
  clearActive: () => void;
}

function stripFileBlobs(form: FormData): FormData {
  // File blobs do not survive JSON.stringify (become {}); strip them explicitly
  // so the persisted shape matches FormData's serializable subset.
  const { photoFile: _pf, uploadFile: _uf, ...rest } = form;
  void _pf;
  void _uf;
  return rest as FormData;
}

function serializeDraft(r: DraftRecord): DraftRecord {
  return { ...r, form: stripFileBlobs(r.form) };
}

function readAndMigrateDrafts(): DraftRecord[] {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) return JSON.parse(current);

    // One-time migration from legacy key
    const legacy = localStorage.getItem(LEGACY_DRAFTS_KEY);
    if (legacy) {
      const parsed: DraftRecord[] = JSON.parse(legacy);
      const cleaned = parsed.map(serializeDraft);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
      localStorage.removeItem(LEGACY_DRAFTS_KEY);
      return cleaned;
    }
    return [];
  } catch {
    return [];
  }
}

function readAndMigrateActive(): string | null {
  try {
    const current = localStorage.getItem(ACTIVE_KEY);
    if (current) return current;
    const legacy = localStorage.getItem(LEGACY_ACTIVE_KEY);
    if (legacy) {
      localStorage.setItem(ACTIVE_KEY, legacy);
      localStorage.removeItem(LEGACY_ACTIVE_KEY);
      return legacy;
    }
    return null;
  } catch {
    return null;
  }
}

function writeDrafts(drafts: DraftRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    // quota exceeded or private mode — silently ignore
  }
}

export function useDrafts(): UseDraftsReturn {
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDrafts(readAndMigrateDrafts());
    setActiveId(readAndMigrateActive());
    setMounted(true);
  }, []);

  const setActive = useCallback((id: string) => {
    setActiveId(id);
    try {
      localStorage.setItem(ACTIVE_KEY, id);
    } catch {
      // ignore
    }
  }, []);

  const upsert = useCallback((id: string, form: FormData, step: Step) => {
    setDrafts((prev) => {
      const existing = prev.find((d) => d.id === id);
      const updated: DraftRecord = {
        id,
        title: form.propertyName || "Untitled Property",
        form: stripFileBlobs(form),
        step,
        updatedAt: Date.now(),
      };
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
        try {
          localStorage.removeItem(ACTIVE_KEY);
        } catch {
          // ignore
        }
        return null;
      }
      return prev;
    });
  }, []);

  const clearActive = useCallback(() => {
    setActiveId(null);
    try {
      localStorage.removeItem(ACTIVE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return { drafts, activeId, mounted, setActive, upsert, remove, clearActive };
}
