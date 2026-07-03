import { revalidatePath } from "next/cache";

// Pro server actions — the inputs an asset manager gives Valgate.
// Every input is Zod-validated; failures return generic strings
// (details are logged server-side only).

export type ProActionResult =
  | { ok: true; count?: number; invitationUrl?: string; orgId?: string; skipped?: Array<{ row: number; reason: string }> }
  | { ok: false; error: string };

// Refresh every pro route after a mutation — the dashboard, client pages,
// rent and work-order pages all derive from the same entities.
export function revalidatePro(): void {
  revalidatePath("/pro", "layout");
}
