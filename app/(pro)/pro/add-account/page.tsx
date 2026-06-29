import { requireCtx } from "@/lib/auth/ctx";
import { getMyUserProfile } from "@/lib/services/user-profiles";
import { listMyAccessRequests } from "@/lib/services/managers";
import { AddAccountPage } from "./_components/AddAccountPage";

// /pro/add-account — a manager enters an owner's invite code to request access
// to their portfolio. Real wiring: the manager's own request history comes from
// listMyAccessRequests; the submit hits the requestAccessAction server action.

// The request list shows "Requested {date}" relative to now, so render per request.
export const dynamic = "force-dynamic";

export default async function Page() {
  const ctx = await requireCtx();

  // Load the manager's identity (for the "signed in as" line) and their existing
  // requests (pending + decided) in parallel.
  const [profile, requests] = await Promise.all([
    getMyUserProfile(ctx),
    listMyAccessRequests(ctx),
  ]);

  const managerName =
    profile && (profile.firstName || profile.lastName)
      ? `${profile.firstName} ${profile.lastName}`.trim()
      : "your account";
  const managerEmail = profile?.email ?? "";

  // Select only the fields the UI renders — never pass the full row to the client.
  const requestRows = requests.map((request) => ({
    id: request.id,
    ownerOrgName: request.ownerOrgName,
    requestedLevel: request.requestedLevel,
    status: request.status,
    createdAt: request.createdAt.getTime(),
  }));

  return (
    <AddAccountPage
      managerName={managerName}
      managerEmail={managerEmail}
      requests={requestRows}
    />
  );
}
