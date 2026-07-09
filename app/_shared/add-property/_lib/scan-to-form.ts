// Turns the AI's extracted property object into a wizard FormData patch. Pure + dependency-free:
// nulls become empty strings and the enums drop straight into the wizard's propertyType/status.
// The type import is erased at compile time, so this stays safe to use from client code even though
// document-scan.ts is server-only.

import type { ExtractedProperty } from "@/lib/services/document-scan";
import type { FormData, WizardStatus } from "@/app/_shared/add-property/types";

export function scanToForm(e: ExtractedProperty): Partial<FormData> {
  const s = (v: string | null): string => v ?? "";
  return {
    propertyName: s(e.propertyName),
    propertyType: e.propertyType ?? "",
    status: (e.status ?? "") as WizardStatus,
    addressLine: s(e.addressLine),
    addressLine2: s(e.addressLine2),
    city: s(e.city),
    province: s(e.province),
    zip: s(e.zip),
    country: s(e.country),
    yearBuilt: s(e.yearBuilt),
    totalArea: s(e.totalArea),
    bedrooms: s(e.bedrooms),
    bathrooms: s(e.bathrooms),
    parkingSpaces: s(e.parkingSpaces),
    purchasePrice: s(e.purchasePrice),
    currentMarketValue: s(e.currentMarketValue),
    purchaseDate: s(e.purchaseDate),
    ownershipStatus: s(e.ownershipStatus),
  };
}
