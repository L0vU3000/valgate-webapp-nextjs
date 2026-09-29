"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { reverseQuery } from "@/app/_shared/add-property/_lib/use-geocode";
import { upsertPropertyDraftAction } from "@/app/actions/property-drafts";
import {
  QUICK_ADD_STEP,
  quickAddToDraftForm,
  type QuickAddPin,
} from "./quick-add";
import type { QuickAddFields } from "./QuickAddPanel";

// How long to wait after the pin stops before asking for its address. Matches the wizard's
// `useGeocode` debounce, and keeps a nudge-and-release from firing a second billed lookup.
const LOOKUP_DEBOUNCE_MS = 300;

const EMPTY_FIELDS: QuickAddFields = { name: "", addressLine: "", city: "" };

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// State machine for the map's quick-add flow: arm → drop/drag a pin → confirm → the card becomes the
// property editor.
//
// The draft is created on confirm, not on drop, so a pin the user abandons never leaves an orphan
// row. After that first write the server mints a DRFT id, and later edits update it — the same
// create-once-then-update shape `useDrafts` uses in the wizard.
export function useQuickAdd() {
  const [active, setActive] = useState(false);
  const [pin, setPin] = useState<QuickAddPin | null>(null);
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<QuickAddFields>(EMPTY_FIELDS);
  const [draftId, setDraftId] = useState<string | null>(null);
  // False only in the window between dropping a fresh pin and the pin's arrival animation ending.
  const [settled, setSettled] = useState(true);
  const reducedMotion = useRef(false);

  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Monotonic request id. A slow lookup for an old coordinate must never overwrite the result for a
  // newer one — the user drags faster than the network answers.
  const lookupSeq = useRef(0);

  useEffect(() => {
    reducedMotion.current = prefersReducedMotion();
    return () => {
      if (lookupTimer.current) clearTimeout(lookupTimer.current);
    };
  }, []);

  // Arm the mode. Nothing is written to the server until the user confirms a location.
  const start = useCallback(() => {
    setActive(true);
    setPin(null);
    setFields(EMPTY_FIELDS);
    setError(null);
    setDraftId(null);
    setSettled(true);
    setResolving(false);
  }, []);

  // Leave the mode. An already-created draft is deliberately NOT deleted — the user may have typed
  // a name, and the wizard's Step 0 draft list is the right place to offer it back.
  const cancel = useCallback(() => {
    lookupSeq.current += 1; // invalidate any in-flight lookup
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    setActive(false);
    setPin(null);
    setResolving(false);
    setSaving(false);
    setError(null);
    setSettled(true);
  }, []);

  // Resolve the address for a coordinate: debounce, then one reverse lookup. The sequence guard
  // drops a stale answer — the user drags faster than the network replies.
  const lookupAddress = useCallback((center: [number, number]) => {
    setResolving(true);
    const seq = ++lookupSeq.current;
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    lookupTimer.current = setTimeout(async () => {
      const address = await reverseQuery(center);
      if (seq !== lookupSeq.current) return; // a newer coordinate won
      setPin({ center, address });
      setResolving(false);
      // The provider's parts are a starting point the user can correct below. Never clobber
      // something they already typed.
      setFields((prev) => ({
        name: prev.name,
        addressLine: address?.addressLine ?? prev.addressLine,
        city: address?.city ?? prev.city,
      }));
    }, LOOKUP_DEBOUNCE_MS);
  }, []);

  // A fresh drop (a tap on the map). Holds the panel back until the pin has animated in, then
  // resolves the address. A drop must kick off its own lookup: the pin is created already sitting on
  // the coordinate, so no drag event ever fires for it.
  const dropPin = useCallback(
    (center: [number, number]) => {
      setSettled(reducedMotion.current);
      setPin({ center, address: null });
      lookupAddress(center);
    },
    [lookupAddress],
  );

  // The pin settled: either the arrival animation finished, or a drag ended (which moves the pin
  // directly, so there is nothing to wait for).
  const settle = useCallback(() => setSettled(true), []);

  // The pin moved by dragging. The coordinate is the source of truth, so the address follows it: the
  // old address is cleared immediately (it described the previous spot) and re-resolved.
  const resolveAt = useCallback(
    (center: [number, number]) => {
      setSettled(true); // a drag moves the pin directly — there is no arrival animation to wait for
      setPin({ center, address: null });
      lookupAddress(center);
    },
    [lookupAddress],
  );

  const setField = useCallback((key: keyof QuickAddFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Confirm: create the draft once, then update it. Returns the draft id so the caller can link to
  // the wizard, or null if the write failed.
  const confirm = useCallback(async (): Promise<string | null> => {
    if (!pin || saving) return null;
    setSaving(true);
    setError(null);

    const form = quickAddToDraftForm(pin, fields.name, {
      addressLine: fields.addressLine,
      city: fields.city,
    });
    const title = fields.name.trim() || "Untitled Property";

    const res = await upsertPropertyDraftAction({
      ...(draftId ? { id: draftId } : {}),
      title,
      step: QUICK_ADD_STEP,
      form: form as unknown as Record<string, unknown>,
    });

    setSaving(false);
    if (!res.ok) {
      setError("Couldn't save this location. Please try again.");
      return null;
    }
    setDraftId(res.data.id);
    return res.data.id;
  }, [pin, saving, fields, draftId]);

  return {
    active,
    pin,
    resolving,
    saving,
    error,
    fields,
    draftId,
    settled,
    reducedMotion,
    start,
    cancel,
    dropPin,
    settle,
    resolveAt,
    setField,
    confirm,
  };
}
