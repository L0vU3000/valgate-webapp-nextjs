import "server-only";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import * as db from "@/lib/data/db";
import type { Property } from "@/lib/data/types/property";
import type { PropertyValuation } from "@/lib/data/types/property-valuation";

export async function getFinancialsWizardInitial(propertyId: string): Promise<{
  property: Property | null;
  latestValuation: PropertyValuation | null;
}> {
  const userId = getCurrentUserId();
  const property = await db.properties.get(userId, propertyId);
  const allVals = await db.propertyValuations.list(userId);
  const sorted = allVals
    .filter((v) => v.propertyId === propertyId)
    .sort((a, b) => a.recordedAt - b.recordedAt);
  return { property, latestValuation: sorted.at(-1) ?? null };
}
