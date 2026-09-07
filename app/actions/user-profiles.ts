"use server";


import { requireCtx } from "@/lib/auth/ctx";
import type { ActionResult } from "@/app/actions/_result";
import { actionLimiter, allowed } from "@/lib/ratelimit";
import { revalidateFeTag, TOO_MANY_REQUESTS } from "@/app/actions/_result";
import { UserProfilePatchSchema } from "@/lib/data/types/user-profile";
import type { UserProfile } from "@/lib/data/types/user-profile";
import { upsertUserProfile as svcUpsert } from "@/lib/services/user-profiles";

export async function updateUserProfile(patch: unknown): Promise<ActionResult<UserProfile>> {
  const parsed = UserProfilePatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Invalid user profile" };
  const ctx = await requireCtx();
  if (!(await allowed(actionLimiter, ctx.userId, "updateUserProfile"))) return TOO_MANY_REQUESTS;
  try {
    const result = await svcUpsert(ctx, parsed.data);
    revalidateFeTag("user-profiles");
    return { ok: true, data: result };
  } catch (err) {
    console.error("updateUserProfile", err);
    return { ok: false, error: "Could not update user profile" };
  }
}
