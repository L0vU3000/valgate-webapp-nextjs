"use server";

import { z } from "zod";
import { updateSafetyRisk } from "@/lib/services/safety-risks";
import { safetyRisks } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { logActivity } from "@/lib/services/activity";
import { bustCache } from "@/lib/cache/bust";
import { resolveOnBehalfForRow } from "./_lib/on-behalf";
import { proposeChangeAction } from "./change-requests.actions";
import { revalidatePro, type ProActionResult } from "./_lib/revalidate";

// --- Compliance -------------------------------------------------------------

const resolveSafetyRiskSchema = z.object({
  riskId: z.string().min(1),
});

// Marks an open safety risk as Resolved and stamps the resolution time.
// One-way and one-click (no modal), matching "Mark paid" and the work-order
// status flips — a resolution captures no extra input.
//
// Phase 2 (align-client-manager-parity): routes through the audited path. The risk's
// owning org is resolved server-side — own-portfolio / draft clients write directly, while
// an accepted client's risk flows through change_requests (full grant applies, viewer proposes).
export async function resolveSafetyRisk(input: {
  riskId: string;
}): Promise<ProActionResult> {
  const parsed = resolveSafetyRiskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const routing = await resolveOnBehalfForRow(safetyRisks, parsed.data.riskId);
  if (!routing) return { ok: false, error: "Could not resolve this risk." };

  const patch = { status: "Resolved" as const, resolvedAt: Date.now() };

  // Accepted client → audited change_requests path (proposeChangeAction re-derives the
  // grant server-side and applies or proposes accordingly).
  if (routing.audited) {
    const result = await proposeChangeAction({
      clientId: routing.clientId,
      entityType: "safety-risk",
      entityId: parsed.data.riskId,
      operation: "update",
      patch,
    });
    if (!result.ok) return { ok: false, error: result.error ?? "Could not resolve this risk." };
    revalidatePro();
    return { ok: true };
  }

  // Own portfolio / draft client → direct write under the manager's own ctx.
  const updated = await updateSafetyRisk(routing.ctx, parsed.data.riskId, patch);
  if (!updated) {
    logger.error("resolveSafetyRisk: risk not found", input);
    return { ok: false, error: "Could not resolve this risk." };
  }
  // Bust the Upstash cached-read tag so the risk leaves the open list immediately — the
  // audited path busts via ENTITY_CACHE_TAGS; the direct path must do it here.
  await bustCache("safety-risks");
  try {
    await logActivity(routing.ctx, {
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
