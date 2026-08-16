"use server";

import { auth } from "@clerk/nextjs/server";
import { resolveDefaultHomeOrgForClerkUser } from "@/lib/auth/home-org";
import { getInviteeNameForInvitation } from "@/lib/services/client-onboarding";
import { logger } from "@/lib/logger";

/**
 * Ensures the signed-in user has a home workspace and returns its Clerk org id.
 * Login flows call this to activate the user's own org — no manual picker.
 */
export async function resolveDefaultHomeOrgAction(): Promise<{ clerkOrgId: string | null }> {
  const { userId } = await auth();
  if (!userId) return { clerkOrgId: null };

  try {
    const clerkOrgId = await resolveDefaultHomeOrgForClerkUser(userId);
    return { clerkOrgId };
  } catch (err) {
    logger.error("resolveDefaultHomeOrgAction failed", { error: String(err) });
    return { clerkOrgId: null };
  }
}

// Decodes (does NOT verify) the payload of a Clerk organization-invitation ticket JWT to
// read its "sid" claim (the Clerk invitation id). Display-only — the actual signup still
// goes through signUp.ticket(), which Clerk verifies cryptographically server-side, so a
// tampered ticket here can only ever produce a wrong name suggestion, never unauthorized access.
function decodeClerkTicketInvitationId(rawTicket: string): string | null {
  const parts = rawTicket.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return typeof payload?.sid === "string" ? payload.sid : null;
  } catch {
    return null;
  }
}

/**
 * Pre-fills the "Full name" field on the accept-invitation signup form with the name
 * the manager already typed for this invitee (Step 2 of the onboarding wizard), so the
 * client isn't asked to retype something we already have. Still fully editable — this
 * is a suggestion, not a locked value.
 */
export async function getInviteePrefillNameAction(rawTicket: string): Promise<{ name: string | null }> {
  const invitationId = decodeClerkTicketInvitationId(rawTicket);
  if (!invitationId) return { name: null };

  try {
    const name = await getInviteeNameForInvitation(invitationId);
    return { name };
  } catch (err) {
    logger.error("getInviteePrefillNameAction failed", { error: String(err) });
    return { name: null };
  }
}
