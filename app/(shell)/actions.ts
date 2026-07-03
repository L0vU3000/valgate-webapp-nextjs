"use server";
import { z } from "zod";
import { requireCtx } from "@/lib/auth/ctx";
import { markWelcomeSeen } from "@/lib/services/client-onboarding";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

const handoffIdSchema = z.string().min(1).max(64).regex(/^CHO-/);

// Dismisses the client's one-time "your manager created this portfolio" welcome banner.
// Scoped to the caller's own org inside markWelcomeSeen — no IDOR path.
export async function dismissWelcomeMessageAction(handoffId: string): Promise<{ ok: boolean; error?: string }> {
  const parsed = handoffIdSchema.safeParse(handoffId);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  try {
    const ctx = await requireCtx();
    await markWelcomeSeen(ctx, parsed.data);
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    logger.error("dismissWelcomeMessageAction failed", { handoffId, error: String(err) });
    return { ok: false, error: "Could not dismiss the welcome message." };
  }
}
