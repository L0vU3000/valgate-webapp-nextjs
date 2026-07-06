import "server-only";
import { requireCtx } from "@/lib/auth/ctx";
import {
  cachedListInspections,
  cachedListCertifications,
  cachedListSafetyRisks,
  cachedListEmergencyContacts,
} from "@/lib/data/cached-reads";
import type { Ctx } from "@/lib/services/_mapping";

export async function getSafetyPageData(propertyId: string, overrideCtx?: Ctx) {
  const authCtx = overrideCtx ?? await requireCtx();
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