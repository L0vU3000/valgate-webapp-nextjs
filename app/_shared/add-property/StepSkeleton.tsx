// Fallback shown while a lazily-loaded wizard step's JS chunk streams in.
// The add-property steps are code-split (next/dynamic), so each step's code only
// downloads when the user reaches it. This placeholder keeps the layout stable and
// signals loading during that brief fetch. Deliberately minimal — it appears for a
// fraction of a second on a fast connection.
export function StepSkeleton() {
  return (
    <div className="flex-1 w-full animate-pulse space-y-4 py-6">
      <div className="h-8 w-1/3 rounded-lg bg-slate-100" />
      <div className="h-4 w-1/2 rounded bg-slate-100" />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="h-24 rounded-xl bg-slate-100" />
        <div className="h-24 rounded-xl bg-slate-100" />
        <div className="h-24 rounded-xl bg-slate-100" />
        <div className="h-24 rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}
