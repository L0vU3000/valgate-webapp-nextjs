"use server";
import {
  getProperty,
  updateProperty,
  deleteProperty,
  countPropertyCascade,
  type PropertyCascadeCounts,
} from "@/lib/services/properties";
import { requireCtx, requireRole } from "@/lib/auth/ctx";
import { logActivity } from "@/lib/services/activity";
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
  try {
    await logActivity(ctx, {
      entity: "property",
      action: "updated",
      entityId: id,
      summary: `Property "${property.name}" archived`,
      propertyId: id,
    });
  } catch (err) {
    console.error("archivePropertyAction: audit log failed", err);
  }
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
  try {
    await logActivity(ctx, {
      entity: "property",
      action: "updated",
      entityId: id,
      summary: `Property "${property.name}" restored`,
      propertyId: id,
    });
  } catch (err) {
    console.error("restorePropertyAction: audit log failed", err);
  }
  revalidatePath("/portfolio");
  revalidatePath(`/property/${id}`);
  return { ok: true };
}

// Returns how many child rows (leases, payments, documents) a hard delete of this
// property would also remove. The portfolio delete dialog calls this so it can show the
// user exactly what they're about to destroy before they type the confirmation. It is a
// read, but we still authenticate + ownership-check so one org can't probe another's data.
export async function getPropertyCascadeCountsAction(
  id: string,
): Promise<{ ok: boolean; counts?: PropertyCascadeCounts; error?: string }> {
  if (!id) return { ok: false, error: "Invalid property ID" };
  const ctx = await requireCtx();
  // Ownership / IDOR: getProperty is org-scoped, so a property from another org reads as
  // "not found" rather than leaking that it exists.
  const property = await getProperty(ctx, id);
  if (!property) return { ok: false, error: "Property not found" };
  try {
    const counts = await countPropertyCascade(ctx, id);
    return { ok: true, counts };
  } catch (err) {
    console.error("getPropertyCascadeCounts", err);
    return { ok: false, error: "Could not load delete details" };
  }
}

// Permanently deletes a property and everything beneath it. This is the most dangerous action
// in the portfolio — guarded four ways:
//   1. Role gate — only admin/owner may hard-delete. Checked here AND in the service layer
//      (scopedDelete → requireAdmin), so a member/viewer is refused even if they bypass the UI.
//   2. Ownership / IDOR — getProperty is org-scoped; a property from another org reads as
//      "not found" so no information leaks.
//   3. Typed confirmation — the caller must pass the exact property name the user typed.
//      If it doesn't match the stored name we refuse (defence in depth behind the dialog).
//   4. Atomic cascade — the DB has ON DELETE CASCADE on all 18 notNull child FKs, so a single
//      DELETE on `properties` removes leases, payments, tenants, documents, folders,
//      verifications, ownership rows, safety rows, etc. in one transaction (no partial failure).
//      The 3 nullable FKs (payments.propertyId, estate_activity_events.propertyId,
//      notifications.propertyId) are SET NULL so those rows survive with propertyId = null.
//      S3 files (photos + documents) are cleaned up best-effort after the DB commit.
// All error strings returned to the client are generic; details are logged server-side only.
export async function deletePropertyAction(
  id: string,
  typedName: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!id) return { ok: false, error: "Invalid property ID" };
  const ctx = await requireCtx();

  // Role gate (edge level). Throws "forbidden" for viewer/member; we map it to a generic msg.
  try {
    requireRole(ctx, "admin");
  } catch {
    return { ok: false, error: "You don't have permission to delete this property" };
  }

  // Ownership + existence (org-scoped).
  const property = await getProperty(ctx, id);
  if (!property) return { ok: false, error: "Property not found" };

  // Typed-confirmation match (defence in depth behind the dialog's typed gate).
  if (typedName.trim() !== property.name.trim()) {
    return { ok: false, error: "The name you typed does not match this property" };
  }

  // Capture property.name BEFORE the delete — the row will be gone afterwards.
  const deletedName = property.name;

  try {
    // deleteProperty gathers S3 ids → atomic cascade DB delete → best-effort S3 cleanup.
    await deleteProperty(ctx, id);

    // Record an audit row so there is a permanent trail of who deleted what and when.
    // propertyId is intentionally omitted from the log entry: the FK row no longer exists
    // and the DB would reject a foreign-key reference pointing to a deleted property.
    try {
      await logActivity(ctx, {
        entity: "property",
        action: "deleted",
        entityId: id,
        summary: `Property "${deletedName}" permanently deleted`,
      });
    } catch (err) {
      // Audit failure must never roll back a successful delete.
      console.error("deletePropertyAction: audit log failed", err);
    }

    revalidatePath("/portfolio");
    return { ok: true };
  } catch (err) {
    console.error("deleteProperty", err);
    return { ok: false, error: "Could not delete property" };
  }
}
