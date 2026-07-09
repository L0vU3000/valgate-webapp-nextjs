"use server";

import { requireCtx } from "@/lib/auth/ctx";
import type { ActionResult } from "@/app/actions/_result";
import { revalidateFeTag } from "@/app/actions/_result";
import { bustCache } from "@/lib/cache/bust";
import type { FormData as WizardForm } from "@/app/_shared/add-property/types";
import {
  mapColumns,
  applyMapping,
  geocodeCandidates,
  bulkCreateProperties,
  type ColumnMapping,
  type ImportCandidate,
  type BulkCreateResult,
} from "@/lib/services/property-import";
import { log } from "@/lib/log";

export type MapSpreadsheetResult = {
  mapping: ColumnMapping;
  candidates: ImportCandidate[];
};

// Stage 2 of the importer: the AI matches columns once (from headers + a sample), code applies that
// mapping to every row, then addresses are geocoded. Returns the mapping (shown to the user) plus the
// candidate properties for the review table. Auth-gated; generic errors only.
export async function mapSpreadsheetAction(
  headers: string[],
  rows: Record<string, string>[],
): Promise<ActionResult<MapSpreadsheetResult>> {
  await requireCtx(); // authenticate — no data is written here, but don't map for anonymous callers
  try {
    const mapping = await mapColumns(headers, rows.slice(0, 5));
    const candidates = await geocodeCandidates(applyMapping(rows, mapping));
    return { ok: true, data: { mapping, candidates } };
  } catch (err) {
    log.warn("mapSpreadsheetAction failed", { err: String(err) });
    return { ok: false, error: "Could not read that spreadsheet. Please try again." };
  }
}

// Stage 3 of the importer: create one property per reviewed candidate, scoped to the caller's org.
// Per-row + partial success — the result reports how many were created and which rows failed.
export async function bulkCreatePropertiesAction(
  forms: WizardForm[],
): Promise<ActionResult<BulkCreateResult>> {
  const ctx = await requireCtx();
  if (!Array.isArray(forms) || forms.length === 0) {
    return { ok: false, error: "No properties to import." };
  }
  if (forms.length > 100) {
    return { ok: false, error: "Bulk import supports up to 100 properties at a time." };
  }
  try {
    const result = await bulkCreateProperties(ctx, forms);
    if (result.created > 0) {
      revalidateFeTag("properties");
      await bustCache("properties");
    }
    return { ok: true, data: result };
  } catch (err) {
    log.warn("bulkCreatePropertiesAction failed", { err: String(err) });
    return { ok: false, error: "Import failed. Please try again." };
  }
}
