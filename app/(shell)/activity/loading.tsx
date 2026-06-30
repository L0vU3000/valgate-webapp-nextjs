import { Shimmer, ShellPageFrame } from "../_components/skeletons";

// Loading skeleton for /activity (org-wide audit log).
// Mirrors: page header → bordered list card with entity-badge + description rows.
export default function ActivityLoading() {
  return (
    <ShellPageFrame>
      {/* Page header */}
      <div className="flex flex-col gap-2">
        <Shimmer className="h-7 w-40" />
        <Shimmer className="h-3.5 w-72 max-w-full" />
      </div>

      {/* Activity list card */}
      <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
        {/* List header */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <Shimmer className="h-3 w-28" />
          <Shimmer className="h-3 w-24" />
        </div>

        {/* Activity rows */}
        <ul className="divide-y divide-slate-50">
          {Array.from({ length: 10 }).map((_, i) => (
            <li key={i} className="px-5 py-4 flex items-start gap-4">
              <Shimmer className="mt-0.5 flex-shrink-0 h-5 w-16 rounded" />
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <Shimmer className="h-3 w-3/4" />
                <Shimmer className="h-2.5 w-1/3" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </ShellPageFrame>
  );
}
