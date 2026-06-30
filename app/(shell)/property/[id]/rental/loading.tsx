import {
  ShellPropertyPageFrame,
  ShellPropertyContent,
  ShellKpiGrid,
  ShellWidgetCard,
} from "../../../_components/skeletons";

// Loading skeleton for /property/[id]/rental.
// Mirrors: KPI strip → active lease card → tenant + payment tables.
export default function RentalLoading() {
  return (
    <ShellPropertyPageFrame>
      <ShellPropertyContent>
        <ShellKpiGrid cells={4} />

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
          <ShellWidgetCard rows={5} />
          <ShellWidgetCard rows={4} />
        </div>
      </ShellPropertyContent>
    </ShellPropertyPageFrame>
  );
}
