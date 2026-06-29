import "server-only";
import { requireCtx } from "@/lib/auth/ctx";
import {
  cachedListInspections,
  cachedListCertifications,
  cachedListSafetyRisks,
  cachedListEmergencyContacts,
} from "@/lib/data/cached-reads";

// All four list calls pass propertyId so the WHERE clause filters at the DB level.
export async function getSafetyPageData(propertyId: string) {
  const authCtx = await requireCtx();
  const [inspections, certifications, risks, emergencyContacts] = await Promise.all([
    cachedListInspections(authCtx, propertyId),
    cachedListCertifications(authCtx, propertyId),
    cachedListSafetyRisks(authCtx, propertyId),
    cachedListEmergencyContacts(authCtx, propertyId),
  ]);
  return {
    inspections,
    certifications,
    risks,
    emergencyContacts,
  };
}
