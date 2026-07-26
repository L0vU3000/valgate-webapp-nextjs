"use server";


import { requireCtx } from "@/lib/auth/ctx";
import type { ActionResult } from "@/app/actions/_result";
import { revalidateFeTag } from "@/app/actions/_result";
import { NewUtilityAccountSchema, UtilityAccountPatchSchema } from "@/lib/data/types/utility-account";
import type { UtilityAccount } from "@/lib/data/types/utility-account";
import {
  createUtilityAccount as svcCreateUtilityAccount,
  updateUtilityAccount as svcUpdateUtilityAccount,
  deleteUtilityAccount as svcDeleteUtilityAccount,
} from "@/lib/services/utility-accounts";
import { bustCache } from "@/lib/cache/bust";

export async function createUtilityAccount(data: unknown): Promise<ActionResult<UtilityAccount>> {
  const parsed = NewUtilityAccountSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Invalid utility account" };
  const ctx = await requireCtx();
  try {
    const result = await svcCreateUtilityAccount(ctx, parsed.data);
    revalidateFeTag("utility-accounts");
    await bustCache("utility-accounts");
    return { ok: true, data: result };
  } catch (err) {
    console.error("createUtilityAccount", err);
    return { ok: false, error: "Could not create utility account" };
  }
}

export async function updateUtilityAccount(id: string, patch: unknown): Promise<ActionResult<UtilityAccount>> {
  const parsed = UtilityAccountPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Invalid utility account" };
  const ctx = await requireCtx();
  try {
    const result = await svcUpdateUtilityAccount(ctx, id, parsed.data);
    if (!result) return { ok: false, error: "Utility account not found" };
    revalidateFeTag("utility-accounts");
    await bustCache("utility-accounts");
    return { ok: true, data: result };
  } catch (err) {
    console.error("updateUtilityAccount", err);
    return { ok: false, error: "Could not update utility account" };
  }
}

export async function deleteUtilityAccount(id: string): Promise<ActionResult<void>> {
  const ctx = await requireCtx();
  try {
    await svcDeleteUtilityAccount(ctx, id);
    revalidateFeTag("utility-accounts");
    await bustCache("utility-accounts");
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("deleteUtilityAccount", err);
    return { ok: false, error: "Could not delete utility account" };
  }
}
