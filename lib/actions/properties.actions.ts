"use server";

import { revalidateTag } from "next/cache";
import * as db from "@/lib/data/db/properties";
import * as documentsDb from "@/lib/data/db/documents";
import * as estateAssignmentsDb from "@/lib/data/db/successor-property-assignments";
import * as successorsDb from "@/lib/data/db/successors";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import type { Property } from "@/lib/data/types/property";
import type { PropertyValuation } from "@/lib/data/types/property-valuation";
import { getFinancialsWizardInitial } from "@/lib/data/financials-wizard";
import { getLocationWizardInitial } from "@/lib/data/location-wizard";
import { getRentalWizardInitial } from "@/lib/data/rental-wizard";
import {
  getEstateWizardInitial,
  type EstateWizardInitial,
} from "@/lib/data/estate-wizard";
import * as estateActivityDb from "@/lib/data/db/estate-activity-events";
import type { Lease } from "@/lib/data/types/lease";
import type { Tenant } from "@/lib/data/types/tenant";
import type { Payment } from "@/lib/data/types/payment";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function createProperty(
  data: db.NewProperty,
): Promise<ActionResult<Property>> {
  const userId = getCurrentUserId();
  const property = await db.create(userId, data);
  revalidateTag("properties");
  return { ok: true, data: property };
}

export async function updateProperty(
  id: string,
  patch: Partial<Property>,
): Promise<ActionResult<Property>> {
  const userId = getCurrentUserId();
  const updated = await db.update(userId, id, patch);
  if (!updated) return { ok: false, error: "Property not found" };
  revalidateTag("properties");
  return { ok: true, data: updated };
}

export async function deleteProperty(id: string): Promise<ActionResult<void>> {
  const userId = getCurrentUserId();
  await db.remove(userId, id);
  revalidateTag("properties");
  return { ok: true, data: undefined };
}

export async function verifyFinancials(
  propertyId: string,
  evidenceDocIds: string[],
): Promise<ActionResult<Property>> {
  const userId = getCurrentUserId();

  if (evidenceDocIds.length === 0) {
    return { ok: false, error: "At least one evidence document is required." };
  }

  const updated = await db.update(userId, propertyId, {
    financialsVerified: true,
    financialsVerifiedAt: Date.now(),
    financialsEvidenceDocIds: evidenceDocIds,
  });

  if (!updated) return { ok: false, error: "Property not found" };

  for (const docId of evidenceDocIds) {
    await documentsDb.update(userId, docId, {
      verifies: { entityType: "financials", entityId: propertyId },
    });
  }

  revalidateTag("properties");
  revalidateTag("documents");

  return { ok: true, data: updated };
}

export async function revokeFinancialsVerification(
  propertyId: string,
): Promise<ActionResult<Property>> {
  const userId = getCurrentUserId();

  const current = await db.get(userId, propertyId);
  if (!current) return { ok: false, error: "Property not found" };

  const previousDocIds = current.financialsEvidenceDocIds ?? [];

  const updated = await db.update(userId, propertyId, {
    financialsVerified: undefined,
    financialsVerifiedAt: undefined,
    financialsEvidenceDocIds: undefined,
  });

  if (!updated) return { ok: false, error: "Property not found" };

  for (const docId of previousDocIds) {
    const doc = await documentsDb.get(userId, docId);
    if (doc) {
      await documentsDb.update(userId, docId, { verifies: undefined });
    }
  }

  revalidateTag("properties");
  revalidateTag("documents");

  return { ok: true, data: updated };
}

export async function getFinancialsWizardInitialAction(
  propertyId: string,
): Promise<ActionResult<{ property: Property | null; latestValuation: PropertyValuation | null }>> {
  const data = await getFinancialsWizardInitial(propertyId);
  return { ok: true, data };
}

export async function verifyLocation(
  propertyId: string,
  evidenceDocIds: string[],
): Promise<ActionResult<Property>> {
  const userId = getCurrentUserId();

  if (evidenceDocIds.length === 0) {
    return { ok: false, error: "At least one evidence document is required." };
  }

  const updated = await db.update(userId, propertyId, {
    locationVerified: true,
    locationVerifiedAt: Date.now(),
    locationEvidenceDocIds: evidenceDocIds,
  });

  if (!updated) return { ok: false, error: "Property not found" };

  for (const docId of evidenceDocIds) {
    await documentsDb.update(userId, docId, {
      verifies: { entityType: "location-identity", entityId: propertyId },
    });
  }

  revalidateTag("properties");
  revalidateTag("documents");

  return { ok: true, data: updated };
}

export async function revokeLocationVerification(
  propertyId: string,
): Promise<ActionResult<Property>> {
  const userId = getCurrentUserId();

  const current = await db.get(userId, propertyId);
  if (!current) return { ok: false, error: "Property not found" };

  const previousDocIds = current.locationEvidenceDocIds ?? [];

  const updated = await db.update(userId, propertyId, {
    locationVerified: undefined,
    locationVerifiedAt: undefined,
    locationEvidenceDocIds: undefined,
  });

  if (!updated) return { ok: false, error: "Property not found" };

  for (const docId of previousDocIds) {
    const doc = await documentsDb.get(userId, docId);
    if (doc) {
      await documentsDb.update(userId, docId, { verifies: undefined });
    }
  }

  revalidateTag("properties");
  revalidateTag("documents");

  return { ok: true, data: updated };
}

export async function getLocationWizardInitialAction(
  propertyId: string,
): Promise<ActionResult<{ property: Property | null }>> {
  const data = await getLocationWizardInitial(propertyId);
  return { ok: true, data };
}

