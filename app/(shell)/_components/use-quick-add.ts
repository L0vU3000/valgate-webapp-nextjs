"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { reverseQuery } from "@/app/_shared/add-property/_lib/use-geocode";
import { submitPropertyAction } from "@/app/(shell)/add-property/actions";
import { quickAddFormData, quickAddPropertyName, type QuickAddPin } from "./quick-add";
import type { QuickAddFields } from "./QuickAddPanel";

// How long to wait after the pin stops before asking for its address. Matches the wizard's
// `useGeocode` debounce, and keeps a nudge-and-release from firing a second billed lookup.
const LOOKUP_DEBOUNCE_MS = 300;

const EMPTY_FIELDS: QuickAddFields = { propertyType: "", name: "", addressLine: "", city: "" };

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// State machine for the map's quick-add flow: arm → drop/drag a pin → confirm → the card becomes the
// property's sidebar.
//
// The property is created on confirm, not on drop, so a pin the user abandons never leaves an
// orphan row. Confirm is the ONLY write in this flow: it goes through the wizard's own submit
// action, so a quick-added property is built by exactly the same mapping and validation as one
// added through the wizard — there is no second create path to keep in sync.
export function useQuickAdd() {
  const [active, setActive] = useState(false);
  const [pin, setPin] = useState<QuickAddPin | null>(null);
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<QuickAddFields>(EMPTY_FIELDS);
  // False only in the window between dropping a fresh pin and the pin's arrival animation ending.
  const [settled, setSettled] = useState(true);
  const reducedMotion = useRef(false);
  // Whether a pin has already been placed. The arrival animation only plays when the marker element
  // is CREATED (first pin), so this is what decides whether there is anything to wait for.
  const hasPinRef = useRef(false);

  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Monotonic request id. A slow lookup for an old coordinate must never overwrite the result for a
  // newer one — the user drags faster than the network answers.
  const lookupSeq = useRef(0);
  // The property this flow created. Confirm is the only write, and it must stay the only one: the
  // card is still on screen while the page re-fetches, so a second click would create a second
  // property. Once this is set, confirm returns the same id without writing again.
  const createdIdRef = useRef<string | null>(null);

  useEffect(() => {
    reducedMotion.current = prefersReducedMotion();
    return () => {
      if (lookupTimer.current) clearTimeout(lookupTimer.current);
    };
  }, []);

  // Arm the mode. Nothing is written to the server until the user confirms a location.
  const start = useCallback(() => {
    setActive(true);
    hasPinRef.current = false;
    createdIdRef.current = null;
    setPin(null);
    setFields(EMPTY_FIELDS);
    setError(null);
    setSettled(true);
    setResolving(false);
  }, []);

  // Leave the mode. The property that was created is NOT deleted — the user asked for it, and the
  // map keeps its pin. Only the card goes away.
  const cancel = useCallback(() => {
    lookupSeq.current += 1; // invalidate any in-flight lookup
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    setActive(false);
    hasPinRef.current = false;
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
        propertyType: prev.propertyType,
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
      // Only the FIRST pin animates in — QuickAddPinLayer creates the marker once and then just
      // moves it, so a later drop has no arrival animation to wait for. Holding the panel back for
      // one that will never fire is what made the card vanish on the user's second click and never
      // come back.
      const isFirstPin = !hasPinRef.current;
      hasPinRef.current = true;
      setSettled(isFirstPin ? reducedMotion.current : true);
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

  // Confirm: create the property. Returns its id so the caller can open its drawer and refresh the
  // map, or null if the write failed.
  const confirm = useCallback(async (): Promise<string | null> => {
    // Already created — return that property instead of writing a second one. The card stays on
    // screen while the page re-fetches its data, so this click is reachable.
    if (createdIdRef.current) return createdIdRef.current;
    if (!pin || saving) return null;
    setSaving(true);
    setError(null);

    const form = quickAddFormData(pin, quickAddPropertyName(pin, fields.name), {
      propertyType: fields.propertyType,
      addressLine: fields.addressLine,
      city: fields.city,
    });

    // The wizard's own submit action — same Zod gate, same FormData → NewProperty mapping, same
    // lat/lng requirement. A missing name or type is refused there with a message meant for a user,
    // so surface it rather than inventing a second one here.
    const res = await submitPropertyAction(form);
    setSaving(false);
    if (!res.ok || !res.propertyId) {
      setError(res.error ?? "Couldn't add this property. Please try again.");
      return null;
    }
    createdIdRef.current = res.propertyId;
    return res.propertyId;
  }, [pin, saving, fields]);

  return {
    active,
    pin,
    resolving,
    saving,
    error,
    fields,
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
