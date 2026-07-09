"use server";

import type { FormData as WizardForm } from "@/app/_shared/add-property/types";
import { fullPropertySchema } from "@/app/_shared/add-property/schemas";
import { mapWizardToProperty } from "@/app/_shared/add-property/map-to-property";
import { createProperty } from "@/app/actions/properties";
import { convertDraftToDocumentsAction } from "@/app/actions/property-drafts";
import { logger } from "@/lib/logger";

export async function submitPropertyAction(
  form: WizardForm,
  draftId?: string,
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

    // 1. Create the property first (so a later file step failing can't lose the property).
    const propertyInput = mapWizardToProperty(form);
    const result = await createProperty(propertyInput);
    if (!result.ok) return { ok: false, error: result.error };

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

    return { ok: true, propertyId: result.data.id, propertyCode: result.data.code, fileNotice };
  } catch (err) {
    logger.error("submitPropertyAction failed", { err: String(err) });
    return { ok: false, error: "Failed to submit property. Please try again." };
  }
}
