import {
  ShellPageFrame,
  ShellPageHeader,
  ShellDirectoryGrid,
  Shimmer,
} from "../_components/skeletons";

// Loading skeleton for /directory (professional directory).
// Mirrors: page header → search/filter bar → 3-col professional card grid.
export default function DirectoryLoading() {
  return (
    <ShellPageFrame>
      <ShellPageHeader hasButton={false} />

      {/* Search + filter bar */}
      <div className="flex gap-3">
        <Shimmer className="h-9 flex-1 rounded-md" />
        <Shimmer className="h-9 w-28 rounded-md" />
      </div>

      <ShellDirectoryGrid count={9} />
    </ShellPageFrame>
  );
}