export async function verifyRental(
  propertyId: string,
  evidenceDocIds: string[],
): Promise<ActionResult<Property>> {
  const userId = getCurrentUserId();

  if (evidenceDocIds.length === 0) {
    return { ok: false, error: "At least one evidence document is required." };
  }

  const updated = await db.update(userId, propertyId, {
    rentalVerified: true,
    rentalVerifiedAt: Date.now(),
    rentalEvidenceDocIds: evidenceDocIds,
  });

  if (!updated) return { ok: false, error: "Property not found" };

  for (const docId of evidenceDocIds) {
    await documentsDb.update(userId, docId, {
      verifies: { entityType: "rental", entityId: propertyId },
    });
  }

  revalidateTag("properties");
  revalidateTag("documents");

  return { ok: true, data: updated };
}

export async function revokeRentalVerification(
  propertyId: string,
): Promise<ActionResult<Property>> {
  const userId = getCurrentUserId();

  const current = await db.get(userId, propertyId);
  if (!current) return { ok: false, error: "Property not found" };

  const previousDocIds = current.rentalEvidenceDocIds ?? [];

  const updated = await db.update(userId, propertyId, {
    rentalVerified: undefined,
    rentalVerifiedAt: undefined,
    rentalEvidenceDocIds: undefined,
  });

  if (!updated) return { ok: false, error: "Property not found" };

  for (const docId of previousDocIds) {
    const doc = await documentsDb.get(userId, docId);
    if (doc) {
      await documentsDb.update(userId, docId, { verifies: undefined });
    }
  }

  revalidateTag("properties");
  revalidateTag("documents");

  return { ok: true, data: updated };
}

export async function getRentalWizardInitialAction(
  propertyId: string,
): Promise<ActionResult<{
  property: Property | null;
  activeLease: Lease | null;
  primaryTenant: Tenant | null;
  recentPayments: Payment[];
}>> {
  const data = await getRentalWizardInitial(propertyId);
  return { ok: true, data };
}

async function primaryShareTotalForEstate(
  userId: string,
  propertyId: string,
): Promise<number> {
  const [assignments, successors] = await Promise.all([
    estateAssignmentsDb.list(userId),
    successorsDb.list(userId),
  ]);

  return assignments
    .filter((assignment) => assignment.propertyId === propertyId)
    .map((assignment) =>
      successors.find((entry) => entry.id === assignment.successorId),
    )
    .filter((entry): entry is NonNullable<typeof entry> =>
      Boolean(entry && entry.role === "primary"),
    )
    .reduce((sum, entry) => sum + entry.share, 0);
}

export async function verifyEstate(
  propertyId: string,
  evidenceDocIds: string[],
): Promise<ActionResult<Property>> {
  const userId = getCurrentUserId();

  if (evidenceDocIds.length === 0) {
    return { ok: false, error: "At least one evidence document is required." };
  }

  const assignments = (await estateAssignmentsDb.list(userId)).filter(
    (assignment) => assignment.propertyId === propertyId,
  );
  if (assignments.length === 0) {
    return {
      ok: false,
      error: "Assign at least one beneficiary before verifying the estate plan.",
    };
  }

  const primaryTotal = await primaryShareTotalForEstate(userId, propertyId);
  if (Math.abs(primaryTotal - 100) > 0.01) {
    return {
      ok: false,
      error: `Primary beneficiary shares must total 100% (currently ${primaryTotal.toFixed(1)}%).`,
    };
  }

  const updated = await db.update(userId, propertyId, {
    estateVerified: true,
    estateVerifiedAt: Date.now(),
    estateEvidenceDocIds: evidenceDocIds,
  });

  if (!updated) return { ok: false, error: "Property not found" };

  for (const docId of evidenceDocIds) {
    await documentsDb.update(userId, docId, {
      verifies: { entityType: "estate-plan", entityId: propertyId },
      category: "Estate",
    });
  }

  const now = Date.now();
  await estateActivityDb.create(userId, {
    kind: "estate.reviewed",
    title: "Estate plan verified",
    description: `Estate plan verification completed for ${updated.name}.`,
    propertyId,
    createdAt: now,
    updatedAt: now,
  });

  revalidateTag("properties");
  revalidateTag("documents");
  revalidateTag("estate-assignments");
  revalidateTag("successors");

  return { ok: true, data: updated };
}

export async function revokeEstateVerification(
  propertyId: string,
): Promise<ActionResult<Property>> {
  const userId = getCurrentUserId();

  const current = await db.get(userId, propertyId);
  if (!current) return { ok: false, error: "Property not found" };

  const previousDocIds = current.estateEvidenceDocIds ?? [];

  const updated = await db.update(userId, propertyId, {
    estateVerified: undefined,
    estateVerifiedAt: undefined,
    estateEvidenceDocIds: undefined,
  });

  if (!updated) return { ok: false, error: "Property not found" };

  for (const docId of previousDocIds) {
    const doc = await documentsDb.get(userId, docId);
    if (doc) {
      await documentsDb.update(userId, docId, { verifies: undefined });
    }
  }

  const now = Date.now();
  await estateActivityDb.create(userId, {
    kind: "estate.reviewed",
    title: "Estate verification revoked",
    description: `Estate plan verification was revoked for ${updated.name}.`,
    propertyId,
    createdAt: now,
    updatedAt: now,
  });

  revalidateTag("properties");
  revalidateTag("documents");
  revalidateTag("estate-assignments");
  revalidateTag("successors");

  return { ok: true, data: updated };
}

export async function getEstateWizardInitialAction(
  propertyId: string,
): Promise<ActionResult<EstateWizardInitial>> {
  const data = await getEstateWizardInitial(propertyId);
  return { ok: true, data };
}
