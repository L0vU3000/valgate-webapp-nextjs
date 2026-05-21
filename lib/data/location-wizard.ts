import "server-only";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import * as db from "@/lib/data/db";
import type { Property } from "@/lib/data/types/property";

export async function getLocationWizardInitial(propertyId: string): Promise<{
  property: Property | null;
}> {
  const userId = getCurrentUserId();
  const property = await db.properties.get(userId, propertyId);
  return { property };
}
