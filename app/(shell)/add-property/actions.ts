"use server";

import { fullPropertySchema } from "./_components/schemas";
// import { revalidateTag } from "next/cache";
// import { auth } from "@clerk/nextjs/server";

export async function submitPropertyAction(input: unknown) {
  const parsed = fullPropertySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };
  // TODO(backend): mutate Convex/DB, revalidateTag('portfolio'), return real id
  const propertyId = `PR${Date.now()}`;
  return { ok: true as const, propertyId };
}

// Not called today — shapes are defined so callers can wire against a stable contract.
export async function saveDraftAction(_input: unknown) {}
export async function deleteDraftAction(_id: string) {}
