"use server";

import { revalidateTag } from "next/cache";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import * as paymentsDb from "@/lib/data/db/payments";
import type { Payment } from "@/lib/data/types/payment";
import type { ActionResult } from "./properties.actions";

export async function createPayment(
  data: Omit<Payment, "id">,
): Promise<ActionResult<Payment>> {
  const userId = getCurrentUserId();
  const payment = await paymentsDb.create(userId, data);
  revalidateTag("payments");
  return { ok: true, data: payment };
}
