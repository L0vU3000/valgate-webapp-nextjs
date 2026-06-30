import {
  Shimmer,
  ShellPageFrame,
  ShellWidgetCard,
} from "../../_components/skeletons";

// Loading skeleton for /directory/[id] (professional profile page).
// Mirrors: profile hero card (avatar + name + role + contact) → detail cards.
export default function DirectoryProfileLoading() {
  return (
    <ShellPageFrame>
      {/* Profile hero */}
      <div className="rounded-xl border border-slate-100 bg-white p-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
        <Shimmer className="h-24 w-24 rounded-full flex-shrink-0" />
        <div className="flex flex-col gap-2.5 flex-1">
          <Shimmer className="h-6 w-48" />
          <Shimmer className="h-4 w-32" />
          <div className="flex gap-2 mt-1">
            <Shimmer className="h-5 w-20 rounded-full" />
            <Shimmer className="h-5 w-24 rounded-full" />
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <Shimmer className="h-9 w-32 rounded-md" />
          <Shimmer className="h-9 w-32 rounded-md" />
        </div>
      </div>

      {/* About + contact info side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
        <ShellWidgetCard rows={4} />
        <ShellWidgetCard rows={3} />
      </div>

      <ShellWidgetCard rows={5} />
    </ShellPageFrame>
  );
}
