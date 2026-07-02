"use server";

import { z } from "zod";
import { updateSafetyRisk } from "@/lib/services/safety-risks";
import { requireCtx } from "@/lib/auth/ctx";
import { logger } from "@/lib/logger";
import { logActivity } from "@/lib/services/activity";
import { revalidatePro, type ProActionResult } from "./_lib/revalidate";

// --- Compliance -------------------------------------------------------------

const resolveSafetyRiskSchema = z.object({
  riskId: z.string().min(1),
});

// Marks an open safety risk as Resolved and stamps the resolution time.
// One-way and one-click (no modal), matching "Mark paid" and the work-order
// status flips — a resolution captures no extra input.
export async function resolveSafetyRisk(input: {
  riskId: string;
}): Promise<ProActionResult> {
  const parsed = resolveSafetyRiskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const authCtx = await requireCtx();
  const updated = await updateSafetyRisk(authCtx, parsed.data.riskId, {
    status: "Resolved",
    resolvedAt: Date.now(),
  });
  if (!updated) {
    logger.error("resolveSafetyRisk: risk not found", input);
    return { ok: false, error: "Could not resolve this risk." };
  }
  try {
    await logActivity(authCtx, {
      entity: "safetyRisk",
      action: "updated",
      entityId: parsed.data.riskId,
      summary: `Safety risk ${parsed.data.riskId} resolved`,
    });
  } catch (err) {
    console.error("resolveSafetyRisk: audit log failed", err);
  }
  revalidatePro();
  return { ok: true };
}
