import { describe, it, expect } from "vitest";
import {
  quickAddFormData,
  quickAddAddressLine,
  mergeAddressFields,
  moveHighlight,
  quickAddPropertyName,
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

describe("quickAddFormData", () => {
  it("carries the pin coordinate into mapCenter in [lng, lat] order", () => {
    const pin: QuickAddPin = { center: [104.9239, 11.5454], address: suggestion() };
    expect(quickAddFormData(pin, "Marina Villa").mapCenter).toEqual([104.9239, 11.5454]);
  });

  it("maps a resolved address onto the wizard's address fields", () => {
    const pin: QuickAddPin = { center: [104.9239, 11.5454], address: suggestion() };
    const form = quickAddFormData(pin, "  Marina Villa  ");
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
    expect(quickAddFormData(pin, "X").province).toBe("");
  });

  // A pin dropped over water returns no address. The coordinate is still real and must survive —
  // this is the case that would otherwise create a record pinned nowhere.
  it("keeps the coordinate when nothing resolves at the pin", () => {
    const pin: QuickAddPin = { center: [103.5, 10.6], address: null };
    const form = quickAddFormData(pin, "Nameless");
    expect(form.mapCenter).toEqual([103.5, 10.6]);
    expect(form.addressLine).toBe("");
    expect(form.propertyName).toBe("Nameless");
  });

  // A user who corrected the address in the card must not have their text overwritten by the
  // provider's value on save — that is the whole point of making the fields editable.
  it("lets a user-typed address beat the provider's value", () => {
    const pin: QuickAddPin = { center: [104.9239, 11.5454], address: suggestion() };
    const form = quickAddFormData(pin, "Marina Villa", {
      addressLine: "Street 271, unit 4B",
      city: "Phnom Penh",
    });
    expect(form.addressLine).toBe("Street 271, unit 4B");
    expect(form.city).toBe("Phnom Penh");
    // Untouched fields still come from the provider.
    expect(form.country).toBe("Cambodia");
  });

  // quick-add creates a property directly, so the form must satisfy the same fullPropertySchema
  // gate the wizard's submit action applies — propertyType is the one field a coordinate cannot
  // supply, and an unset type would be rejected at the server trust boundary.
  it("takes the type the user picked in the card", () => {
    const pin: QuickAddPin = { center: [104.9239, 11.5454], address: suggestion() };
    expect(quickAddFormData(pin, "Loft", { propertyType: "residential" }).propertyType).toBe(
      "residential",
    );
  });

  it("leaves the type empty when the user has not picked one", () => {
    const pin: QuickAddPin = { center: [104.9239, 11.5454], address: suggestion() };
    expect(quickAddFormData(pin, "Loft").propertyType).toBe("");
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

describe("mergeAddressFields", () => {
  const fields = { propertyType: "land", name: "", addressLine: "", city: "" };

  it("seeds blank fields from the resolved address", () => {
    expect(mergeAddressFields(fields, suggestion())).toMatchObject({
      propertyType: "land",
      addressLine: "J Tower 2 BKK1",
      city: "Phnom Penh",
    });
  });

  // The user's text is the record of intent. A lookup that lands after they started typing must not
  // replace what they wrote — only fill what is still blank.
  it("keeps what the user typed over the provider's value", () => {
    const typed = { ...fields, addressLine: "Unit 3B", city: "Krong Siem Reap" };
    expect(mergeAddressFields(typed, suggestion())).toMatchObject({
      addressLine: "Unit 3B",
      city: "Krong Siem Reap",
    });
  });

  it("leaves the fields alone when nothing resolved", () => {
    expect(mergeAddressFields(fields, null)).toBe(fields);
  });
});

describe("moveHighlight", () => {
  // Clamped, not wrapping. Wrapping would make ArrowUp at the top of a short list jump to the far
  // end and fly the map to the last address — a bigger, wronger move than doing nothing.
  it("walks down and up the list", () => {
    expect(moveHighlight(0, 5, 1)).toBe(1);
    expect(moveHighlight(3, 5, -1)).toBe(2);
  });

  it("stops at both ends instead of wrapping", () => {
    expect(moveHighlight(0, 5, -1)).toBe(0);
    expect(moveHighlight(4, 5, 1)).toBe(4);
  });

  it("stays at zero for an empty list", () => {
    expect(moveHighlight(0, 0, 1)).toBe(0);
  });
});

describe("quickAddPropertyName", () => {
  it("uses what the user typed", () => {
    const pin: QuickAddPin = { center: [1, 1], address: suggestion() };
    expect(quickAddPropertyName(pin, "  Marina Villa ")).toBe("Marina Villa");
  });

  // The primary gesture is "drop a pin, hit confirm". createProperty requires a name, so a blank
  // box must not dead-end the flow — the confirmed address is the honest fallback.
  it("falls back to the confirmed address when the name is blank", () => {
    const pin: QuickAddPin = { center: [1, 1], address: suggestion() };
    expect(quickAddPropertyName(pin, "   ")).toBe("J Tower 2 BKK1, Street 398, Phnom Penh");
  });

  it("falls back to a literal when there is no address either", () => {
    expect(quickAddPropertyName({ center: [1, 1], address: null }, "")).toBe("Untitled Property");
  });
});
