"use server";
import { z } from "zod";
import { upsertUserProfile } from "@/lib/services/user-profiles";
import { requireCtx } from "@/lib/auth/ctx";

const SaveProfileInfoSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  jobTitle: z.string().optional(),
  employeeId: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  officeLocation: z.string().optional(),
  language: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
});

export async function saveProfileInfo(patch: unknown) {
  const result = SaveProfileInfoSchema.safeParse(patch);
  if (!result.success) return { ok: false, error: "Invalid input" };
  try {
    const ctx = await requireCtx();
    if (ctx.orgRole !== "owner") return { ok: false, error: "Only organization owners can make changes." };
    await upsertUserProfile(ctx, result.data);
    return { ok: true };
  } catch (err) {
    console.error("saveProfileInfo", err);
    return { ok: false, error: "Could not save profile." };
  }
}
