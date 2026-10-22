import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { leases, properties, tenants } from "@/lib/db/schema";
import type { Lease } from "@/lib/data/types/lease";
import type { Tenant } from "@/lib/data/types/tenant";
import { pickActiveLease, pickPrimaryTenant } from "@/lib/data/derivations/rental";
import { convertRowToDb } from "@/lib/db/column-classifier";
import { assertCanMutate, nextId, type Ctx } from "@/lib/services/_mapping";
import { requireMember } from "@/lib/services/_crud";
import { rowToLease, listLeases } from "@/lib/services/leases";
import { rowToTenant, listTenants } from "@/lib/services/tenants";
import { getProperty } from "@/lib/services/properties";
import { planLease, planTenant, type RentalEditBody } from "@/lib/api/v1/rental-edit-write";
import type { RentalEditSnapshot } from "@/lib/api/v1/rental-dto";

// Rental editing for the iOS "Edit rental" form, over HTTP.
//
// The web UI does this with two Server Actions (createLease/updateLease + createTenant/updateTenant)
// chosen from getRentalWizardInitial's lookup, which can partially fail: the lease lands and the
// tenant does not. Both sides of the edit therefore happen here, in ONE transaction, against the
// same lookup (pickActiveLease/pickPrimaryTenant), so iOS never reproduces the orchestration.

/** The rows the edit form edits — the same pair the wizard loads. Null when the property is absent or in another org. */
export async function getPropertyRentalEdit(
  ctx: Ctx,
  propertyId: string,
): Promise<RentalEditSnapshot | null> {
  // getProperty is org-scoped, so "missing" and "another org" are indistinguishable — both null.
  const property = await getProperty(ctx, propertyId);
  if (!property) return null;

  const [propertyLeases, propertyTenants] = await Promise.all([
    listLeases(ctx, propertyId),
    listTenants(ctx, propertyId),
  ]);

  return {
    lease: pickActiveLease(propertyLeases),
    tenant: pickPrimaryTenant(propertyTenants),
  };
}

/**
 * Creates or updates the active lease and the primary tenant in one transaction.
 *
 * Which side of each pair this is is decided server-side from the same lookup the wizard uses, so
 * a create path assigns the id, the stage ("Signed"), the tenantId link and the propertyId — none
 * of those are client-settable. Returns null when the property is absent or in another org.
 */
export async function upsertPropertyRental(
  ctx: Ctx,
  propertyId: string,
  body: RentalEditBody,
): Promise<RentalEditSnapshot | null> {
  assertCanMutate(); // D9 — demo mode refuses all writes
  requireMember(ctx);

  return db.transaction(async (tx) => {
    const [property] = await tx
      .select({ id: properties.id })
      .from(properties)
      .where(and(eq(properties.orgId, ctx.orgId), eq(properties.id, propertyId)));
    if (!property) return null;

    // Ordered and capped exactly like listLeases/listTenants, so the row this write picks
    // (pickActiveLease/pickPrimaryTenant take the first) is the row GET showed. An unordered
    // read here can pick a different sibling than the one the client displayed.
    const propertyLeases = (
      await tx
        .select()
        .from(leases)
        .where(and(eq(leases.orgId, ctx.orgId), eq(leases.propertyId, propertyId)))
        .orderBy(asc(leases.id))
        .limit(500)
    ).map(rowToLease);
    const propertyTenants = (
      await tx
        .select()
        .from(tenants)
        .where(and(eq(tenants.orgId, ctx.orgId), eq(tenants.propertyId, propertyId)))
        .orderBy(asc(tenants.id))
        .limit(500)
    ).map(rowToTenant);

    // Tenant first: the lease links to whichever tenant this write ends up with.
    const tenantPlan = planTenant(propertyId, body.tenant, pickPrimaryTenant(propertyTenants));
    let tenant: Tenant;
    if (tenantPlan.id) {
      const [row] = await tx
        .update(tenants)
        .set(convertRowToDb(tenants, tenantPlan.values))
        .where(and(eq(tenants.orgId, ctx.orgId), eq(tenants.id, tenantPlan.id)))
        .returning();
      if (!row) throw new Error("rental edit: tenant row disappeared");
      tenant = rowToTenant(row);
    } else {
      // nextId reads id_counters on the module-level db, so a rolled-back tx can burn an id — ids
      // stay unique, they are just not gapless (same tradeoff as submitVerification).
      // `as never` on the value bag matches scopedInsert: the domain→column mapping is dynamic,
      // so the row shape cannot be proven to drizzle statically.
      const values: Record<string, unknown> = {
        ...convertRowToDb(tenants, tenantPlan.values),
        id: await nextId("TEN", tenants),
        orgId: ctx.orgId,
        userId: ctx.userId,
        propertyId,
      };
      const [row] = await tx.insert(tenants).values(values as never).returning();
      if (!row) throw new Error("rental edit: tenant insert returned no row");
      tenant = rowToTenant(row);
    }

    const leasePlan = planLease(propertyId, body.lease, pickActiveLease(propertyLeases), tenant.id);
    let lease: Lease;
    if (leasePlan.id) {
      const [row] = await tx
        .update(leases)
        .set(convertRowToDb(leases, leasePlan.values))
        .where(and(eq(leases.orgId, ctx.orgId), eq(leases.id, leasePlan.id)))
        .returning();
      if (!row) throw new Error("rental edit: lease row disappeared");
      lease = rowToLease(row);
    } else {
      const values: Record<string, unknown> = {
        ...convertRowToDb(leases, leasePlan.values),
        id: await nextId("LEASE", leases),
        orgId: ctx.orgId,
        userId: ctx.userId,
        propertyId,
      };
      const [row] = await tx.insert(leases).values(values as never).returning();
      if (!row) throw new Error("rental edit: lease insert returned no row");
      lease = rowToLease(row);
    }

    return { lease, tenant };
  });
}
