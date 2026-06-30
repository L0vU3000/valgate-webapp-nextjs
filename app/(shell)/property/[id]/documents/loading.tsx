import {
  Shimmer,
  ShellPropertyPageFrame,
  ShellPropertyContent,
  ShellWidgetCard,
} from "../../../_components/skeletons";

// Loading skeleton for /property/[id]/documents.
// Mirrors: folder tree sidebar → document list + upload area.
export default function DocumentsLoading() {
  return (
    <ShellPropertyPageFrame>
      <ShellPropertyContent>
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">
          {/* Folder tree sidebar */}
          <div className="rounded-xl border border-slate-100 bg-white p-4 flex flex-col gap-2">
            <Shimmer className="h-4 w-24 mb-1" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 pl-2">
                <Shimmer className="h-4 w-4 rounded flex-shrink-0" />
                <Shimmer className="h-3 flex-1" />
              </div>
            ))}
          </div>

          {/* Document list */}
          <ShellWidgetCard rows={7} />
        </div>
      </ShellPropertyContent>
    </ShellPropertyPageFrame>
  );
}
