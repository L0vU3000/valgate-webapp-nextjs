"use server";

import { requireCtx } from "@/lib/auth/ctx";
import type { ActionResult } from "@/app/actions/_result";
import { revalidateFeTag } from "@/app/actions/_result";
import { bustCache } from "@/lib/cache/bust";
import {
  extractAll,
  applyPlan,
  bulkCreateEntity,
  type SheetPreview,
} from "@/lib/services/unified-extract";
import type { SheetMatrix } from "@/app/_shared/add-property/_lib/parse-spreadsheet";
import type { EntityType, PerEntityRows, ReviewRow, BulkResult, PropertyOption } from "@/lib/services/ingestion/types";
import { log } from "@/lib/log";

export type ExtractResult = { rows: PerEntityRows; properties: PropertyOption[] };

export async function extractAllAction(
  sheets: SheetMatrix[],
): Promise<ActionResult<ExtractResult>> {
  const ctx = await requireCtx();
  try {
    const previews: SheetPreview[] = sheets.map((s) => ({ name: s.name, rows: s.matrix.slice(0, 8) }));
    const plan = await extractAll(previews);
    const rows = await applyPlan(sheets, plan, ctx);
    const { listProperties } = await import("@/lib/services/properties");
    const properties = await listProperties(ctx);
    const propertyOptions: PropertyOption[] = properties.map((p) => ({ id: p.id, label: p.name }));
    return { ok: true, data: { rows, properties: propertyOptions } };
  } catch (err) {
    log.warn("extractAllAction failed", { err: String(err) });
    return { ok: false, error: "Could not read that workbook. Please try again." };
  }
}

const CACHE_TAGS: Record<EntityType, string> = {
  properties: "properties",
  tenants: "tenants",
  valuations: "valuations",
  leases: "leases",
  payments: "payments",
  expenses: "expenses",
  coOwners: "co-owners",
  maintenance: "maintenance",
  inspections: "inspections",
  certifications: "certifications",
  safetyRisks: "safety-risks",
  emergencyContacts: "emergency-contacts",
  successors: "successors",
  landParcels: "land-parcels",
};

export async function bulkCreateAction(
  entityType: EntityType,
  rows: ReviewRow[],
): Promise<ActionResult<BulkResult>> {
  const ctx = await requireCtx();
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, error: `No ${entityType} to import.` };
  }
  if (rows.length > 100) {
    return { ok: false, error: "Bulk import supports up to 100 rows at a time." };
  }
  try {
    const result = await bulkCreateEntity(ctx, entityType, rows);
    if (result.created > 0) {
      revalidateFeTag(CACHE_TAGS[entityType] ?? "properties");
      await bustCache(CACHE_TAGS[entityType] ?? "properties");
    }
    return { ok: true, data: result };
  } catch (err) {
    log.warn("bulkCreateAction failed", { entityType, err: String(err) });
    return { ok: false, error: "Import failed. Please try again." };
  }
}