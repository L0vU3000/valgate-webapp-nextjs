"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  geocodeQuery,
  reverseQuery,
  useGeocode,
  type GeocodeSuggestion,
} from "@/app/_shared/add-property/_lib/use-geocode";
import { submitPropertyAction } from "@/app/(shell)/add-property/actions";
import {
  bestAddressMatch,
  mergeAddressFields,
  quickAddFormData,
  quickAddPropertyName,
  type QuickAddPin,
} from "./quick-add";
import type { QuickAddFields } from "./QuickAddPanel";

// How long to wait after the pin stops before asking for its address. Matches the wizard's
// `useGeocode` debounce, and keeps a nudge-and-release from firing a second billed lookup.
const LOOKUP_DEBOUNCE_MS = 300;

const EMPTY_FIELDS: QuickAddFields = { propertyType: "", name: "", addressLine: "", city: "" };

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// State machine for the map's quick-add flow: arm → pick a location (type an address, or tap/drag a
// pin) → confirm → the card becomes the property's sidebar.
//
// The property is created on confirm, not on drop, so a pin the user abandons never leaves an
// orphan row. Confirm is the ONLY write in this flow: it goes through the wizard's own submit
// action, so a quick-added property is built by exactly the same mapping and validation as one
// added through the wizard — there is no second create path to keep in sync.
//
// There is deliberately no "settled" gate: the card is on screen from the moment the mode arms. An
// earlier version hid it until the pin's arrival animation ended, which meant the card was absent
// exactly when the user was looking for it — including before they had placed anything.
export function useQuickAdd() {
  const [active, setActive] = useState(false);
  const [pin, setPin] = useState<QuickAddPin | null>(null);
  const [query, setQuery] = useState("");
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<QuickAddFields>(EMPTY_FIELDS);
  // The coordinate a search chose, or null. Only a search sets it, so the map follows a searched
  // address (which can be anywhere) and leaves a tapped or dragged pin alone — the pin is already
  // under the user's finger, and flying there would fight the gesture. A fresh array each time, so
  // searching the same address twice still counts as a change.
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const reducedMotion = useRef(false);

  // The same search the wizard's address step uses — one debounce, one provider contract, one
  // place to fix if the suggestions key ever changes.
  const geocode = useGeocode(LOOKUP_DEBOUNCE_MS);
  // Destructured because `geocode` itself is rebuilt every render; depending on the object would
  // rebuild every callback below on each render for no reason.
  const { search: searchGeocode, clear: clearGeocode } = geocode;

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
    createdIdRef.current = null;
    setPin(null);
    setQuery("");
    setFields(EMPTY_FIELDS);
    setError(null);
    setResolving(false);
  }, []);

  // Leave the mode. The property that was created is NOT deleted — the user asked for it, and the
  // map keeps its pin. Only the card goes away.
  const cancel = useCallback(() => {
    lookupSeq.current += 1; // invalidate any in-flight lookup
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    setActive(false);
    setPin(null);
    setQuery("");
    setError(null);
    setResolving(false);
    setSaving(false);
    setFocus(null);
    clearGeocode();
  }, [clearGeocode]);

  // A location the caller already knows the address of (a picked suggestion). No reverse lookup:
  // the provider just told us where the place is, so asking again would only risk a different answer.
  const applyLocation = useCallback((center: [number, number], address: GeocodeSuggestion | null) => {
    lookupSeq.current += 1; // a pending reverse lookup for the old pin is now stale
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    setResolving(false);
    setPin({ center, address });
    setFields((prev) => mergeAddressFields(prev, address));
    setFocus(center);
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
      // The bar shows where the pin actually is. An unresolved coordinate clears it rather than
      // leaving text behind that describes a different place.
      setQuery(address?.placeName ?? "");
      // The provider's parts are a starting point the user can correct in the card. Never clobber
      // something they already typed.
      setFields((prev) => mergeAddressFields(prev, address));
    }, LOOKUP_DEBOUNCE_MS);
  }, []);

  // A fresh drop (a tap on the map).
  const dropPin = useCallback(
    (center: [number, number]) => {
      setPin({ center, address: null });
      lookupAddress(center);
    },
    [lookupAddress],
  );

  // The pin moved by dragging. The coordinate is the source of truth, so the address follows it: the
  // old address is cleared immediately (it described the previous spot) and re-resolved.
  const resolveAt = useCallback(
    (center: [number, number]) => {
      setPin({ center, address: null });
      lookupAddress(center);
    },
    [lookupAddress],
  );

  // Typing in the address bar. The suggestion list is the pick list the provider's accuracy
  // requires — never silently take the first answer.
  const searchAddress = useCallback(
    (value: string) => {
      setQuery(value);
      setError(null);
      searchGeocode(value);
    },
    [searchGeocode],
  );

  // A row from the suggestion list.
  const pickAddress = useCallback(
    (suggestion: GeocodeSuggestion) => {
      applyLocation(suggestion.center, suggestion);
      setQuery(suggestion.placeName);
      setError(null);
      clearGeocode();
    },
    [applyLocation, clearGeocode],
  );

  // Enter with nothing picked: commit only to a candidate the query actually names, then let the
  // same suggestions stand as the correction path if none matches.
  const submitAddress = useCallback(async () => {
    if (!query.trim()) return;
    // Reuse the list already on screen when there is one; otherwise ask once for the typed text.
    // `geocodeQuery` rather than the hook's `lookup`: that one returns a single best guess, which is
    // exactly the guess this must not make.
    const candidates =
      geocode.suggestions.length > 0 ? geocode.suggestions : await geocodeQuery(query);
    const best = bestAddressMatch(query, candidates);
    clearGeocode();
    if (!best) {
      setError("No address found for that search. Try a different one, or tap the map.");
      return;
    }
    applyLocation(best.center, best);
    setQuery(best.placeName);
    setError(null);
  }, [query, geocode.suggestions, clearGeocode, applyLocation]);

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
    query,
    suggestions: geocode.suggestions,
    searching: geocode.loading,
    resolving,
    saving,
    error,
    fields,
    focus,
    reducedMotion,
    start,
    cancel,
    dropPin,
    resolveAt,
    searchAddress,
    pickAddress,
    submitAddress,
    setField,
    confirm,
  };
}
