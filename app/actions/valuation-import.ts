"use server";

import { requireCtx } from "@/lib/auth/ctx";
import type { ActionResult } from "@/app/actions/_result";
import { revalidateFeTag } from "@/app/actions/_result";
import { bustCache } from "@/lib/cache/bust";
import {
  mapValuations,
  bulkCreateValuations,
  type MapValuationsResult,
  type ValuationDraft,
  type BulkCreateValuationsResult,
} from "@/lib/services/valuation-import";
import type { SheetData } from "@/lib/services/entity-import";
import { log } from "@/lib/log";

const MAX_VALUATIONS = 100;

// Stage 1 of the valuation importer: the whole parsed workbook (every sheet) is sent in, the AI
// sources the valuation fields across it, and we return reviewable candidates + the org's property
// list for the picker. Auth-gated; only headers + a few sample rows reach the model.
export async function mapValuationsAction(sheets: SheetData[]): Promise<ActionResult<MapValuationsResult>> {
  const ctx = await requireCtx();
  if (!Array.isArray(sheets) || sheets.length === 0) {
    return { ok: false, error: "That file has no readable sheets." };
  }
  try {
    const result = await mapValuations(ctx, sheets);
    return { ok: true, data: result };
  } catch (err) {
    log.warn("mapValuationsAction failed", { err: String(err) });
    return { ok: false, error: "Could not read that workbook. Please try again." };
  }
}

// Stage 2 of the valuation importer: create one valuation per reviewed draft, scoped to the caller's
// org. Per-row + partial success — the result reports how many were created and which rows failed.
export async function bulkCreateValuationsAction(
  drafts: ValuationDraft[],
): Promise<ActionResult<BulkCreateValuationsResult>> {
  const ctx = await requireCtx();
  if (!Array.isArray(drafts) || drafts.length === 0) {
    return { ok: false, error: "No valuations to import." };
  }
  if (drafts.length > MAX_VALUATIONS) {
    return { ok: false, error: `Bulk import supports up to ${MAX_VALUATIONS} valuations at a time.` };
  }
  try {
    const result = await bulkCreateValuations(ctx, drafts);
    if (result.created > 0) {
      revalidateFeTag("valuations");
      await bustCache("valuations");
    }
    return { ok: true, data: result };
  } catch (err) {
    log.warn("bulkCreateValuationsAction failed", { err: String(err) });
    return { ok: false, error: "Import failed. Please try again." };
  }
}
