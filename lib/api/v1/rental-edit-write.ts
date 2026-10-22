import { z } from "zod";
import { LeasePatchSchema, NewLeaseSchema } from "@/lib/data/types/lease";
import type { Lease } from "@/lib/data/types/lease";
import { NewTenantSchema, TenantPatchSchema } from "@/lib/data/types/tenant";
import type { Tenant } from "@/lib/data/types/tenant";

// Bounded write body for PUT /api/v1/properties/{id}/rental/edit — the wizard's editable rental
// fields and nothing else.
//
// propertyId comes from the URL; the lease's stage, id and tenantId link, plus the tenant id, are
// decided server-side in planLease/planTenant, so a body cannot forge them. Unknown extra keys are
// stripped by Zod (not rejected), mirroring property-write.ts.
export const RentalEditBodySchema = z.object({
  lease: NewLeaseSchema.omit({ propertyId: true, stage: true, tenantId: true }),
  tenant: NewTenantSchema.omit({ propertyId: true }),
});

export type RentalEditBody = z.infer<typeof RentalEditBodySchema>;

export function parseRentalEditBody(
  raw: unknown,
): { ok: true; body: RentalEditBody } | { ok: false } {
  const result = RentalEditBodySchema.safeParse(raw);
  return result.success ? { ok: true, body: result.data } : { ok: false };
}

// The create-vs-update decision for one side of the upsert. id === null means "create".
export type PlannedWrite = { id: string | null; values: Record<string, unknown> };

// Empty strings are dropped rather than stored (the wizard does `|| undefined`), so a blank email
// or phone leaves an existing value alone instead of overwriting it with "".
const contact = (value: string | undefined) => value || undefined;

/**
 * Decides whether the primary tenant needs creating or updating, returning the exact values to
 * write. `existing` is the row the wizard would have edited (see pickPrimaryTenant), so the
 * server-side choice matches the wizard's without iOS replaying the wizard's two requests.
 */
export function planTenant(
  propertyId: string,
  body: RentalEditBody["tenant"],
  existing: Tenant | null,
): PlannedWrite {
  const fields = {
    name: body.name,
    unit: body.unit,
    rent: body.rent,
    status: body.status,
    email: contact(body.email),
    phone: contact(body.phone),
  };
  if (existing) {
    return { id: existing.id, values: TenantPatchSchema.parse(fields) };
  }
  return { id: null, values: NewTenantSchema.parse({ ...fields, propertyId }) };
}

/**
 * Decides whether the active lease needs creating or updating, returning the exact values to
 * write. Stage is always "Signed" (a lease the wizard edits is a signed one) and tenantId is the
 * tenant just upserted, so the lease always points at the tenant it was saved with.
 */
export function planLease(
  propertyId: string,
  body: RentalEditBody["lease"],
  existing: Lease | null,
  tenantId: string,
): PlannedWrite {
  const fields = {
    unit: body.unit,
    startDate: body.startDate,
    endDate: body.endDate,
    monthlyRent: body.monthlyRent,
    termMonths: body.termMonths,
    renewalStatus: body.renewalStatus || undefined,
    tenantId,
  };
  if (existing) {
    return { id: existing.id, values: LeasePatchSchema.parse(fields) };
  }
  return { id: null, values: NewLeaseSchema.parse({ ...fields, propertyId, stage: "Signed" }) };
}
