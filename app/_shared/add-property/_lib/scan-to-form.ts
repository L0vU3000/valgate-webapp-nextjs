// Turns the AI's extracted property object into a wizard FormData patch. Pure + dependency-free:
// nulls become empty strings and the enums drop straight into the wizard's propertyType/status.
// The type import is erased at compile time, so this stays safe to use from client code even though
// document-scan.ts is server-only.

import type { ExtractedProperty } from "@/lib/services/document-scan";
import type { FormData, WizardStatus } from "@/app/_shared/add-property/types";

// Vision models often return a placeholder string ("Unknown", "N/A", …) instead of null for a field
// the document doesn't state. Treat those as blank so the wizard shows an empty field, not junk text.
const PLACEHOLDERS = new Set([
  "", "unknown", "n/a", "na", "none", "-", "--", "tbd", "null", "nil",
  "not stated", "not specified", "not available", "not provided", "unspecified",
]);

function clean(v: string | null): string {
  const t = (v ?? "").trim();
  return PLACEHOLDERS.has(t.toLowerCase()) ? "" : t;
}

// Wizard number fields (area, price, counts, year) are validated as plain digits, but a scan can
// return "2000 square meters" or "12,000,000". Pull out the first numeric token so the value passes
// validation instead of blocking the user on "Continue".
function numeric(v: string | null): string {
  const cleaned = clean(v);
  if (!cleaned) return "";
  const match = cleaned.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? match[0] : "";
}

export function scanToForm(e: ExtractedProperty): Partial<FormData> {
  return {
    propertyName: clean(e.propertyName),
    propertyType: e.propertyType ?? "",
    status: (e.status ?? "") as WizardStatus,
    addressLine: clean(e.addressLine),
    addressLine2: clean(e.addressLine2),
    city: clean(e.city),
    province: clean(e.province),
    zip: clean(e.zip),
    country: clean(e.country),
    yearBuilt: numeric(e.yearBuilt),
    totalArea: numeric(e.totalArea),
    bedrooms: numeric(e.bedrooms),
    bathrooms: numeric(e.bathrooms),
    parkingSpaces: numeric(e.parkingSpaces),
    purchasePrice: numeric(e.purchasePrice),
    currentMarketValue: numeric(e.currentMarketValue),
    purchaseDate: clean(e.purchaseDate),
    ownershipStatus: clean(e.ownershipStatus),
  };
}
