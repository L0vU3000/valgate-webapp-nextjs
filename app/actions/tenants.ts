"use server";


import { requireCtx } from "@/lib/auth/ctx";
import type { ActionResult } from "@/app/actions/_result";
import { revalidateFeTag } from "@/app/actions/_result";
import { NewTenantSchema, TenantPatchSchema } from "@/lib/data/types/tenant";
import type { Tenant } from "@/lib/data/types/tenant";
import {
  createTenant as svcCreateTenant,
  updateTenant as svcUpdateTenant,
  deleteTenant as svcDeleteTenant,
} from "@/lib/services/tenants";
import { bustCache } from "@/lib/cache/bust";

export async function createTenant(data: unknown): Promise<ActionResult<Tenant>> {
  const parsed = NewTenantSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Invalid tenant" };
  const ctx = await requireCtx();
  try {
    const result = await svcCreateTenant(ctx, parsed.data);
    revalidateFeTag("tenants");
    await bustCache("tenants");
    return { ok: true, data: result };
  } catch (err) {
    console.error("createTenant", err);
    return { ok: false, error: "Could not create tenant" };
  }
}

export async function updateTenant(id: string, patch: unknown): Promise<ActionResult<Tenant>> {
  const parsed = TenantPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Invalid tenant" };
  const ctx = await requireCtx();
  try {
    const result = await svcUpdateTenant(ctx, id, parsed.data);
    if (!result) return { ok: false, error: "Tenant not found" };
    revalidateFeTag("tenants");
    await bustCache("tenants");
    return { ok: true, data: result };
  } catch (err) {
    console.error("updateTenant", err);
    return { ok: false, error: "Could not update tenant" };
  }
}

export async function deleteTenant(id: string): Promise<ActionResult<void>> {
  const ctx = await requireCtx();
  try {
    await svcDeleteTenant(ctx, id);
    revalidateFeTag("tenants");
    await bustCache("tenants");
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("deleteTenant", err);
    return { ok: false, error: "Could not delete tenant" };
  }
}
