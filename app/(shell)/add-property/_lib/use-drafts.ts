"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { DraftRecord } from "../_components/types";
import type { FormData, Step } from "../_components/types";
import { readDrafts, upsertDraft, deleteDraft } from "./drafts-storage";

export function useDrafts() {
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDrafts(readDrafts());
    setMounted(true);
  }, []);

  const setActive = useCallback((id: string) => {
    setActiveIdState(id);
  }, []);

  const upsert = useCallback(
    (id: string, form: FormData, step: Step) => {
      if (!mounted) return;
      const title =
        form.propertyName || form.addressLine || "Untitled draft";
      const record: DraftRecord = {
        id,
        title,
        form,
        step,
        updatedAt: Date.now(),
      };
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        upsertDraft(record);
        setDrafts(readDrafts());
      }, 500);
    },
    [mounted],
  );

  const remove = useCallback((id: string) => {
    deleteDraft(id);
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    setActiveIdState((prev) => (prev === id ? null : prev));
  }, []);

  const clearActive = useCallback(() => {
    setActiveIdState(null);
  }, []);

  return { drafts, activeId, mounted, setActive, upsert, remove, clearActive };
}
