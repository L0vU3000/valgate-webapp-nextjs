/**
 * One-time backfill: set payments.property_id from the linked lease for rows
 * where property_id is currently NULL.
 *
 * Background: createPayment() has populated property_id at insert time since the
 * initial schema, but older seed rows (or rows created before that logic landed)
 * may have NULL. This script fills the gap so that listPayments(ctx, propertyId)
 * returns accurate results immediately after the Phase 1 DB-filter deploy.
 *
 * Safe to re-run: the WHERE p.property_id IS NULL clause skips already-filled rows.
 *
 * Usage:
 *   npx tsx scripts/backfill-payments-property-id.ts
 */
import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Backfilling payments.property_id from the linked lease...");

  const result = await db.execute(sql`
    UPDATE payments p
    SET property_id = l.property_id
    FROM leases l
    WHERE p.lease_id = l.id
      AND p.property_id IS NULL
  `);

  const rowsUpdated = result.rowCount ?? 0;
  console.log(`Done. ${rowsUpdated} payment row(s) updated.`);
  process.exit(0);
}

void main();
