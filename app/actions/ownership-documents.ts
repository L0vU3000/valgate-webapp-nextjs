"use server";


import { requireCtx } from "@/lib/auth/ctx";
import type { ActionResult } from "@/app/actions/_result";
import { revalidateFeTag, NOT_IMPLEMENTED_UNTIL_B6 } from "@/app/actions/_result";
import { NewOwnershipDocumentSchema, OwnershipDocumentPatchSchema } from "@/lib/data/types/ownership-document";
import type { OwnershipDocument } from "@/lib/data/types/ownership-document";
import {
  createOwnershipDocument as svcCreateOwnershipDocument,
  updateOwnershipDocument as svcUpdateOwnershipDocument,
  deleteOwnershipDocument as svcDeleteOwnershipDocument,
} from "@/lib/services/ownership-documents";
import { bustCache } from "@/lib/cache/bust";

export async function createOwnershipDocument(data: unknown): Promise<ActionResult<OwnershipDocument>> {
  const parsed = NewOwnershipDocumentSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Invalid ownership document" };
  const ctx = await requireCtx();
  try {
    const result = await svcCreateOwnershipDocument(ctx, parsed.data);
    revalidateFeTag("ownership-documents");
    await bustCache("ownership-documents");
    return { ok: true, data: result };
  } catch (err) {
    console.error("createOwnershipDocument", err);
    return { ok: false, error: "Could not create ownership document" };
  }
}

export async function updateOwnershipDocument(id: string, patch: unknown): Promise<ActionResult<OwnershipDocument>> {
  const parsed = OwnershipDocumentPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Invalid ownership document" };
  const ctx = await requireCtx();
  try {
    const result = await svcUpdateOwnershipDocument(ctx, id, parsed.data);
    if (!result) return { ok: false, error: "Ownership document not found" };
    revalidateFeTag("ownership-documents");
    await bustCache("ownership-documents");
    return { ok: true, data: result };
  } catch (err) {
    console.error("updateOwnershipDocument", err);
    return { ok: false, error: "Could not update ownership document" };
  }
}

export async function deleteOwnershipDocument(id: string): Promise<ActionResult<void>> {
  const ctx = await requireCtx();
  try {
    await svcDeleteOwnershipDocument(ctx, id);
    revalidateFeTag("ownership-documents");
    await bustCache("ownership-documents");
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("deleteOwnershipDocument", err);
    return { ok: false, error: "Could not delete ownership document" };
  }
}
