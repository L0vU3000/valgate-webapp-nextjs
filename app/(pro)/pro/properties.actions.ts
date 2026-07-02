"use server";

import { z } from "zod";
import { getClientRecord } from "@/lib/services/client-records";
import { updateProperty, createProperty as svcCreateProperty, bulkAssignProperties as svcBulkAssign, listPropertyNamesByClientId } from "@/lib/services/properties";
import { propertyTypeChoiceSchema, propertyStatusSchema, propertyTitleSchema } from "@/lib/data/types/property";
import { requireCtx } from "@/lib/auth/ctx";
import { logger } from "@/lib/logger";
import { revalidatePro, type ProActionResult } from "./_lib/revalidate";

// --- Property assignment & import -------------------------------------------

const assignPropertiesSchema = z.object({
  clientId: z.string().min(1),
  propertyIds: z.array(z.string().min(1)).min(1),
});

export async function assignProperties(input: {
  clientId: string;
  propertyIds: string[];
}): Promise<ProActionResult> {
  const parsed = assignPropertiesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const authCtx = await requireCtx();
  // Ownership-scoped Drizzle read (IDOR guard) — the FS record is retired.
  const client = await getClientRecord(authCtx, parsed.data.clientId);
  if (!client) {
    logger.error("assignProperties: client not found", input);
    return { ok: false, error: "Could not assign properties." };
  }

  const result = await svcBulkAssign(authCtx, client.id, authCtx.orgId, parsed.data.propertyIds);
  if (result.conflicts.length > 0) {
    logger.warn("assignProperties: conflicts", { conflicts: result.conflicts });
  }

  revalidatePro();
  return { ok: true };
}

const csvPropertySchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: propertyTypeChoiceSchema,
  status: propertyStatusSchema,
  totalArea: z.string().min(1, "Total area is required"),
  title: propertyTitleSchema,
  buyNumeric: z.coerce.number().nonnegative("Buy numeric must be >= 0").default(0),
  lat: z.coerce.number().default(0),
  lng: z.coerce.number().default(0),
  addressLine: z.string().optional().default(""),
  city: z.string().optional().default(""),
  zip: z.string().optional().default(""),
  country: z.string().optional().default(""),
  province: z.string().optional().default(""),
  yearBuilt: z.string().optional().default(""),
  bedrooms: z.string().optional().default(""),
  bathrooms: z.string().optional().default(""),
  parkingSpaces: z.string().optional().default(""),
  purchasePrice: z.string().optional().default(""),
  currentMarketValue: z.coerce.number().optional().default(0),
});

const importCsvSchema = z.object({
  clientId: z.string().min(1),
  rows: z.array(csvPropertySchema).min(1),
});

export async function importCsvProperties(input: {
  clientId: string;
  rows: unknown[];
  // When true, skip the name-dedup check and import even if a property with
  // the same name already exists for this client. Useful when the manager
  // intentionally has two properties with the same name (e.g. two units called
  // "Apartment A").
  createAnyway?: boolean;
}): Promise<ProActionResult> {
  // Validate clientId + rows via Zod. createAnyway is a trusted boolean from
  // our own UI — no need to put it through the schema.
  const parsed = importCsvSchema.safeParse({ clientId: input.clientId, rows: input.rows });
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return { ok: false, error: `Invalid CSV data: ${issues}` };
  }

  const authCtx = await requireCtx();

  // Ownership-scoped Drizzle read (IDOR guard) — confirm the target client
  // actually belongs to this manager BEFORE we create any properties and stamp
  // that clientId onto them. Client ids are short and guessable (CLI-xxxx), so
  // without this check a manager could stamp their own new properties with
  // another manager's clientId. Mirrors the same guard in `assignProperties`.
  const client = await getClientRecord(authCtx, parsed.data.clientId);
  if (!client) {
    logger.error("importCsvProperties: client not found", { clientId: parsed.data.clientId });
    return { ok: false, error: "Could not import properties." };
  }

  // Pre-load existing property names for this client so we can detect duplicates
  // without a DB query per row (avoids N+1). Returns an empty Set when the client
  // has no properties yet, so first-time imports are unaffected.
  const existingNames = input.createAnyway
    ? new Set<string>()
    : await listPropertyNamesByClientId(authCtx, client.id);

  let createdCount = 0;
  const skippedRows: Array<{ row: number; reason: string }> = [];

  for (let i = 0; i < parsed.data.rows.length; i++) {
    const row = parsed.data.rows[i];
    const rowNumber = i + 1; // 1-based so the UI can say "Row 3: …"

    // Dedupe: skip rows whose name matches an existing property for this client
    // (case-insensitive). The createAnyway flag bypasses this when the manager
    // explicitly wants duplicates.
    if (!input.createAnyway && existingNames.has(row.name.toLowerCase())) {
      skippedRows.push({ row: rowNumber, reason: "duplicate of an existing property" });
      continue;
    }

    // Skip-don't-fail: a single bad row (e.g. invalid type string, DB constraint)
    // must never abort the whole batch. Log internally; surface a per-row reason.
    try {
      const result = await svcCreateProperty(authCtx, row);
      if (!result) {
        skippedRows.push({ row: rowNumber, reason: "could not create property" });
        continue;
      }
      await updateProperty(authCtx, result.id, { clientId: client.id });
      createdCount++;
    } catch (err) {
      logger.error("importCsvProperties: row failed", { row: rowNumber, error: String(err) });
      skippedRows.push({ row: rowNumber, reason: "could not create property" });
    }
  }

  revalidatePro();
  return { ok: true, count: createdCount, skipped: skippedRows };
}
