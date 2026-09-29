// Pure mapping for the map's quick-add flow.
//
// Kept out of the component so it is testable without a browser. The wizard's `FormData` is the
// contract between a dropped pin and the property it becomes, so getting this shape wrong would
// silently produce a record the wizard could not have made.

import { defaultForm } from "@/app/_shared/add-property/types";
import type { FormData } from "@/app/_shared/add-property/types";
import type { GeocodeSuggestion } from "@/app/_shared/add-property/_lib/use-geocode";
import { CAMBODIA_PROVINCES } from "@/lib/constants/cambodia-provinces";

export type QuickAddPin = {
  center: [number, number]; // [lng, lat] — map, API, and FormData.mapCenter all agree on this order
  // null = nothing resolved at this coordinate. A valid answer over water or farmland, not an
  // error: the coordinate is real, the address is a nicety.
  address: GeocodeSuggestion | null;
};

// A quick-added pin supplies the address and the pin, so the form it builds is the same shape the
// wizard's step 2 builds — which is what lets it go straight through mapWizardToProperty.
export function quickAddFormData(
  pin: QuickAddPin,
  name: string,
  // Fields the user set in the card. Anything they touched wins over the provider's value — the
  // same "the user's text is the record of intent" rule the wizard follows.
  overrides: Partial<Pick<FormData, "propertyType" | "addressLine" | "city" | "province" | "zip" | "country">> = {},
): FormData {
  const a = pin.address;
  const province = overrides.province ?? a?.province ?? "";
  return {
    ...defaultForm,
    method: "manual",
    propertyName: name.trim(),
    propertyType: overrides.propertyType ?? defaultForm.propertyType,
    mapCenter: pin.center,
    addressLine: overrides.addressLine ?? a?.addressLine ?? "",
    city: overrides.city ?? a?.city ?? "",
    // Same guard the wizard uses: the province <select> is a fixed English list, and writing a
    // value it does not contain leaves it rendering blank.
    province: CAMBODIA_PROVINCES.includes(province as (typeof CAMBODIA_PROVINCES)[number])
      ? province
      : "",
    zip: overrides.zip ?? a?.zip ?? "",
    country: overrides.country ?? a?.country ?? "",
  };
}

// What the panel shows above the confirm button. The provider's label already reads as a full
// address; the sub-parts are the fallback when it does not.
export function quickAddAddressLine(pin: QuickAddPin): string {
  const a = pin.address;
  if (!a) return "";
  if (a.placeName) return a.placeName;
  // Dedupe: for Phnom Penh, city and province are both "Phnom Penh", which would otherwise render
  // as "... Street 398, Phnom Penh, Phnom Penh".
  const parts = [a.addressLine, a.city, a.province].filter((p): p is string => !!p);
  return [...new Set(parts)].join(", ");
}

// The four fields the card exposes, seeded from a resolved address. (The card's own type lives with
// the component; this one keeps this module importable without pulling in JSX.)
type AddressSeededFields = {
  propertyType: string;
  name: string;
  addressLine: string;
  city: string;
};

// Seed the editable fields from a lookup. The user's text is the record of intent, so anything they
// already typed wins — a late-arriving lookup must never overwrite it. `null` (no address at this
// coordinate) leaves the fields exactly as they were.
export function mergeAddressFields<T extends AddressSeededFields>(
  fields: T,
  address: GeocodeSuggestion | null,
): T {
  if (!address) return fields;
  return {
    ...fields,
    addressLine: fields.addressLine || address.addressLine,
    city: fields.city || address.city,
  };
}

// Pick the suggestion a free-typed query actually names, for the Enter key — there is no row the
// user clicked, so something has to choose.
//
// NOT `items[0]`: the provider's own ranking is unreliable on this corpus and puts the wrong street
// first (measured live — "j Tower 2" ranks "J And T Express St 271" above the actual "J Tower 2
// BKK1"). Committing to [0] would silently drop the pin on a different building. So a query only
// auto-commits when its TEXT matches a candidate; anything else leaves the pick list as the answer.
// A single candidate is unambiguous enough to take as-is.
//
// ponytail: prefix/substring match on the provider's own strings, no fuzzy scoring. Widen to
// token-set matching only if real searches start failing to commit.
export function bestAddressMatch(
  query: string,
  suggestions: GeocodeSuggestion[],
): GeocodeSuggestion | null {
  if (suggestions.length === 0) return null;
  if (suggestions.length === 1) return suggestions[0];

  const q = query.trim().toLowerCase().replace(/\s+/g, " ");
  if (!q) return null;

  // The provider splits a place across `mainText` (the name, for a building) and `placeName` (the
  // full label), so both are match targets — a query may name either.
  const texts = (s: GeocodeSuggestion) => [s.mainText, s.placeName].map((t) => t.toLowerCase());

  return (
    suggestions.find((s) => texts(s).some((t) => t.startsWith(q))) ??
    suggestions.find((s) => texts(s).some((t) => t.includes(q))) ??
    null
  );
}

// The name the property gets when the user confirms without typing one. `createProperty` requires a
// name, and the primary gesture here is "drop a pin, hit confirm" — so an empty box must not be a
// dead end. The address the user just confirmed is the honest default: it is a real value from the
// provider, and it labels the map pin better than a placeholder would.
export function quickAddPropertyName(pin: QuickAddPin, typed: string): string {
  return typed.trim() || quickAddAddressLine(pin) || "Untitled Property";
}
