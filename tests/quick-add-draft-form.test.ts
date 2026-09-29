import { describe, it, expect } from "vitest";
import {
  quickAddToDraftForm,
  quickAddAddressLine,
  QUICK_ADD_STEP,
  type QuickAddPin,
} from "@/app/(shell)/_components/quick-add";
import type { GeocodeSuggestion } from "@/app/_shared/add-property/_lib/use-geocode";

function suggestion(over: Partial<GeocodeSuggestion> = {}): GeocodeSuggestion {
  return {
    id: "PL1",
    placeName: "J Tower 2 BKK1, Street 398, Phnom Penh",
    mainText: "J Tower 2 BKK1",
    secondaryText: "Street 398, Phnom Penh",
    center: [104.9239, 11.5454],
    addressLine: "J Tower 2 BKK1",
    city: "Phnom Penh",
    province: "Phnom Penh",
    country: "Cambodia",
    zip: "120101",
    ...over,
  };
}

describe("quickAddToDraftForm", () => {
  it("carries the pin coordinate into mapCenter in [lng, lat] order", () => {
    const pin: QuickAddPin = { center: [104.9239, 11.5454], address: suggestion() };
    expect(quickAddToDraftForm(pin, "Marina Villa").mapCenter).toEqual([104.9239, 11.5454]);
  });

  it("maps a resolved address onto the wizard's address fields", () => {
    const pin: QuickAddPin = { center: [104.9239, 11.5454], address: suggestion() };
    const form = quickAddToDraftForm(pin, "  Marina Villa  ");
    expect(form).toMatchObject({
      method: "manual",
      propertyName: "Marina Villa",
      addressLine: "J Tower 2 BKK1",
      city: "Phnom Penh",
      province: "Phnom Penh",
      country: "Cambodia",
      zip: "120101",
    });
  });

  // The province <select> is a fixed English list. Writing a district the provider returned that
  // is not in it would leave the control rendering blank, so the guard must drop it, not pass it.
  it("drops a province the wizard's select cannot render", () => {
    const pin: QuickAddPin = {
      center: [104.9239, 11.5454],
      address: suggestion({ province: "Khan Boeung Keng Kang" }),
    };
    expect(quickAddToDraftForm(pin, "X").province).toBe("");
  });

  // A pin dropped over water returns no address. The coordinate is still real and must survive —
  // this is the case that would otherwise create a draft pinned nowhere.
  it("keeps the coordinate when nothing resolves at the pin", () => {
    const pin: QuickAddPin = { center: [103.5, 10.6], address: null };
    const form = quickAddToDraftForm(pin, "Nameless");
    expect(form.mapCenter).toEqual([103.5, 10.6]);
    expect(form.addressLine).toBe("");
    expect(form.propertyName).toBe("Nameless");
  });

  it("starts a draft at step 2, where the pin is reviewed", () => {
    expect(QUICK_ADD_STEP).toBe(2);
  });

  // A user who corrected the address in the card must not have their text overwritten by the
  // provider's value on save — that is the whole point of making the fields editable.
  it("lets a user-typed address beat the provider's value", () => {
    const pin: QuickAddPin = { center: [104.9239, 11.5454], address: suggestion() };
    const form = quickAddToDraftForm(pin, "Marina Villa", {
      addressLine: "Street 271, unit 4B",
      city: "Phnom Penh",
    });
    expect(form.addressLine).toBe("Street 271, unit 4B");
    expect(form.city).toBe("Phnom Penh");
    // Untouched fields still come from the provider.
    expect(form.country).toBe("Cambodia");
  });
});

describe("quickAddAddressLine", () => {
  it("prefers the provider's full label", () => {
    const pin: QuickAddPin = { center: [1, 1], address: suggestion() };
    expect(quickAddAddressLine(pin)).toBe("J Tower 2 BKK1, Street 398, Phnom Penh");
  });

  it("composes from parts when the label is empty", () => {
    const pin: QuickAddPin = {
      center: [1, 1],
      address: suggestion({ placeName: "", addressLine: "Street 398", city: "Phnom Penh" }),
    };
    expect(quickAddAddressLine(pin)).toBe("Street 398, Phnom Penh");
  });

  it("is empty when nothing resolved — the caller decides what to show", () => {
    expect(quickAddAddressLine({ center: [1, 1], address: null })).toBe("");
  });
});
