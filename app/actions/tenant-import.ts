"use server";

import { requireCtx } from "@/lib/auth/ctx";
import type { ActionResult } from "@/app/actions/_result";
import { revalidateFeTag } from "@/app/actions/_result";
import { bustCache } from "@/lib/cache/bust";
import {
  mapTenants,
  bulkCreateTenants,
  type MapTenantsResult,
  type TenantDraft,
  type BulkCreateTenantsResult,
} from "@/lib/services/tenant-import";
import type { SheetData } from "@/lib/services/entity-import";
import { log } from "@/lib/log";

const MAX_TENANTS = 100;

// Stage 1 of the tenant importer: the whole parsed workbook (every sheet) is sent
// in, the AI sources the tenant fields across it, and we return reviewable
// candidates + the org's property list for the picker. Auth-gated; only headers +
// a few sample rows reach the model (mapTenants → planFieldSources).
export async function mapTenantsAction(sheets: SheetData[]): Promise<ActionResult<MapTenantsResult>> {
  const ctx = await requireCtx();
  if (!Array.isArray(sheets) || sheets.length === 0) {
    return { ok: false, error: "That file has no readable sheets." };
  }
  try {
    const result = await mapTenants(ctx, sheets);
    return { ok: true, data: result };
  } catch (err) {
    log.warn("mapTenantsAction failed", { err: String(err) });
    return { ok: false, error: "Could not read that workbook. Please try again." };
  }
}

// Stage 2 of the tenant importer: create one tenant per reviewed draft, scoped to
// the caller's org. Per-row + partial success — the result reports how many were
// created and which rows failed.
export async function bulkCreateTenantsAction(
  drafts: TenantDraft[],
): Promise<ActionResult<BulkCreateTenantsResult>> {
  const ctx = await requireCtx();
  if (!Array.isArray(drafts) || drafts.length === 0) {
    return { ok: false, error: "No tenants to import." };
  }
  if (drafts.length > MAX_TENANTS) {
    return { ok: false, error: `Bulk import supports up to ${MAX_TENANTS} tenants at a time.` };
  }
  try {
    const result = await bulkCreateTenants(ctx, drafts);
    if (result.created > 0) {
      revalidateFeTag("tenants");
      await bustCache("tenants");
    }
    return { ok: true, data: result };
  } catch (err) {
    log.warn("bulkCreateTenantsAction failed", { err: String(err) });
    return { ok: false, error: "Import failed. Please try again." };
  }
}
