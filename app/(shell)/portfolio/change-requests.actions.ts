"use server";
// Owner-side change-request actions (Pro-2.3).
// The client (owner) approves or rejects pending change proposals from their manager.
// These actions live in (shell)/portfolio so the deep-link /portfolio/pending-changes works.
import { requireCtx } from "@/lib/auth/ctx";
import {
  approveChangeRequest,
  rejectChangeRequest,
} from "@/lib/services/change-requests";
import { revalidateFeTag } from "@/app/actions/_result";
import { revalidatePath } from "next/cache";

// Approve a pending change request by id.
// ctx.orgId must match change_request.owner_org_id — enforced in the service.
// On success: applies the patch, marks approved, notifies the manager.
export async function approveChangeRequestAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!id) return { ok: false, error: "Missing change request id." };

  const ctx = await requireCtx();

  try {
    await approveChangeRequest(ctx, id);
  } catch (err) {
    console.error("approveChangeRequestAction failed", err);
    return { ok: false, error: "Failed to approve change request. Please try again." };
  }

  // Revalidate so the property detail and the pending-changes inbox refresh.
  revalidateFeTag("properties");
  revalidateFeTag("change-requests");
  revalidatePath("/portfolio/pending-changes");

  return { ok: true };
}

// Reject a pending change request by id.
// Data is left untouched; the row status is set to "denied" and the manager is notified.
export async function rejectChangeRequestAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!id) return { ok: false, error: "Missing change request id." };

  const ctx = await requireCtx();

  try {
    await rejectChangeRequest(ctx, id);
  } catch (err) {
    console.error("rejectChangeRequestAction failed", err);
    return { ok: false, error: "Failed to reject change request. Please try again." };
  }

  revalidateFeTag("change-requests");
  revalidatePath("/portfolio/pending-changes");

  return { ok: true };
}
