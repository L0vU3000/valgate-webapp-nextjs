"use server";

import type { FormData } from "./_components/types";

export async function submitPropertyAction(
  _form: FormData,
): Promise<{ ok: boolean; error?: string }> {
  try {
    // TODO: persist to Convex
    return { ok: true };
  } catch (err) {
    console.error("submitPropertyAction failed:", err);
    return { ok: false, error: "Failed to submit property. Please try again." };
  }
}
