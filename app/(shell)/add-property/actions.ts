"use server";

import type { FormData as WizardForm } from "./_components/types";
import { fullPropertySchema } from "./_components/schemas";
import { createProperty } from "@/app/actions/properties";
import { convertDraftToDocumentsAction } from "@/app/actions/property-drafts";
import type { NewProperty } from "@/lib/data/types/property";
import type { PropertyTypeChoice } from "@/lib/data/types/property";
import { logger } from "@/lib/logger";

const CAMBODIA_CENTROID: [number, number] = [104.991, 12.5657];

export async function submitPropertyAction(
  form: WizardForm,
  draftId?: string,
): Promise<{ ok: boolean; propertyId?: string; propertyCode?: string; error?: string; fileNotice?: string }> {
  try {
    const parsed = fullPropertySchema.safeParse(form);
    if (!parsed.success) {
      logger.warn("submitPropertyAction validation failed", {
        issues: parsed.error.issues,
      });
      const first = parsed.error.issues[0];
      return {
        ok: false,
        error: first?.message ?? "Please review the form and try again.",
      };
    }

    // 1. Create the property first (so a later file step failing can't lose the property).
    const propertyInput = mapWizardToProperty(form);
    const result = await createProperty(propertyInput);
    if (!result.ok) return { ok: false, error: result.error };

    // 2. Convert the draft's staged files into documents (reusing each storageId), then delete the
    //    draft ROWS ONLY — never the S3 objects, which now belong to the new documents. If this
    //    fails the property is still created; we just return a soft notice so the user can retry.
    let fileNotice: string | undefined;
    if (draftId) {
      const conversion = await convertDraftToDocumentsAction(draftId, result.data.id);
      if (!conversion.ok) {
        fileNotice = "Your property was created, but attaching the photos/documents didn't finish. They're safe — you can re-add them from the property page.";
      }
    }

    return { ok: true, propertyId: result.data.id, propertyCode: result.data.code, fileNotice };
  } catch (err) {
    logger.error("submitPropertyAction failed", { err: String(err) });
    return { ok: false, error: "Failed to submit property. Please try again." };
  }
}

function mapWizardToProperty(form: WizardForm): NewProperty {
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
