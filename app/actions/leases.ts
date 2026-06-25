"use server";


import { requireCtx } from "@/lib/auth/ctx";
import type { ActionResult } from "@/app/actions/_result";
import { revalidateFeTag, NOT_IMPLEMENTED_UNTIL_B6 } from "@/app/actions/_result";
import { NewLeaseSchema, LeasePatchSchema } from "@/lib/data/types/lease";
import type { Lease } from "@/lib/data/types/lease";
import {
  createLease as svcCreateLease,
  updateLease as svcUpdateLease,
  deleteLease as svcDeleteLease,
} from "@/lib/services/leases";

export async function createLease(data: unknown): Promise<ActionResult<Lease>> {
  const parsed = NewLeaseSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Invalid lease" };
  const ctx = await requireCtx();
  try {
    const result = await svcCreateLease(ctx, parsed.data);
    revalidateFeTag("leases");
    return { ok: true, data: result };
  } catch (err) {
    console.error("createLease", err);
    return { ok: false, error: "Could not create lease" };
  }
}

export async function updateLease(id: string, patch: unknown): Promise<ActionResult<Lease>> {
  const parsed = LeasePatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Invalid lease" };
  const ctx = await requireCtx();
  try {
    const result = await svcUpdateLease(ctx, id, parsed.data);
    if (!result) return { ok: false, error: "Lease not found" };
    revalidateFeTag("leases");
    return { ok: true, data: result };
  } catch (err) {
    console.error("updateLease", err);
    return { ok: false, error: "Could not update lease" };
  }
}

export async function deleteLease(id: string): Promise<ActionResult<void>> {
  const ctx = await requireCtx();
  try {
    await svcDeleteLease(ctx, id);
    revalidateFeTag("leases");
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("deleteLease", err);
    return { ok: false, error: "Could not delete lease" };
  }
}
