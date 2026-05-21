"use server";

import { createTenant } from "@/lib/actions/tenants.actions";
import { createLease } from "@/lib/actions/leases.actions";
import type { ActionResult } from "@/lib/actions/properties.actions";
import type { Tenant } from "@/lib/data/types/tenant";
import type { Lease } from "@/lib/data/types/lease";
import * as tenantDb from "@/lib/data/db/tenants";
import * as leaseDb from "@/lib/data/db/leases";
import { logger } from "@/lib/logger";

export async function createTenantAndLease(input: {
  tenant: tenantDb.NewTenant;
  lease: Omit<leaseDb.NewLease, "tenantId">;
}): Promise<ActionResult<{ tenant: Tenant; lease: Lease }>> {
  const tenantResult = await createTenant(input.tenant);
  if (!tenantResult.ok) return tenantResult;
  const leaseResult = await createLease({ ...input.lease, tenantId: tenantResult.data.id });
  if (!leaseResult.ok) {
    logger.error("createTenantAndLease: lease creation failed (tenant orphan)", { tenantId: tenantResult.data.id });
    return { ok: false, error: "Failed to create lease." };
  }
  return { ok: true, data: { tenant: tenantResult.data, lease: leaseResult.data } };
}
