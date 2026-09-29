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

// The name the property gets when the user confirms without typing one. `createProperty` requires a
// name, and the primary gesture here is "drop a pin, hit confirm" — so an empty box must not be a
// dead end. The address the user just confirmed is the honest default: it is a real value from the
// provider, and it labels the map pin better than a placeholder would.
export function quickAddPropertyName(pin: QuickAddPin, typed: string): string {
  return typed.trim() || quickAddAddressLine(pin) || "Untitled Property";
}
