import "server-only";
import { requireCtx } from "@/lib/auth/ctx";
import { listLandParcels } from "@/lib/services/land-parcels";
import { getProperties } from "@/lib/data/properties";
import type { Ctx } from "@/lib/services/_mapping";
import type { LandParcel } from "@/lib/data/types/land-parcel";
import type { PropertyComparable } from "@/lib/data/types/property-comparable";
import type { MarketSnapshot } from "@/lib/data/types/market-snapshot";
import {
  computePropertyComparables,
  computeMarketSnapshot,
} from "@/lib/data/derivations/property-comparables";

export type LocationPageData = {
  landParcels: LandParcel[];
  comparables: PropertyComparable[];
  marketSnapshot: MarketSnapshot;
};

export async function getLocationPageData(propertyId: string, overrideCtx?: Ctx): Promise<LocationPageData> {
  const authCtx = overrideCtx ?? await requireCtx();

  const [landParcels, allProperties] = await Promise.all([
    listLandParcels(authCtx, propertyId),
    getProperties(),
  ]);

  const target = allProperties.find((p) => p.id === propertyId) ?? null;

  if (!target) {
    return {
      landParcels,
      comparables: [],
      marketSnapshot: {
        city: "—",
        comparableCount: 0,
        avgComparableValue: 0,
        avgPricePerM2: 0,
        targetPricePerM2: 0,
        pctVsAvgPricePerM2: 0,
        estimatedValue: null,
        marketCondition: null,
        avgDaysOnMarket: null,
        inventoryLevel: null,
        buyerDemand: null,
      },
    };
  }

  const comparables = computePropertyComparables(allProperties, target);
  const marketSnapshot = computeMarketSnapshot(comparables, target);

  return { landParcels, comparables, marketSnapshot };
}