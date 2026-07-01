"use client";
// Client component: renders each pending change request card with Approve/Reject buttons.
// The list of requests is fetched server-side and passed as props so the page stays
// a Server Component (only this leaf gets the "use client" boundary).
// Phase 3: shows operation badge (Add/Edit/Remove) and entity-type label.
import { useState, useTransition } from "react";
import { Check, X, ChevronDown, ChevronUp, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  approveChangeRequestAction,
  rejectChangeRequestAction,
} from "@/app/(shell)/portfolio/change-requests.actions";
import type { ChangeRequest } from "@/lib/services/change-requests";

// ─── Operation badge ──────────────────────────────────────────────────────────

function OperationBadge({ operation }: { operation: ChangeRequest["operation"] }) {
  if (operation === "create") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">
        <Plus className="h-2.5 w-2.5" />
        Add
      </span>
    );
  }
  if (operation === "delete") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
        <Trash2 className="h-2.5 w-2.5" />
        Remove
      </span>
    );
  }
  // update (default)
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
      <Pencil className="h-2.5 w-2.5" />
      Edit
    </span>
  );
}

// ─── Proposed patch table — shown for create and update operations ─────────────

function PatchTable({ patch }: { patch: Record<string, unknown> }) {
  const entries = Object.entries(patch).filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (entries.length === 0) {
    return <p className="text-[13px] text-slate-400 italic">No changes specified.</p>;
  }
  return (
    <table className="w-full text-[13px]">
      <thead>
        <tr className="border-b border-slate-100">
          <th className="pb-1.5 text-left font-medium text-slate-500 w-[40%]">Field</th>
          <th className="pb-1.5 text-left font-medium text-slate-500">Proposed value</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(([key, value]) => (
          <tr key={key} className="border-b border-slate-50 last:border-0">
            <td className="py-1.5 pr-4 text-slate-600 font-medium capitalize">
              {/* Convert camelCase to "Camel Case" for readability */}
              {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
            </td>
            <td className="py-1.5 text-slate-800 font-mono break-all">
              {String(value)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Delete preview row ───────────────────────────────────────────────────────

// For delete CRs there is no patch to display — instead show a clear "removal" summary.
function DeletePreview({ cr }: { cr: ChangeRequest }) {
  return (
    <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-[13px]">
      <p className="font-semibold text-red-700">
        Remove {cr.entityType}
        {cr.entityId ? <span className="font-normal text-red-600"> — ID {cr.entityId}</span> : null}
      </p>
      <p className="mt-0.5 text-[12px] text-red-500">
        Approving will permanently delete this record. This cannot be undone.
      </p>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function ChangeRequestCard({ cr }: { cr: ChangeRequest }) {
  const [expanded, setExpanded] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [decided, setDecided] = useState<"approved" | "denied" | null>(null);

  // Capitalise the entity type for display.
  const entityLabel = cr.entityType.charAt(0).toUpperCase() + cr.entityType.slice(1);

  function handleApprove() {
    startTransition(async () => {
      const result = await approveChangeRequestAction(cr.id);
      if (result.ok) {
        setDecided("approved");
        const opLabel = cr.operation === "create" ? "Addition" : cr.operation === "delete" ? "Removal" : "Update";
        toast.success(`${entityLabel} ${opLabel.toLowerCase()} approved and applied.`);
      } else {
        toast.error(result.error ?? "Failed to approve change.");
      }
    });
  }

  function handleReject() {
    startTransition(async () => {
      const result = await rejectChangeRequestAction(cr.id);
      if (result.ok) {
        setDecided("denied");
        toast.success("Change declined. Your data is unchanged.");
      } else {
        toast.error(result.error ?? "Failed to decline change.");
      }
    });
  }

  // After a decision, collapse to a simple badge row.
  if (decided) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 flex items-center justify-between gap-3 opacity-60">
        <div className="flex items-center gap-2">
          <OperationBadge operation={cr.operation} />
          <p className="text-[13px] font-medium text-slate-700">
            {entityLabel} proposal
          </p>
          <p className="text-[12px] text-slate-400">· ID {cr.id}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium ${
            decided === "approved"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {decided === "approved" ? "Approved" : "Declined"}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Card header */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <OperationBadge operation={cr.operation} />
            <p className="text-[14px] font-semibold text-slate-800">
              {entityLabel} proposal
            </p>
          </div>
          <p className="text-[12px] text-slate-400 mt-0.5">
            Submitted {cr.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            {cr.entityId ? <> · {entityLabel} ID {cr.entityId}</> : null}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[12px] font-medium text-amber-700">
            Pending review
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              {cr.operation === "delete" ? "Removal details" : "Proposed changes"}
            </p>
            {cr.operation === "delete" ? (
              <DeletePreview cr={cr} />
            ) : (
              <PatchTable patch={cr.proposedPatch} />
            )}
          </div>

          {/* Approve / Reject buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleApprove}
              disabled={isPending}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-semibold text-white shadow-sm active:scale-[0.98] disabled:opacity-50 transition-all ${
                cr.operation === "delete"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              <Check className="h-4 w-4" />
              {cr.operation === "delete" ? "Approve removal" : "Approve & apply"}
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              <X className="h-4 w-4" />
              Decline
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── List ─────────────────────────────────────────────────────────────────────

export function PendingChangesClient({ requests }: { requests: ChangeRequest[] }) {
  return (
    <div className="space-y-3">
      {requests.map((cr) => (
        <ChangeRequestCard key={cr.id} cr={cr} />
      ))}
    </div>
  );
}
