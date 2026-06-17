"use server";
import { getProperty, updateProperty } from "@/lib/services/properties";
import { requireCtx } from "@/lib/auth/ctx";
import { revalidatePath } from "next/cache";
import type { PropertyTypeChoice, PropertyStatus } from "@/lib/data/types/property";

export type EditPropertyForm = {
  propertyType?: string;
  status?: string;
  propertyName?: string;
  addressLine?: string;
  addressLine2?: string;
  city?: string;
  province?: string;
  zip?: string;
  country?: string;
  totalArea?: string;
  yearBuilt?: string;
  bedrooms?: string;
  bathrooms?: string;
  parkingSpaces?: string;
  storageUnit?: string;
  purchasePrice?: string;
  purchaseDate?: string;
  currentMarketValue?: string;
  ownershipStatus?: string;
  outstandingMortgage?: string;
  monthlyPayment?: string;
  interestRate?: string;
  annualPropertyTax?: string;
  taxAssessmentValue?: string;
  annualInsurance?: string;
};

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

export async function editPropertyAction(
  id: string,
  form: EditPropertyForm
): Promise<{ ok: boolean; error?: string }> {
  if (!id) return { ok: false, error: "Invalid property ID" };
  const ctx = await requireCtx();
  const existing = await getProperty(ctx, id);
  if (!existing) return { ok: false, error: "Property not found" };

  await updateProperty(ctx, id, {
    ...(form.propertyType ? { type: form.propertyType as PropertyTypeChoice } : {}),
    ...(form.status ? { status: form.status as PropertyStatus } : {}),
    ...(form.propertyName ? { name: form.propertyName } : {}),
    addressLine: form.addressLine ?? existing.addressLine,
    addressLine2: form.addressLine2 ?? existing.addressLine2,
    city: form.city ?? existing.city,
    province: form.province || existing.province,
    zip: form.zip ?? existing.zip,
    country: form.country ?? existing.country,
    totalArea: form.totalArea ?? existing.totalArea,
    yearBuilt: form.yearBuilt ?? existing.yearBuilt,
    bedrooms: form.bedrooms ?? existing.bedrooms,
    bathrooms: form.bathrooms ?? existing.bathrooms,
    parkingSpaces: form.parkingSpaces ?? existing.parkingSpaces,
    storageUnit: form.storageUnit ?? existing.storageUnit,
    purchasePrice: form.purchasePrice ?? existing.purchasePrice,
    purchaseDate: form.purchaseDate ? parseDateMs(form.purchaseDate) : existing.purchaseDate,
    currentMarketValue: parseCurrency(form.currentMarketValue) ?? existing.currentMarketValue,
    outstandingMortgage: parseCurrency(form.outstandingMortgage) ?? existing.outstandingMortgage,
    monthlyPayment: parseCurrency(form.monthlyPayment) ?? existing.monthlyPayment,
    interestRate: parseFloatSafe(form.interestRate) ?? existing.interestRate,
    annualPropertyTax: parseCurrency(form.annualPropertyTax) ?? existing.annualPropertyTax,
    taxAssessmentValue: parseCurrency(form.taxAssessmentValue) ?? existing.taxAssessmentValue,
    annualInsurance: parseCurrency(form.annualInsurance) ?? existing.annualInsurance,
    ownershipStatus: form.ownershipStatus ?? existing.ownershipStatus,
    buyNumeric: parseCurrency(form.purchasePrice) ?? existing.buyNumeric,
  });

  revalidatePath(`/property/${id}`);
  revalidatePath("/portfolio");
  return { ok: true };
}

export async function archivePropertyAction(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!id) return { ok: false, error: "Invalid property ID" };
  const ctx = await requireCtx();
  const property = await getProperty(ctx, id);
  if (!property) return { ok: false, error: "Property not found" };
  await updateProperty(ctx, id, { isArchived: true });
  revalidatePath("/portfolio");
  revalidatePath(`/property/${id}`);
  return { ok: true };
}

export async function restorePropertyAction(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!id) return { ok: false, error: "Invalid property ID" };
  const ctx = await requireCtx();
  const property = await getProperty(ctx, id);
  if (!property) return { ok: false, error: "Property not found" };
  await updateProperty(ctx, id, { isArchived: false });
  revalidatePath("/portfolio");
  revalidatePath(`/property/${id}`);
  return { ok: true };
}
