import {
  ShellPageFrame,
  ShellPageHeader,
  ShellWidgetCard,
} from "../_components/skeletons";

// Loading skeleton for /estate-planning (succession page).
// Mirrors: page header → two-column card layout.
export default function EstatePlanningLoading() {
  return (
    <ShellPageFrame>
      <ShellPageHeader hasButton />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ShellWidgetCard rows={5} />
        <ShellWidgetCard rows={5} />
      </div>

      <ShellWidgetCard rows={4} />
    </ShellPageFrame>
  );
}
