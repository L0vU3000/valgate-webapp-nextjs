// /portfolio/pending-changes — owner's inbox for proposed property changes.
// Managers propose changes via the View-as-client preview; the owner approves or
// rejects here. Deep-linked from the ACCESS notification (linkTo="/portfolio/pending-changes").
import { requireCtx } from "@/lib/auth/ctx";
import { listPendingForOwner } from "@/lib/services/change-requests";
import { PendingChangesClient } from "./_components/PendingChangesClient";

export const dynamic = "force-dynamic";

export default async function PendingChangesPage() {
  const ctx = await requireCtx();
  const requests = await listPendingForOwner(ctx);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[22px] font-semibold text-slate-900">Pending Changes</h1>
          <p className="mt-1 text-[14px] text-slate-500">
            Review proposed property updates from your property manager.
          </p>
        </div>

        {requests.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
            <p className="text-[14px] font-medium text-slate-600">No pending changes</p>
            <p className="mt-1 text-[13px] text-slate-400">
              Your manager hasn&apos;t proposed any updates yet.
            </p>
          </div>
        ) : (
          <PendingChangesClient requests={requests} />
        )}
      </div>
    </div>
  );
}
