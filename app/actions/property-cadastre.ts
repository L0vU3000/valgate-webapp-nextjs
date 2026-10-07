"use server";

import { requireCtx } from "@/lib/auth/ctx";
import { logger } from "@/lib/logger";
import { allowed, actionLimiter } from "@/lib/ratelimit";
import { getProperty } from "@/lib/services/properties";
import { roleAtLeast } from "@/lib/services/_mapping";
import { attachCadastralParcel } from "@/lib/services/property-boundary";
import { revalidateFeTag } from "@/app/actions/_result";
import { bustCache } from "@/lib/cache/bust";
import type { CadastreChoice } from "@/app/(shell)/add-property/_components/LocationPickerModal";

export type AttachCadastreResult = { ok: true } | { ok: false; error: string };

/**
 * Attach the cadastral parcel a user picked to a property that ALREADY EXISTS.
 *
 * The add-property wizard cannot use this — its property has no id yet — so it carries the choice
 * to submit. Both paths converge on the same service call, so the pin rule and the replace rule
 * cannot drift between them.
 *
 * Validation of the input is deliberately minimal here: the client sends an id and a point, the
 * point is re-resolved against the cadastre server-side (so the geometry is never taken from the
 * client), and the service re-checks org ownership.
 */
export async function attachPropertyCadastre(
  propertyId: string,
  choice: CadastreChoice,
): Promise<AttachCadastreResult> {
  const ctx = await requireCtx();
  if (!(await allowed(actionLimiter, ctx.userId, "attachCadastre"))) {
    return { ok: false, error: "Too many requests. Please wait a moment and try again." };
  }

  if (typeof propertyId !== "string" || !propertyId) {
    return { ok: false, error: "Missing property." };
  }
  const [lng, lat] = choice?.point ?? [];
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return { ok: false, error: "Missing location for the parcel." };
  }

  try {
    // Org-scoped read, so a cross-org id is indistinguishable from a missing one.
    const property = await getProperty(ctx, propertyId);
    if (!property) return { ok: false, error: "Property not found." };
    if (!roleAtLeast(ctx.orgRole, "member")) {
      return { ok: false, error: "You do not have permission to change this property." };
    }

    await attachCadastralParcel(ctx, {
      propertyId,
      ref: choice.ref,
      point: [lng, lat],
      movePin: true,
    });
    revalidateFeTag("properties");
    await bustCache("properties");
    return { ok: true };
  } catch (err) {
    // Log the real cause, return a generic string — the same rule every boundary path follows.
    logger.error("attachPropertyCadastre failed", { err: String(err) });
    return { ok: false, error: "Could not attach that parcel. Please try again." };
  }
}
