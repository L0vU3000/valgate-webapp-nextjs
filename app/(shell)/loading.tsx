import {
  Shimmer,
  ShellPageFrame,
  ShellPropertyGrid,
} from "./_components/skeletons";

// Loading skeleton for the home (/) route.
// Mirrors the real HomePage: search hero at the top, then a property card grid below.
export default function HomeLoading() {
  return (
    <ShellPageFrame>
      {/* Search hero / command bar */}
      <div className="flex flex-col items-center gap-3 py-4">
        <Shimmer className="h-14 w-full max-w-[700px] rounded-2xl" />
        <div className="flex gap-2 overflow-hidden">
          <Shimmer className="h-9 w-28 rounded-full" />
          <Shimmer className="h-9 w-36 rounded-full" />
          <Shimmer className="h-9 w-32 rounded-full" />
          <Shimmer className="h-9 w-28 rounded-full hidden sm:block" />
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-slate-100 bg-white p-4 flex flex-col gap-2.5">
            <Shimmer className="h-3 w-20" />
            <Shimmer className="h-7 w-24 mt-1" />
            <Shimmer className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Property card grid */}
      <ShellPropertyGrid count={6} />
    </ShellPageFrame>
  );
}
