import "server-only";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import * as db from "@/lib/data/db";
import type { Property } from "@/lib/data/types/property";
import type { EstateAssignment } from "@/lib/data/types/successor-property-assignment";
import type { Successor } from "@/lib/data/types/successor";
import type { Document } from "@/lib/data/types/document";

export type EstateWizardInitial = {
  property: Property | null;
  assignments: EstateAssignment[];
  successors: Successor[];
  allSuccessors: Successor[];
  estateDocuments: Document[];
};

export async function getEstateWizardInitial(
  propertyId: string,
): Promise<EstateWizardInitial> {
  const userId = getCurrentUserId();
  const property = await db.properties.get(userId, propertyId);

  const [assignmentsRaw, allSuccessors, documentsRaw] = await Promise.all([
    db.estateAssignments.list(userId),
    db.successors.list(userId),
    db.documents.list(userId),
  ]);

  const assignments = assignmentsRaw.filter((a) => a.propertyId === propertyId);
  const successorIds = new Set(assignments.map((a) => a.successorId));
  const successors = allSuccessors.filter((s) => successorIds.has(s.id));

  const estateDocuments = documentsRaw.filter((doc) => {
    if (doc.propertyId !== propertyId) return false;
    const categoryMatch = (doc.category ?? "").toLowerCase() === "estate";
    const verifiesMatch =
      doc.verifies?.entityType === "estate-plan" &&
      doc.verifies.entityId === propertyId;
    return categoryMatch || verifiesMatch;
  });

  return {
    property,
    assignments,
    successors,
    allSuccessors,
    estateDocuments,
  };
}
