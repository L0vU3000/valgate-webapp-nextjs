import { Shimmer, SkeletonPageFrame } from "@/app/(pro)/pro/_components/skeletons";

// Loading skeleton for /pro/add-account: identity line + invite-code form card + request history list.
export default function AddAccountLoading() {
  return (
    <SkeletonPageFrame>
      {/* Page header */}
      <div className="flex flex-col gap-2.5">
        <Shimmer className="h-3 w-40" />
        <Shimmer className="h-7 w-52" />
        <Shimmer className="h-3.5 w-64" />
      </div>

      {/* Invite code form card */}
      <section className="flex flex-col gap-5 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        {/* "Signed in as" identity line */}
        <div className="flex items-center gap-3">
          <Shimmer className="h-8 w-8 rounded-full" />
          <div className="flex flex-col gap-1.5">
            <Shimmer className="h-3.5 w-36" />
            <Shimmer className="h-3 w-48" />
          </div>
        </div>

        {/* Invite code label + input + button */}
        <div className="flex flex-col gap-2">
          <Shimmer className="h-3.5 w-24" />
          <div className="flex gap-2">
            <Shimmer className="h-9 flex-1 rounded-md" />
            <Shimmer className="h-9 w-28 rounded-md" />
          </div>
        </div>
      </section>

      {/* Request history section */}
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <Shimmer className="h-4 w-36" />
          <Shimmer className="h-3.5 w-20" />
        </div>

        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Shimmer className="h-8 w-8 rounded-md" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Shimmer className="h-3.5 w-48" />
                <Shimmer className="h-3 w-32" />
              </div>
              <Shimmer className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </section>
    </SkeletonPageFrame>
  );
}
