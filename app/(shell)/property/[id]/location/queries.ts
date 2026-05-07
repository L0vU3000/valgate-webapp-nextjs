import "server-only";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import * as db from "@/lib/data/db";
import type { LandParcel } from "@/lib/data/types/land-parcel";

export type LocationPageData = {
  landParcels: LandParcel[];
};

export async function getLocationPageData(propertyId: string): Promise<LocationPageData> {
  const userId = getCurrentUserId();
  const all = await db.landParcels.list(userId);
  return {
    landParcels: all.filter((x) => x.propertyId === propertyId),
  };
}
