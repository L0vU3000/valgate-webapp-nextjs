"use server";

import type { FormData as WizardForm } from "./_components/types";
import { fullPropertySchema } from "./_components/schemas";
import { createProperty } from "@/lib/actions/properties.actions";
import type { NewProperty } from "@/lib/data/db/properties";
import type {
  PropertyTypeChoice,
  PropertyTypeCode,
} from "@/lib/data/types/property";
import { formatCurrency } from "@/lib/format";
import { logger } from "@/lib/logger";

const CAMBODIA_CENTROID: [number, number] = [12.5657, 104.991];

export async function submitPropertyAction(
  form: WizardForm,
): Promise<{ ok: boolean; propertyId?: string; error?: string }> {
  try {
    const parsed = fullPropertySchema.safeParse(form);
    if (!parsed.success) {
      logger.warn("submitPropertyAction validation failed", {
        issues: parsed.error.issues,
      });
      return { ok: false, error: "Please review the form and try again." };
    }

    const propertyInput = mapWizardToProperty(form);
    const result = await createProperty(propertyInput);
    if (!result.ok) return { ok: false, error: result.error };

    return { ok: true, propertyId: result.data.id };
  } catch (err) {
    logger.error("submitPropertyAction failed", { err: String(err) });
    return { ok: false, error: "Failed to submit property. Please try again." };
  }
}

function mapWizardToProperty(form: WizardForm): NewProperty {
  const buyNumeric = parseCurrency(form.purchasePrice) ?? 0;
  const [lat, lng] = form.mapCenter ?? CAMBODIA_CENTROID;

  return {
    name: form.propertyName,
    code: form.propertyId,
    type: derivePropertyTypeCode(form.propertyType),
    status: "Vacant",
    health: 50,
    lat,
    lng,

    addressLine: form.addressLine || undefined,
    addressLine2: form.addressLine2 || undefined,
    city: form.city || undefined,
    zip: form.zip || undefined,
    country: form.country || undefined,
    province: form.state,

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
    buy: formatCurrency(buyNumeric),
    buyNumeric,

    photoStorageIds: form.photoFileName ? [form.photoFileName] : [],
    documentStorageIds: form.uploadFileName ? [form.uploadFileName] : [],
    size: form.totalArea || "",
    yearBuilt: form.yearBuilt || undefined,
    totalArea: form.totalArea || undefined,
    bedrooms: form.bedrooms || undefined,
    bathrooms: form.bathrooms || undefined,
    parkingSpaces: form.parkingSpaces || undefined,
    storageUnit: form.storageUnit || undefined,
    title: "—",
    titleVariant: "none",
    propertyType: form.propertyType
      ? (form.propertyType as PropertyTypeChoice)
      : undefined,
  };
}

function derivePropertyTypeCode(choice: string): PropertyTypeCode {
  if (choice === "residential" || choice === "multi-unit") return "House";
  if (choice === "commercial" || choice === "retail" || choice === "industrial") {
    return "Building";
  }
  return "Land";
}

function parseCurrency(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function parseFloatSafe(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = parseFloat(value.replace(/[%\s]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function parseDateMs(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : undefined;
}
