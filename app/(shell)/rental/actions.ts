"use server";

import { createTenant } from "@/app/actions/tenants";
import { createLease } from "@/app/actions/leases";
import type { ActionResult } from "@/app/actions/_result";
import type { Tenant, NewTenant } from "@/lib/data/types/tenant";
import type { Lease, NewLease } from "@/lib/data/types/lease";
import { logger } from "@/lib/logger";

export async function createTenantAndLease(input: {
  tenant: NewTenant;
  lease: Omit<NewLease, "tenantId">;
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
