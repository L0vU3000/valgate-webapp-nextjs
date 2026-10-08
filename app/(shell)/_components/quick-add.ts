// Pure mapping for the map's quick-add flow.
//
// Kept out of the component so it is testable without a browser. The wizard's `FormData` is the
// contract between a dropped pin and the property it becomes, so getting this shape wrong would
// silently produce a record the wizard could not have made.

import { defaultForm } from "@/app/_shared/add-property/types";
import type { FormData } from "@/app/_shared/add-property/types";
import type { GeocodeSuggestion } from "@/app/_shared/add-property/_lib/use-geocode";
import { CAMBODIA_PROVINCES } from "@/lib/constants/cambodia-provinces";

// Array identity changes when a caller merges results during render; only row content resets selection.
export function suggestionRowsSignature(
  rows: readonly Pick<GeocodeSuggestion, "id">[],
): string {
  return JSON.stringify(rows.map((row) => row.id));
}

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
  overrides: Partial<
    Pick<
      FormData,
      "propertyType" | "addressLine" | "city" | "province" | "zip" | "country"
    >
  > = {},
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
    province: CAMBODIA_PROVINCES.includes(
      province as (typeof CAMBODIA_PROVINCES)[number],
    )
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
  const parts = [a.addressLine, a.city, a.province].filter(
    (p): p is string => !!p,
  );
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
/**
 * Seed the card's address fields from a resolved address.
 *
 * `prev` is preserved ONLY when it was typed by the user (`userEdited`). An earlier version always kept
 * `prev`, which meant the fields a PREVIOUS reverse lookup had filled beat the address the user had just
 * picked: searching a Paris address left "Kampong Kou / Kampong Thom" in the card while the map showed
 * Rue de Rivoli — a French property saved with a Cambodian address.
 *
 * `userEdited` is cleared by the caller whenever the pin moves or a suggestion is picked, because at that
 * point any existing text describes the OLD location and is ours, not the user's.
 */
export function mergeAddressFields<T extends AddressSeededFields>(
  fields: T,
  address: GeocodeSuggestion | null,
  userEdited = false,
): T {
  if (!address) return fields;
  return {
    ...fields,
    addressLine:
      userEdited && fields.addressLine
        ? fields.addressLine
        : address.addressLine,
    city: userEdited && fields.city ? fields.city : address.city,
  };
}

// Which suggestion the arrow keys land on. Clamped, not wrapping: ArrowUp at the top of a short
// list should stay put, not jump to the far end and fly the map to the last address.
export function moveHighlight(
  current: number,
  length: number,
  delta: number,
): number {
  if (length <= 0) return 0;
  return Math.min(Math.max(current + delta, 0), length - 1);
}

// The name the property gets when the user confirms without typing one. `createProperty` requires a
// name, and the primary gesture here is "drop a pin, hit confirm" — so an empty box must not be a
// dead end. The address the user just confirmed is the honest default: it is a real value from the
// provider, and it labels the map pin better than a placeholder would.
export function quickAddPropertyName(pin: QuickAddPin, typed: string): string {
  return typed.trim() || quickAddAddressLine(pin) || "Untitled Property";
}
