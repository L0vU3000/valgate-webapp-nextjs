"use server";

import { revalidateTag } from "next/cache";
import * as db from "@/lib/data/db/user-profiles";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import type { UserProfile } from "@/lib/data/types/user-profile";
import type { ActionResult } from "./properties.actions";

export async function updateUserProfile(
  patch: Partial<UserProfile>,
): Promise<ActionResult<UserProfile>> {
  const userId = getCurrentUserId();
  const profile = await db.upsert(userId, patch);
  revalidateTag("user-profiles");
  return { ok: true, data: profile };
}
