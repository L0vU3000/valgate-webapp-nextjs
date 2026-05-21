import "server-only";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import * as db from "@/lib/data/db";

export async function getSafetyPageData(propertyId: string) {
  const userId = getCurrentUserId();
  const [allInspections, allCerts, allRisks, allContacts] = await Promise.all([
    db.inspections.list(userId),
    db.certifications.list(userId),
    db.safetyRisks.list(userId),
    db.emergencyContacts.list(userId),
  ]);
  return {
    inspections: allInspections.filter((x) => x.propertyId === propertyId),
    certifications: allCerts.filter((x) => x.propertyId === propertyId),
    risks: allRisks.filter((x) => x.propertyId === propertyId),
    emergencyContacts: allContacts.filter((x) => x.propertyId === propertyId),
  };
}
