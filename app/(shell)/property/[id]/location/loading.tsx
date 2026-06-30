import {
  Shimmer,
  ShellPropertyPageFrame,
  ShellPropertyContent,
  ShellWidgetCard,
} from "../../../_components/skeletons";

// Loading skeleton for /property/[id]/location.
// Mirrors: map placeholder (tall) → location detail card.
export default function LocationLoading() {
  return (
    <ShellPropertyPageFrame>
      <ShellPropertyContent>
        {/* Map placeholder */}
        <div className="rounded-xl border border-slate-100 bg-white overflow-hidden flex flex-col gap-4 p-5">
          <div className="flex items-center gap-2">
            <Shimmer className="h-5 w-5 rounded" />
            <Shimmer className="h-4 w-28" />
          </div>
          <Shimmer className="h-64 sm:h-80 w-full rounded-lg" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ShellWidgetCard rows={4} />
          <ShellWidgetCard rows={4} />
        </div>
      </ShellPropertyContent>
    </ShellPropertyPageFrame>
  );
}
