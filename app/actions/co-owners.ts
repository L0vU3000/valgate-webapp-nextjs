"use server";


import { requireCtx } from "@/lib/auth/ctx";
import type { ActionResult } from "@/app/actions/_result";
import { revalidateFeTag, NOT_IMPLEMENTED_UNTIL_B6 } from "@/app/actions/_result";
import { NewCoOwnerSchema, CoOwnerPatchSchema } from "@/lib/data/types/co-owner";
import type { CoOwner } from "@/lib/data/types/co-owner";
import {
  createCoOwner as svcCreateCoOwner,
  updateCoOwner as svcUpdateCoOwner,
  deleteCoOwner as svcDeleteCoOwner,
  getCoOwner as svcGetCoOwner,
  listCoOwners,
} from "@/lib/services/co-owners";
import { logActivity } from "@/lib/services/activity";
import { bustCache } from "@/lib/cache/bust";

export async function createCoOwner(data: unknown): Promise<ActionResult<CoOwner>> {
  const parsed = NewCoOwnerSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Invalid co-owner" };
  const ctx = await requireCtx();
  try {
    const result = await svcCreateCoOwner(ctx, parsed.data);
    revalidateFeTag("co-owners");
    await bustCache("co-owners");
    return { ok: true, data: result };
  } catch (err) {
    console.error("createCoOwner", err);
    return { ok: false, error: "Could not create co-owner" };
  }
}

export async function updateCoOwner(id: string, patch: unknown): Promise<ActionResult<CoOwner>> {
  const parsed = CoOwnerPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Invalid co-owner" };
  const ctx = await requireCtx();
  try {
    const result = await svcUpdateCoOwner(ctx, id, parsed.data);
    if (!result) return { ok: false, error: "Co-owner not found" };
    revalidateFeTag("co-owners");
    await bustCache("co-owners");
    return { ok: true, data: result };
  } catch (err) {
    console.error("updateCoOwner", err);
    return { ok: false, error: "Could not update co-owner" };
  }
}

export async function removeCoOwner(id: string): Promise<ActionResult<void>> {
  const ctx = await requireCtx();
  try {
    // Ownership (IDOR) check: confirm the co-owner exists within the caller's org before
    // deleting. scopedDelete is already org-scoped, but reading first lets us return a
    // clean "not found" instead of silently no-op'ing on a cross-org id.
    const existing = await svcGetCoOwner(ctx, id);
    if (!existing) return { ok: false, error: "Co-owner not found" };
    await svcDeleteCoOwner(ctx, id);
    try {
      await logActivity(ctx, {
        entity: "coOwner",
        action: "deleted",
        entityId: id,
        summary: `Co-owner ${id} removed`,
        propertyId: existing.propertyId,
      });
    } catch (err) {
      console.error("removeCoOwner: audit log failed", err);
    }
    // Removing a co-owner re-balances the ownership split automatically: the primary
    // owner's share is derived as 100 − sum(co-owner shares), so dropping a co-owner row
    // is all the rebalance the UI needs (it recomputes on the refreshed list).
    revalidateFeTag("co-owners");
    await bustCache("co-owners");
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("removeCoOwner", err);
    return { ok: false, error: "Could not remove co-owner" };
  }
}

export async function listCoOwnersForPropertyAction(propertyId: string): Promise<ActionResult<CoOwner[]>> {
  const ctx = await requireCtx();
  return { ok: true, data: await listCoOwners(ctx, propertyId) };
}
