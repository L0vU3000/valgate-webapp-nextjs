import "server-only";
import { notFound } from "next/navigation";
import { resolveClientOrgForManager } from "@/app/(pro)/pro/queries";
import { getMembershipRole } from "@/lib/services/portfolio-members";
import { roleAtLeast, type Ctx } from "@/lib/services/_mapping";

// Shared resolver for the "View as client" preview. Every section route (layout +
// each page.tsx) calls this to get a Ctx scoped to the client's org.
//
// Authz — TWO checks must BOTH hold (defense in depth):
//   (a) ownership: resolveClientOrgForManager returns null unless this manager owns
//       this client (clients.managerUserId match) → 404.
//   (b) grant: getMembershipRole reads the manager's ACTIVE membership role in the
//       client's org. This lookup IS the authorization boundary — it is server-only
//       and re-derived on every request, never client-supplied.
//
// No Clerk org switch: the manager keeps their own session; orgId routes every read to
// the client's portfolio org. The derived orgRole (viewer vs admin/owner) decides whether
// this is a read-only preview (propose changes) or a write-capable one (act on behalf).
// No active grant floors to "viewer" so absence of a row can never grant write.

export type PreviewContext = {
  viewerCtx: Ctx;
  clientId: string;
  clientName: string;
  clientInitials: string;
  // True when the manager holds a full (admin/owner) grant in the client's org and may
  // therefore act on the portfolio directly (changes auto-apply). False = propose-only.
  canWrite: boolean;
};

export async function requirePreviewContext(clientId: string): Promise<PreviewContext> {
  const resolved = await resolveClientOrgForManager(clientId);
  if (!resolved) {
    notFound();
  }

  // Read the real grant from organization_memberships (null when no active row).
  const role = await getMembershipRole(resolved.orgId, resolved.managerUserId);
  const orgRole = role ?? "viewer"; // safe floor: absent grant is never write-capable
  const canWrite = roleAtLeast(orgRole, "admin"); // full grant == admin/owner

  return {
    viewerCtx: {
      userId: resolved.managerUserId,
      orgId: resolved.orgId,
      orgRole,
    },
    clientId,
    clientName: resolved.name,
    clientInitials: resolved.initials,
    canWrite,
  };
}
