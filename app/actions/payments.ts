"use server";


import { requireCtx } from "@/lib/auth/ctx";
import type { ActionResult } from "@/app/actions/_result";
import { revalidateFeTag, NOT_IMPLEMENTED_UNTIL_B6 } from "@/app/actions/_result";
import { NewPaymentSchema } from "@/lib/data/types/payment";
import type { Payment } from "@/lib/data/types/payment";
import { createPayment as svcCreatePayment } from "@/lib/services/payments";

export async function createPayment(data: unknown): Promise<ActionResult<Payment>> {
  const parsed = NewPaymentSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Invalid payment" };
  const ctx = await requireCtx();
  try {
    const result = await svcCreatePayment(ctx, parsed.data);
    revalidateFeTag("payments");
    return { ok: true, data: result };
  } catch (err) {
    console.error("createPayment", err);
    return { ok: false, error: "Could not create payment" };
  }
}
