// Org-wide audit log — shows all activity across every property in the organisation.
// Read-only server component: no client state, no forms, just a plain list.
// Data comes directly from the activities table via listActivities (no server action needed).

import { requireCtx } from "@/lib/auth/ctx";
import { listActivities } from "@/lib/services/activities";
import { formatRelativeTime } from "@/lib/format";

// Number of rows to show on the page. A cap keeps the query cheap.
const ACTIVITY_LIMIT = 50;

// Maps entity strings to a short display label with a colour, so the list is easy to scan.
function entityLabel(entity: string): { label: string; colour: string } {
  const map: Record<string, { label: string; colour: string }> = {
    property:     { label: "Property",     colour: "bg-violet-100 text-violet-700" },
    payment:      { label: "Payment",      colour: "bg-emerald-100 text-emerald-700" },
    workOrder:    { label: "Work order",   colour: "bg-amber-100 text-amber-700" },
    safetyRisk:   { label: "Safety",       colour: "bg-rose-100 text-rose-700" },
    photo:        { label: "Photo",        colour: "bg-sky-100 text-sky-700" },
    coOwner:      { label: "Co-owner",     colour: "bg-indigo-100 text-indigo-700" },
    folder:       { label: "Folder",       colour: "bg-slate-100 text-slate-600" },
    professional: { label: "Directory",    colour: "bg-teal-100 text-teal-700" },
    document:     { label: "Document",     colour: "bg-orange-100 text-orange-700" },
    successor:    { label: "Successor",    colour: "bg-purple-100 text-purple-700" },
    estate:       { label: "Estate",       colour: "bg-fuchsia-100 text-fuchsia-700" },
  };
  return map[entity] ?? { label: entity, colour: "bg-slate-100 text-slate-600" };
}

export default async function ActivityPage() {
  const ctx = await requireCtx();
  const events = await listActivities(ctx, undefined, ACTIVITY_LIMIT);

  return (
    <div className="px-4 sm:px-6 py-8 max-w-4xl mx-auto w-full">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-slate-800">Activity log</h1>
        <p className="text-[13px] text-slate-500 mt-1">
          A record of changes made across your organisation.
        </p>
      </div>

      {/* Activity list */}
      <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        {events.length === 0 ? (
          // Empty state — shown before any mutations have been made.
          <div className="px-6 py-16 flex flex-col items-center gap-3 text-center">
            <span className="text-4xl select-none">📋</span>
            <p className="text-[15px] font-semibold text-slate-600">No activity yet</p>
            <p className="text-[13px] text-slate-400 max-w-xs">
              Actions like archiving properties, logging payments, or adding photos will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[12px] font-medium text-slate-500">Latest changes</span>
              <span className="text-[11px] text-slate-400">Showing latest {events.length}</span>
            </div>
            <ul className="divide-y divide-slate-50">
              {events.map((event) => {
                const tag = entityLabel(event.entity);
                return (
                  <li key={event.id} className="px-5 py-4 flex items-start gap-4">
                    {/* Entity badge */}
                    <span
                      className={`mt-0.5 flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${tag.colour}`}
                    >
                      {tag.label}
                    </span>

                    {/* Description + meta */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-slate-700 leading-snug">{event.description}</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {event.action} · {formatRelativeTime(event.createdAt)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
