import "server-only";
import { MAX_IMPORT_ROWS } from "@/app/_shared/add-property/_lib/parse-spreadsheet";
import { log } from "@/lib/log";
import type { Ctx } from "@/lib/services/_mapping";
import type { BulkResult, IngestionCandidate } from "./types";

// Generic per-row create loop. Iterates candidates, calls createFn per row, collects
// failures as { row, name, reason }. Partial success: one bad row never rolls back
// the others. maxRows caps the batch; idorCheck optionally guards before createFn.
//
// The caller passes the entity-specific create function (createProperty, createTenant,
// createPropertyValuation) — each internally validates through its Zod schema and
// enforces org scoping. persistCandidates does NOT duplicate validation.
export async function persistCandidates<T>(
  ctx: Ctx,
  candidates: IngestionCandidate<T>[],
  createFn: (ctx: Ctx, entity: T) => Promise<unknown>,
  options?: {
    maxRows?: number;
    idorCheck?: (entity: T, ctx: Ctx) => Promise<boolean>;
    entityName?: (entity: T) => string;
  },
): Promise<BulkResult> {
  const max = options?.maxRows ?? MAX_IMPORT_ROWS;
  if (candidates.length > max) {
    return {
      created: 0,
      failures: [{ row: 0, name: "", reason: `Too many rows (max ${max})` }],
    };
  }

  let created = 0;
  const failures: BulkResult["failures"] = [];

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i]!;
    const name = options?.entityName?.(c.entity) ?? `Row ${i + 1}`;
    try {
      if (options?.idorCheck && !(await options.idorCheck(c.entity, ctx))) {
        failures.push({ row: i, name, reason: "Property not found in your organization" });
        continue;
      }
      await createFn(ctx, c.entity);
      created++;
    } catch (err) {
      log.warn("ingestion persist row failed", { row: i, err: String(err) });
      failures.push({ row: i, name, reason: "Could not be created — check the required fields." });
    }
  }

  return { created, failures };
}
