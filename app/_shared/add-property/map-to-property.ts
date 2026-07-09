// Canonical transform from the add-property wizard's FormData shape into a NewProperty for the
// services layer. Kept in a plain (non-"use server") module so BOTH the single-property submit
// action and the bulk spreadsheet importer can reuse the exact same mapping + value parsers —
// there must only ever be one FormData -> NewProperty transform.

import type { FormData as WizardForm } from "@/app/_shared/add-property/types";
import type { NewProperty, PropertyTypeChoice } from "@/lib/data/types/property";

// Fallback map center used when a property has no resolved coordinates (properties require lat/lng).
export const CAMBODIA_CENTROID: [number, number] = [104.991, 12.5657];

export function mapWizardToProperty(form: WizardForm): NewProperty {
  const buyNumeric =
    parseCurrency(form.purchasePrice) ??
    parseCurrency(form.currentMarketValue) ??
    0;
  const [lng, lat] = form.mapCenter ?? CAMBODIA_CENTROID;

  return {
    name: form.propertyName,
    type: form.propertyType as PropertyTypeChoice,
    status: form.status || "Vacant",
    lat,
    lng,

    addressLine: form.addressLine || undefined,
    addressLine2: form.addressLine2 || undefined,
    city: form.city || undefined,
    zip: form.zip || undefined,
    country: form.country || undefined,
    province: form.province || undefined,

    purchasePrice: form.purchasePrice || undefined,
    purchaseDate: parseDateMs(form.purchaseDate),
    currentMarketValue: parseCurrency(form.currentMarketValue),
    outstandingMortgage: parseCurrency(form.outstandingMortgage),
    monthlyPayment: parseCurrency(form.monthlyPayment),
    interestRate: parseFloatSafe(form.interestRate),
    annualPropertyTax: parseCurrency(form.annualPropertyTax),
    taxAssessmentValue: parseCurrency(form.taxAssessmentValue),
    annualInsurance: parseCurrency(form.annualInsurance),
    ownershipStatus: form.ownershipStatus || undefined,
    buyNumeric,

    photoStorageIds: form.photoFileName ? [form.photoFileName] : [],
    documentStorageIds: form.uploadFileName ? [form.uploadFileName] : [],
    totalArea: form.totalArea || "",
    yearBuilt: form.yearBuilt || undefined,
    bedrooms: form.bedrooms || undefined,
    bathrooms: form.bathrooms || undefined,
    parkingSpaces: form.parkingSpaces || undefined,
    storageUnit: form.storageUnit || undefined,
    title: "—",
  };
}

// Strips currency symbols, commas and whitespace ("$1,200,000" -> 1200000). Returns undefined for
// blank or non-numeric input so the field is simply left unset rather than guessed.
export function parseCurrency(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

export function parseFloatSafe(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = parseFloat(value.replace(/[%\s]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

export function parseDateMs(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : undefined;
}
