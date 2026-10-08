"use server";

import type { FormData as WizardForm } from "@/app/_shared/add-property/types";
import { fullPropertySchema } from "@/app/_shared/add-property/schemas";
import { mapWizardToProperty } from "@/app/_shared/add-property/map-to-property";
import { createProperty } from "@/app/actions/properties";
import { convertDraftToDocumentsAction } from "@/app/actions/property-drafts";
import { requireCtx } from "@/lib/auth/ctx";
import { attachCadastralParcel } from "@/lib/services/property-boundary";
import { logger } from "@/lib/logger";

export async function submitPropertyAction(
  form: WizardForm,
  draftId?: string,
  // The cadastral parcel the user picked in step 2, if any. It rides in as an argument rather than
  // on the form because it is not a property FIELD — it is a second write that can only happen
  // once the property has an id.
  cadastre?: { ref: string; point: [number, number] } | null,
): Promise<{ ok: boolean; propertyId?: string; propertyCode?: string; error?: string; fileNotice?: string }> {
  try {
    const parsed = fullPropertySchema.safeParse(form);
    if (!parsed.success) {
      logger.warn("submitPropertyAction validation failed", {
        issues: parsed.error.issues,
      });
      const first = parsed.error.issues[0];
      return {
        ok: false,
        error: first?.message ?? "Please review the form and try again.",
      };
    }

    // Refuse a property with no resolved coordinates. lib/services requires lat/lng, but
    // mapWizardToProperty silently falls back to the Cambodia centroid when form.mapCenter is
    // unset — so a property could be created at a country-centre guess, in the wrong province,
    // with no warning to the user. Guarding here (the server trust boundary) covers every wizard
    // entry path, including a resumed draft that never passed the step-2 gate.
    if (!form.mapCenter) {
      return {
        ok: false,
        error: "Please pick your address from the search suggestions so we can pin it on the map.",
      };
    }

    // 1. Create the property first (so a later file step failing can't lose the property).
    const propertyInput = mapWizardToProperty(form);
    const result = await createProperty(propertyInput);
    if (!result.ok) return { ok: false, error: result.error };

    // 1b. Attach the cadastral parcel the user picked. Deliberately AFTER the property exists but
    //     BEFORE the file step, and deliberately non-fatal: the property is already created and the
    //     pin is already right, so a cadastre hiccup must not report the whole submit as failed and
    //     invite a duplicate retry. It surfaces as a notice instead.
    let cadastreNotice: string | undefined;
    if (cadastre) {
      try {
        await attachCadastralParcel(await requireCtx(), {
          propertyId: result.data.id,
          ref: cadastre.ref,
          point: cadastre.point,
          movePin: true,
        });
      } catch (err) {
        logger.error("submitPropertyAction: cadastre attach failed", { err: String(err) });
        cadastreNotice =
          "Your property was saved, but the cadastral parcel didn't attach. You can set it from the property's Location tab.";
      }
    }

    // 2. Convert the draft's staged files into documents (reusing each storageId), then delete the
    //    draft ROWS ONLY — never the S3 objects, which now belong to the new documents. If this
    //    fails the property is still created; we just return a soft notice so the user can retry.
    let fileNotice: string | undefined;
    if (draftId) {
      const conversion = await convertDraftToDocumentsAction(draftId, result.data.id);
      if (!conversion.ok) {
        fileNotice = "Your property was created, but attaching the photos/documents didn't finish. They're safe — you can re-add them from the property page.";
      }
    }

    return {
      ok: true,
      propertyId: result.data.id,
      propertyCode: result.data.code,
      fileNotice: [fileNotice, cadastreNotice].filter(Boolean).join(" ") || undefined,
    };
  } catch (err) {
    logger.error("submitPropertyAction failed", { err: String(err) });
    return { ok: false, error: "Failed to submit property. Please try again." };
  }
}
