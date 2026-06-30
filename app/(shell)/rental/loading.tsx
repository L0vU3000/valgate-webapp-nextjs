import {
  ShellPageFrame,
  ShellPageHeader,
  ShellKpiGrid,
  ShellWidgetCard,
} from "../_components/skeletons";

// Loading skeleton for /rental (rental dashboard).
// Mirrors: page header → KPI strip → active leases table → payments table.
export default function RentalLoading() {
  return (
    <ShellPageFrame>
      <ShellPageHeader hasButton />
      <ShellKpiGrid cells={4} />

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
        <ShellWidgetCard rows={6} />
        <ShellWidgetCard rows={4} />
      </div>

      <ShellWidgetCard rows={5} />
    </ShellPageFrame>
  );
}
