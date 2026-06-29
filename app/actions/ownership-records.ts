"use server";


import { requireCtx } from "@/lib/auth/ctx";
import type { ActionResult } from "@/app/actions/_result";
import { revalidateFeTag } from "@/app/actions/_result";
import { NewOwnershipRecordSchema, OwnershipRecordPatchSchema } from "@/lib/data/types/ownership-record";
import type { OwnershipRecord } from "@/lib/data/types/ownership-record";
import {
  createOwnershipRecord as svcCreateOwnershipRecord,
  updateOwnershipRecord as svcUpdateOwnershipRecord,
  deleteOwnershipRecord as svcDeleteOwnershipRecord,
  getOwnershipRecord as svcGetOwnershipRecord,
} from "@/lib/services/ownership-records";
import { submitVerification, revokeVerification } from "@/lib/services/verification";
import { verifyLimiter, allowed } from "@/lib/ratelimit";
import { log } from "@/lib/log";
import { bustCache } from "@/lib/cache/bust";

export async function createOwnershipRecord(data: unknown): Promise<ActionResult<OwnershipRecord>> {
  const parsed = NewOwnershipRecordSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Invalid ownership record" };
  const ctx = await requireCtx();
  try {
    const result = await svcCreateOwnershipRecord(ctx, parsed.data);
    revalidateFeTag("ownership-records");
    await bustCache("ownership-records");
    return { ok: true, data: result };
  } catch (err) {
    console.error("createOwnershipRecord", err);
    return { ok: false, error: "Could not create ownership record" };
  }
}

export async function updateOwnershipRecord(id: string, patch: unknown): Promise<ActionResult<OwnershipRecord>> {
  const parsed = OwnershipRecordPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Invalid ownership record" };
  const ctx = await requireCtx();
  try {
    const result = await svcUpdateOwnershipRecord(ctx, id, parsed.data);
    if (!result) return { ok: false, error: "Ownership record not found" };
    revalidateFeTag("ownership-records");
    await bustCache("ownership-records");
    return { ok: true, data: result };
  } catch (err) {
    console.error("updateOwnershipRecord", err);
    return { ok: false, error: "Could not update ownership record" };
  }
}

export async function deleteOwnershipRecord(id: string): Promise<ActionResult<void>> {
  const ctx = await requireCtx();
  try {
    await svcDeleteOwnershipRecord(ctx, id);
    revalidateFeTag("ownership-records");
    await bustCache("ownership-records");
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("deleteOwnershipRecord", err);
    return { ok: false, error: "Could not delete ownership record" };
  }
}


import { getOwnershipWizardInitial } from "@/lib/data/wizards";
import type { CoOwner } from "@/lib/data/types/co-owner";

export async function verifyOwnership(id: string, evidenceDocIds: string[]): Promise<ActionResult<OwnershipRecord>> {
  const ctx = await requireCtx();
  if (!(await allowed(verifyLimiter, ctx.userId))) {
    log.warn("ratelimit.block", { edge: "verifyOwnership", userId: ctx.userId });
    return { ok: false, error: "Too many attempts. Try again shortly." }; // C5 generic
  }
  try {
    const rec = await svcGetOwnershipRecord(ctx, id);
    if (!rec) return { ok: false, error: "Ownership record not found" };
    await submitVerification(ctx, rec.propertyId, "ownership", evidenceDocIds, id);
    revalidateFeTag("ownership-records");
    await bustCache("ownership-records");
    const updated = await svcGetOwnershipRecord(ctx, id);
    if (!updated) return { ok: false, error: "Ownership record not found" };
    return { ok: true, data: updated };
  } catch (err) {
    console.error("verifyOwnership", err);
    return { ok: false, error: "Could not verify ownership" };
  }
}

export async function revokeOwnershipVerification(id: string): Promise<ActionResult<OwnershipRecord>> {
  const ctx = await requireCtx();
  if (!(await allowed(verifyLimiter, ctx.userId))) {
    log.warn("ratelimit.block", { edge: "revokeOwnershipVerification", userId: ctx.userId });
    return { ok: false, error: "Too many attempts. Try again shortly." }; // C5 generic
  }
  try {
    const rec = await svcGetOwnershipRecord(ctx, id);
    if (!rec) return { ok: false, error: "Ownership record not found" };
    await revokeVerification(ctx, rec.propertyId, "ownership", id);
    revalidateFeTag("ownership-records");
    await bustCache("ownership-records");
    const updated = await svcGetOwnershipRecord(ctx, id);
    if (!updated) return { ok: false, error: "Ownership record not found" };
    return { ok: true, data: updated };
  } catch (err) {
    console.error("revokeOwnershipVerification", err);
    return { ok: false, error: "Could not revoke ownership verification" };
  }
}

export async function getOwnershipWizardInitialAction(
  propertyId: string,
): Promise<ActionResult<{ record: OwnershipRecord | null; coOwners: CoOwner[] }>> {
  const ctx = await requireCtx();
  const data = await getOwnershipWizardInitial(ctx, propertyId);
  return { ok: true, data };
}
