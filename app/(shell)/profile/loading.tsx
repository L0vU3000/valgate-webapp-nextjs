import {
  Shimmer,
  ShellPageFrame,
  ShellPageHeader,
  ShellWidgetCard,
} from "../_components/skeletons";

// Loading skeleton for /profile.
// Mirrors: page header → avatar + name card → form field sections.
export default function ProfileLoading() {
  return (
    <ShellPageFrame>
      <ShellPageHeader hasButton={false} />

      {/* Profile identity card */}
      <div className="rounded-xl border border-slate-100 bg-white p-5 flex items-center gap-4">
        <Shimmer className="h-16 w-16 rounded-full flex-shrink-0" />
        <div className="flex flex-col gap-2">
          <Shimmer className="h-5 w-40" />
          <Shimmer className="h-3 w-56" />
        </div>
      </div>

      {/* Form field card */}
      <div className="rounded-xl border border-slate-100 bg-white p-5 flex flex-col gap-5">
        <Shimmer className="h-4 w-32" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Shimmer className="h-3 w-24" />
              <Shimmer className="h-9 w-full rounded-md" />
            </div>
          ))}
        </div>
        <Shimmer className="h-9 w-24 rounded-md self-end" />
      </div>

      <ShellWidgetCard rows={3} />
    </ShellPageFrame>
  );
}
