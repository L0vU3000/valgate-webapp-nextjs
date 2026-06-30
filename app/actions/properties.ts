"use server";


import { requireCtx } from "@/lib/auth/ctx";
import type { ActionResult } from "@/app/actions/_result";
import { revalidateFeTag } from "@/app/actions/_result";
import { bustCache } from "@/lib/cache/bust";
import { NewPropertySchema, PropertyPatchSchema } from "@/lib/data/types/property";
import type { Property } from "@/lib/data/types/property";
import type { PropertyValuation } from "@/lib/data/types/property-valuation";
import type { Lease } from "@/lib/data/types/lease";
import type { Tenant } from "@/lib/data/types/tenant";
import type { Payment } from "@/lib/data/types/payment";
import {
  createProperty as svcCreateProperty,
  updateProperty as svcUpdateProperty,
  deleteProperty as svcDeleteProperty,
  getProperty as svcGetProperty,
} from "@/lib/services/properties";
import { submitVerification, revokeVerification } from "@/lib/services/verification";
import type { Pillar } from "@/lib/data/types/pillar-verification";
import { verifyLimiter, allowed } from "@/lib/ratelimit";
import { log } from "@/lib/log";
import {
  getFinancialsWizardInitial,
  getLocationWizardInitial,
  getRentalWizardInitial,
  getEstateWizardInitial,
  type EstateWizardInitial,
} from "@/lib/data/wizards";

export async function createProperty(data: unknown): Promise<ActionResult<Property>> {
  const parsed = NewPropertySchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Invalid property" };
  const ctx = await requireCtx();
  try {
    const result = await svcCreateProperty(ctx, parsed.data);
    revalidateFeTag("properties");
    await bustCache("properties");
    return { ok: true, data: result };
  } catch (err) {
    console.error("createProperty", err);
    return { ok: false, error: "Could not create property" };
  }
}

export async function updateProperty(id: string, patch: unknown): Promise<ActionResult<Property>> {
  const parsed = PropertyPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Invalid property" };
  const ctx = await requireCtx();
  try {
    const result = await svcUpdateProperty(ctx, id, parsed.data);
    if (!result) return { ok: false, error: "Property not found" };
    revalidateFeTag("properties");
    await bustCache("properties");
    return { ok: true, data: result };
  } catch (err) {
    console.error("updateProperty", err);
    return { ok: false, error: "Could not update property" };
  }
}

export async function deleteProperty(id: string): Promise<ActionResult<void>> {
  const ctx = await requireCtx();
  try {
    await svcDeleteProperty(ctx, id);
    revalidateFeTag("properties");
    await bustCache("properties");
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("deleteProperty", err);
    return { ok: false, error: "Could not delete property" };
  }
}

async function verifyPillar(propertyId: string, pillar: Pillar, docIds: string[]): Promise<ActionResult<Property>> {
  const ctx = await requireCtx();
  if (!(await allowed(verifyLimiter, ctx.userId))) {
    log.warn("ratelimit.block", { edge: "verify", userId: ctx.userId, pillar });
    return { ok: false, error: "Too many attempts. Try again shortly." }; // C5 generic
  }
  try {
    await submitVerification(ctx, propertyId, pillar, docIds);
    revalidateFeTag("properties");
    await bustCache("properties");
    const prop = await svcGetProperty(ctx, propertyId);
    if (!prop) return { ok: false, error: "Property not found" };
    return { ok: true, data: prop };
  } catch (err) {
    console.error(`verify ${pillar}`, err);
    return { ok: false, error: `Could not verify ${pillar}` };
  }
}

async function revokePillar(propertyId: string, pillar: Pillar): Promise<ActionResult<Property>> {
  const ctx = await requireCtx();
  if (!(await allowed(verifyLimiter, ctx.userId))) {
    log.warn("ratelimit.block", { edge: "revoke", userId: ctx.userId, pillar });
    return { ok: false, error: "Too many attempts. Try again shortly." }; // C5 generic
  }
  try {
    await revokeVerification(ctx, propertyId, pillar);
    revalidateFeTag("properties");
    await bustCache("properties");
    const prop = await svcGetProperty(ctx, propertyId);
    if (!prop) return { ok: false, error: "Property not found" };
    return { ok: true, data: prop };
  } catch (err) {
    console.error(`revoke ${pillar}`, err);
    return { ok: false, error: `Could not revoke ${pillar}` };
  }
}

export async function verifyFinancials(propertyId: string, evidenceDocIds: string[]): Promise<ActionResult<Property>> {
  return verifyPillar(propertyId, "financials", evidenceDocIds);
}
export async function revokeFinancialsVerification(propertyId: string): Promise<ActionResult<Property>> {
  return revokePillar(propertyId, "financials");
}
export async function verifyLocation(propertyId: string, evidenceDocIds: string[]): Promise<ActionResult<Property>> {
  return verifyPillar(propertyId, "location", evidenceDocIds);
}
export async function revokeLocationVerification(propertyId: string): Promise<ActionResult<Property>> {
  return revokePillar(propertyId, "location");
}
export async function verifyRental(propertyId: string, evidenceDocIds: string[]): Promise<ActionResult<Property>> {
  return verifyPillar(propertyId, "rental", evidenceDocIds);
}
export async function revokeRentalVerification(propertyId: string): Promise<ActionResult<Property>> {
  return revokePillar(propertyId, "rental");
}
export async function verifyEstate(propertyId: string, evidenceDocIds: string[]): Promise<ActionResult<Property>> {
  return verifyPillar(propertyId, "estate", evidenceDocIds);
}
export async function revokeEstateVerification(propertyId: string): Promise<ActionResult<Property>> {
  return revokePillar(propertyId, "estate");
}

export async function getFinancialsWizardInitialAction(propertyId: string): Promise<ActionResult<{ property: Property | null; latestValuation: PropertyValuation | null }>> {
  const ctx = await requireCtx();
  return { ok: true, data: await getFinancialsWizardInitial(ctx, propertyId) };
}
export async function getLocationWizardInitialAction(propertyId: string): Promise<ActionResult<{ property: Property | null }>> {
  const ctx = await requireCtx();
  return { ok: true, data: await getLocationWizardInitial(ctx, propertyId) };
}
export async function getRentalWizardInitialAction(propertyId: string): Promise<ActionResult<{ property: Property | null; activeLease: Lease | null; primaryTenant: Tenant | null; recentPayments: Payment[] }>> {
  const ctx = await requireCtx();
  return { ok: true, data: await getRentalWizardInitial(ctx, propertyId) };
}
export async function getEstateWizardInitialAction(propertyId: string): Promise<ActionResult<EstateWizardInitial>> {
  const ctx = await requireCtx();
  return { ok: true, data: await getEstateWizardInitial(ctx, propertyId) };
}
