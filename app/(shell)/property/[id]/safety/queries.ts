import "server-only";
import { requireCtx } from "@/lib/auth/ctx";
import { listInspections } from "@/lib/services/inspections";
import { listCertifications } from "@/lib/services/certifications";
import { listSafetyRisks } from "@/lib/services/safety-risks";
import { listEmergencyContacts } from "@/lib/services/emergency-contacts";

export async function getSafetyPageData(propertyId: string) {
  const authCtx = await requireCtx();
  const [allInspections, allCerts, allRisks, allContacts] = await Promise.all([
    listInspections(authCtx),
    listCertifications(authCtx),
    listSafetyRisks(authCtx),
    listEmergencyContacts(authCtx),
  ]);
  return {
    inspections: allInspections.filter((x) => x.propertyId === propertyId),
    certifications: allCerts.filter((x) => x.propertyId === propertyId),
    risks: allRisks.filter((x) => x.propertyId === propertyId),
    emergencyContacts: allContacts.filter((x) => x.propertyId === propertyId),
  };
}
