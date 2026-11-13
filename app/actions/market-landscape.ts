"use server";

// The web drawer's door into the market landscape. Same service as
// GET /api/v1/properties/{id}/market-landscape, so web and iOS read one contract.

import { z } from "zod";
import { requireCtx } from "@/lib/auth/ctx";
import type { ActionResult } from "@/app/actions/_result";
import { getProperty } from "@/lib/services/properties";
import { getMarketLandscape } from "@/lib/services/market-landscape";
import type { MarketLandscapeDTO } from "@/lib/market-landscape";

const PropertyId = z.string().min(1).max(64);

export async function getPropertyMarketLandscape(
  propertyId: string,
): Promise<ActionResult<MarketLandscapeDTO>> {
  const parsed = PropertyId.safeParse(propertyId);
  if (!parsed.success) return { ok: false, error: "Invalid property" };
  const ctx = await requireCtx();
  try {
    // Org-scoped read: another org's property is "not found", never its market data.
    const property = await getProperty(ctx, parsed.data);
    if (!property) return { ok: false, error: "Property not found" };
    return { ok: true, data: await getMarketLandscape(property) };
  } catch (err) {
    console.error("getPropertyMarketLandscape", err);
    return { ok: false, error: "Could not load market data" };
  }
}
