"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  reverseQuery,
  usePlaceSearch,
  type GeocodeSuggestion,
} from "@/app/_shared/add-property/_lib/use-geocode";
import { submitPropertyAction } from "@/app/(shell)/add-property/actions";
import {
  mergeAddressFields,
  quickAddFormData,
  quickAddPropertyName,
  type QuickAddPin,
} from "./quick-add";
import type { QuickAddFields } from "./QuickAddPanel";
import type { HoveredParcel as CadastreHover } from "@/components/map/cadastre-layer";
import { resetCadastreHover } from "@/components/map/cadastre-layer";

// How long to wait after the pin stops before asking for its address. Matches the wizard's
// `useGeocode` debounce, and keeps a nudge-and-release from firing a second billed lookup.
const LOOKUP_DEBOUNCE_MS = 300;

const EMPTY_FIELDS: QuickAddFields = {
  propertyType: "",
  name: "",
  addressLine: "",
  city: "",
};

/** A cadastral parcel the user chose, waiting to be attached once the property has an id. */
export type CadastreChoice = {
  ref: string;
  point: [number, number];
  label: string;
  /** The tile feature this parcel was highlighted by, so it can stay lit after the pointer moves. */
  featureId: number | null;
  /** Official area in m², kept so the card can still describe the parcel after the pointer leaves. */
  areaM2: number | null;
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
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
/**
 * State machine for the map's quick-add flow: arm → pick a location (type an address, or tap/drag a
 * pin) → confirm → the card becomes the property's sidebar.
 *
 * `getBias` returns the map centre, and is how address search knows which provider to use (the BAN
 * inside France, GrabMaps elsewhere). It is a getter, not a value, so a pan does not rebuild this
 * hook and re-debounce an in-flight query.
 */
export function useQuickAdd(getBias?: () => [number, number] | undefined) {
  const [active, setActive] = useState(false);
  const [pin, setPin] = useState<QuickAddPin | null>(null);
  const [query, setQuery] = useState("");
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<QuickAddFields>(EMPTY_FIELDS);
  // The address the suggestion list is currently pointing at — the pre-selected first row, or
  // wherever ↑/↓ landed. Drives both the map flight and a preview pin, so the user sees where the
  // provider thinks their words point BEFORE committing to it. The provider mis-ranks this corpus
  // (live: "j Tower 2" puts "J And T Express St 271" above the real "J Tower 2 BKK1"), so this
  // preview is the correction path, not a nicety.
  const [preview, setPreview] = useState<[number, number] | null>(null);
  // The cadastral parcel under the cursor (null outside France), and the one the user committed to.
  // The hovered value is display-only — it never writes. The chosen value rides out through
  // submitPropertyAction, which attaches it once the property has an id.
  const [cadastreParcel, setCadastreParcelState] =
    useState<CadastreHover | null>(null);
  // Mirror of `cadastreParcel` for reads that must not depend on it. `chooseCadastre` takes the parcel
  // under the cursor when the card's button is pressed, but if it closed over the state it would get a
  // new identity on every hover — and the map layer effect, which receives it as an argument, would
  // rebuild the layer at pointer rate. The ref keeps the callback stable while staying current.
  const cadastreParcelRef = useRef<CadastreHover | null>(null);
  const setCadastreParcel = useCallback((p: CadastreHover | null) => {
    cadastreParcelRef.current = p;
    setCadastreParcelState(p);
  }, []);

  const [cadastreChoice, setCadastreChoice] = useState<CadastreChoice | null>(
    null,
  );
  // Street address for the parcel under the CURSOR, so the read-out can name the place being hovered
  // rather than the pin. `key` is the parcel code, so the label can tell a fresh address from the
  // previous parcel's without racing the request: a late reply for the old parcel is dropped when the
  // hover has moved on. `null` line means "still resolving / nothing here".
  const [cadastreHoverAddress, setCadastreHoverAddress] = useState<{
    key: string;
    line: string | null;
    /** The lookup is in flight. Drives the label's spinner, so a slow geocoder reads as "working"
     *  rather than as an address that simply never appears. */
    loading: boolean;
  } | null>(null);
  const hoverAddressSeq = useRef(0);
  /** The parcel whose address we are ALREADY loading or have loaded. A ref, not the state, because the
   *  state changes as a result of this effect: guarding on it made the effect re-run the moment it set
   *  `loading`, and the cleanup cancelled the lookup it had just scheduled. */
  const hoverAddressKey = useRef<string | null>(null);
  const reducedMotion = useRef(false);

  // Resolve the STREET ADDRESS of the hovering parcel. The cadastre has no address data — it is
  // parcels only — so the only way to name the place under the cursor is to ask the geocoder about
  // the cursor's own point, which is inside that parcel by construction.
  //
  // Debounced, because a pointer crossing parcels would otherwise fire a request per parcel; and
  // sequence-guarded, because a slower reply for a parcel already left behind must not label the one
  // now under the cursor. The cleanup cancels on every hover change, so only the parcel the pointer
  // RESTS on is actually resolved — deliberate, since resolving each parcel mid-flight would spend a
  // request for every parcel crossed.
  useEffect(() => {
    const key = cadastreParcel?.idu ?? null;
    const point = cadastreParcel?.cursor ?? null;
    if (!key || !point) {
      hoverAddressKey.current = null;
      setCadastreHoverAddress(null);
      return;
    }
    if (hoverAddressKey.current === key) return;

    hoverAddressKey.current = key;
    const seq = ++hoverAddressSeq.current;
    // Enter the loading state IMMEDIATELY, before the debounce, so the spinner appears on arrival
    // rather than ~300ms later. `line: null` here is "not resolved yet", which is what the spinner says.
    setCadastreHoverAddress({ key, line: null, loading: true });
    const timer = setTimeout(async () => {
      const address = await reverseQuery(point);
      if (seq !== hoverAddressSeq.current) return;
      setCadastreHoverAddress({
        key,
        line: address?.placeName ?? null,
        loading: false,
      });
    }, LOOKUP_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [cadastreParcel]);

  // The same search the wizard's address step uses — one debounce, one provider contract, one
  // place to fix if the suggestions key ever changes.
  const geocode = usePlaceSearch(getBias);
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
    setCadastreChoice(null);
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
    setPreview(null);
    setCadastreChoice(null);
    clearGeocode();
  }, [clearGeocode]);

  // True once the USER edits an address field in the card. Until then every address value there was
  // filled by OUR reverse lookup, so it describes the previous pin and must yield to a newly picked
  // address. Cleared when the pin moves or a suggestion is picked.
  const userEditedAddress = useRef(false);

  // A location the caller already knows the address of (a picked suggestion). No reverse lookup:
  // the provider just told us where the place is, so asking again would only risk a different answer.
  const applyLocation = useCallback(
    (center: [number, number], address: GeocodeSuggestion | null) => {
      lookupSeq.current += 1; // a pending reverse lookup for the old pin is now stale
      if (lookupTimer.current) clearTimeout(lookupTimer.current);
      setResolving(false);
      // The user picked this address, so the authoritative values come from it — not from whatever the
      // previous location's lookup had put in the fields.
      userEditedAddress.current = false;
      setPin({ center, address });
      setFields((prev) => ({
        ...prev,
        ...(address
          ? { addressLine: address.addressLine, city: address.city }
          : {}),
      }));
      setPreview(null);
    },
    [],
  );

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
      // The provider's parts seed the card. `userEditedAddress` decides whether they win: text the user
      // typed is theirs, but text our own earlier lookup filled describes the PREVIOUS pin and must be
      // replaced — otherwise a Paris address lands beside Cambodian fields.
      setFields((prev) =>
        mergeAddressFields(prev, address, userEditedAddress.current),
      );
    }, LOOKUP_DEBOUNCE_MS);
  }, []);

  // A fresh drop (a tap on the map). A tap is a deliberate placement, so it supersedes a suggestion
  // being previewed — without this the tap looks ignored, because the preview owns the marker.
  const dropPin = useCallback(
    (center: [number, number]) => {
      setPreview(null);
      setPin({ center, address: null });
      lookupAddress(center);
    },
    [lookupAddress],
  );

  // The pin moved by dragging. The coordinate is the source of truth, so the address follows it: the
  // old address is cleared immediately (it described the previous spot) and re-resolved.
  const resolveAt = useCallback(
    (center: [number, number]) => {
      setPreview(null);
      setPin({ center, address: null });
      lookupAddress(center);
    },
    [lookupAddress],
  );

  // Typing in the address bar. The suggestion list is the pick list the provider's accuracy
  // requires — the pre-selected row is a starting point the arrows and the map preview correct.
  //
  // Two sources, because they answer different depths and NEITHER alone covers the range: the address
  // providers (GrabMaps where the portfolio is, the French BAN in France) give street precision, which
  // is what actually places a pin; the places gazetteer (Mapbox) is the only one that knows a country
  // or a city name, so it is what makes "take me to France" possible. Address results rank first — a
  // street answer is the common case and the one that can place a pin.
  const searchAddress = useCallback(
    (value: string) => {
      setQuery(value);
      setError(null);
      // The map centre goes with the query: it decides whether the BAN or GrabMaps answers, so a user
      // typing in France gets French streets instead of Cambodian ones.
      searchGeocode(value);
    },
    [searchGeocode],
  );

  // A row from the suggestion list. WHAT IT DOES DEPENDS ON WHAT IT IS — an area moves the camera and
  // leaves the field open for a more precise answer; a precise result (address, named place) is a real
  // location, so it places the pin and opens the card. A pin dropped on a city would save a wrong
  // location the user then has to drag, which is why precision decides.
  const pickAddress = useCallback(
    (suggestion: GeocodeSuggestion) => {
      setError(null);
      if (suggestion.isArea) {
        // GO TO, don't place. The map flies there (via the preview) and the field keeps the user's own
        // words, so the next keystrokes refine the same query instead of starting from a label they
        // did not type. No pin, no card — an area is not a location for a property.
        setPreview(suggestion.center);
        return;
      }
      applyLocation(suggestion.center, suggestion);
      setQuery(suggestion.placeName);
      clearGeocode();
    },
    [applyLocation, clearGeocode],
  );

  // The highlight moved. The map flies there and a preview pin marks the spot, so the row under the
  // cursor is always the thing on screen — that is the whole point of pre-selecting the first one.
  const highlightAddress = useCallback(
    (suggestion: GeocodeSuggestion | null) => {
      setPreview(suggestion ? suggestion.center : null);
    },
    [],
  );

  const setField = useCallback((key: keyof QuickAddFields, value: string) => {
    // A user edit is the record of intent — from here on the fields outrank a provider's answer.
    userEditedAddress.current = true;
    setFields((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Choose the parcel under the cursor. The point stored is the CURSOR's own lng/lat, not the pin's:
  // hover only fires while the pointer is over the parcel, so that point is guaranteed to be inside
  // it. The pin then moves there, which is what makes "the pin is now on the parcel I picked" true —
  // and it is still a point the server re-resolves, so stored geometry never comes from the client.
  /**
   * Choose a parcel. Called by the card's button AND by a click on the map — a click on a parcel means
   * "this one", so both paths do the same thing.
   *
   * `parcel` is passed IN rather than read from `cadastreParcel`: the map's own click event carries the
   * parcel under the pointer, whereas the hover state is delivered through an async callback and is often
   * still null when the click lands, which is why clicking a parcel used to do nothing but move the pin.
   *
   * The pin is deliberately NOT moved. The click's lng/lat is already stored as the choice's point, and
   * leaving the pin where it is avoids a second round of map events (the layer effect re-runs on any
   * selection change) fighting the one that just happened.
   */
  const chooseCadastre = useCallback((parcel?: CadastreHover) => {
    // Read the hovered parcel through a REF, not through the closure. `cadastreParcel` changes on every
    // hover report (~60x/s while the cursor crosses a parcel), so depending on it gave this callback a
    // new identity constantly — and because the map layer receives it as an argument, every hover tore
    // the layer down and rebuilt it: hover flickering, glitching, dropping mid-move.
    const p = parcel ?? cadastreParcelRef.current;
    if (!p?.idu) return;
    const label = [
      p.section && `Section ${p.section}`,
      p.numero && `n° ${p.numero}`,
    ]
      .filter(Boolean)
      .join(" ");
    // The hover signature is reset here so the still-hovering parcel cannot report itself as unchanged
    // and skip re-reporting — which would leave `cadastreParcel` null and strip the card of its parcel
    // the instant it was chosen.
    resetCadastreHover();
    setCadastreChoice({
      ref: p.idu,
      point: p.cursor,
      label: label || "Cadastral parcel",
      featureId: p.featureId,
      areaM2: p.contenanceM2,
    });
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
    // The picked parcel rides in as the third argument: same submit action, same Zod gate, same
    // FormData -> NewProperty mapping. No second create path, and the parcel attach happens on the
    // server once the property has an id.
    const res = await submitPropertyAction(
      form,
      undefined,
      cadastreChoice
        ? { ref: cadastreChoice.ref, point: cadastreChoice.point }
        : null,
    );
    setSaving(false);
    if (!res.ok || !res.propertyId) {
      setError(res.error ?? "Couldn't add this property. Please try again.");
      return null;
    }
    createdIdRef.current = res.propertyId;
    return res.propertyId;
  }, [pin, saving, fields, cadastreChoice]);

  return {
    active,
    pin,
    query,
    // Precise results first (they can place the pin), then areas. The bar groups them so the
    // difference is visible; this order means ↑/↓ reaches the pin-placing rows first.
    suggestions: geocode.rows,
    areaCount: geocode.areas.length,
    searching: geocode.loading,
    resolving,
    saving,
    error,
    fields,
    preview,
    cadastreParcel,
    cadastreChoice,
    cadastreHoverAddress,
    reducedMotion,
    start,
    cancel,
    dropPin,
    resolveAt,
    searchAddress,
    pickAddress,
    highlightAddress,
    setField,
    // Display-only: the parcel under the cursor, reported by the map layer.
    setCadastreParcel,
    // The commit. This is the ONLY thing that makes a parcel part of the property.
    chooseCadastre,
    confirm,
  };
}
