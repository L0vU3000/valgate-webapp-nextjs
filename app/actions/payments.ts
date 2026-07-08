"use server";


import { requireCtx } from "@/lib/auth/ctx";
import type { ActionResult } from "@/app/actions/_result";
import { revalidateFeTag } from "@/app/actions/_result";
import { NewPaymentSchema, PaymentPatchSchema } from "@/lib/data/types/payment";
import type { Payment } from "@/lib/data/types/payment";
import {
  createPayment as svcCreatePayment,
  updatePayment as svcUpdatePayment,
  deletePayment as svcDeletePayment,
} from "@/lib/services/payments";
import { bustCache } from "@/lib/cache/bust";

export async function createPayment(data: unknown): Promise<ActionResult<Payment>> {
  const parsed = NewPaymentSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Invalid payment" };
  const ctx = await requireCtx();
  try {
    const result = await svcCreatePayment(ctx, parsed.data);
    revalidateFeTag("payments");
    await bustCache("payments");
    return { ok: true, data: result };
  } catch (err) {
    console.error("createPayment", err);
    return { ok: false, error: "Could not create payment" };
  }
}

export async function updatePayment(id: string, patch: unknown): Promise<ActionResult<Payment>> {
  const parsed = PaymentPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Invalid payment" };
  const ctx = await requireCtx();
  try {
    const result = await svcUpdatePayment(ctx, id, parsed.data);
    if (!result) return { ok: false, error: "Payment not found" };
    revalidateFeTag("payments");
    await bustCache("payments");
    return { ok: true, data: result };
  } catch (err) {
    console.error("updatePayment", err);
    return { ok: false, error: "Could not update payment" };
  }
}

export async function deletePayment(id: string): Promise<ActionResult<void>> {
  const ctx = await requireCtx();
  try {
    await svcDeletePayment(ctx, id);
    revalidateFeTag("payments");
    await bustCache("payments");
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("deletePayment", err);
    return { ok: false, error: "Could not delete payment" };
  }
}
