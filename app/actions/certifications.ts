"use server";


import { requireCtx } from "@/lib/auth/ctx";
import type { ActionResult } from "@/app/actions/_result";
import { revalidateFeTag, NOT_IMPLEMENTED_UNTIL_B6 } from "@/app/actions/_result";
import { NewCertificationSchema, CertificationPatchSchema } from "@/lib/data/types/certification";
import type { Certification } from "@/lib/data/types/certification";
import {
  createCertification as svcCreateCertification,
  updateCertification as svcUpdateCertification,
  deleteCertification as svcDeleteCertification,
} from "@/lib/services/certifications";
import { bustCache } from "@/lib/cache/bust";

export async function createCertification(data: unknown): Promise<ActionResult<Certification>> {
  const parsed = NewCertificationSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Invalid certification" };
  const ctx = await requireCtx();
  try {
    const result = await svcCreateCertification(ctx, parsed.data);
    revalidateFeTag("certifications");
    await bustCache("certifications");
    return { ok: true, data: result };
  } catch (err) {
    console.error("createCertification", err);
    return { ok: false, error: "Could not create certification" };
  }
}

export async function updateCertification(id: string, patch: unknown): Promise<ActionResult<Certification>> {
  const parsed = CertificationPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Invalid certification" };
  const ctx = await requireCtx();
  try {
    const result = await svcUpdateCertification(ctx, id, parsed.data);
    if (!result) return { ok: false, error: "Certification not found" };
    revalidateFeTag("certifications");
    await bustCache("certifications");
    return { ok: true, data: result };
  } catch (err) {
    console.error("updateCertification", err);
    return { ok: false, error: "Could not update certification" };
  }
}

export async function deleteCertification(id: string): Promise<ActionResult<void>> {
  const ctx = await requireCtx();
  try {
    await svcDeleteCertification(ctx, id);
    revalidateFeTag("certifications");
    await bustCache("certifications");
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("deleteCertification", err);
    return { ok: false, error: "Could not delete certification" };
  }
}
