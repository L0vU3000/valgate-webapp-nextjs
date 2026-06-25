"use server";


import { requireCtx } from "@/lib/auth/ctx";
import type { ActionResult } from "@/app/actions/_result";
import { revalidateFeTag, NOT_IMPLEMENTED_UNTIL_B6 } from "@/app/actions/_result";
import { UserProfilePatchSchema } from "@/lib/data/types/user-profile";
import type { UserProfile } from "@/lib/data/types/user-profile";
import { upsertUserProfile as svcUpsert } from "@/lib/services/user-profiles";

export async function updateUserProfile(patch: unknown): Promise<ActionResult<UserProfile>> {
  const parsed = UserProfilePatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Invalid user profile" };
  const ctx = await requireCtx();
  try {
    const result = await svcUpsert(ctx, parsed.data);
    revalidateFeTag("user-profiles");
    return { ok: true, data: result };
  } catch (err) {
    console.error("updateUserProfile", err);
    return { ok: false, error: "Could not update user profile" };
  }
}
