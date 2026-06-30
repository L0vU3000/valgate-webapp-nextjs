import {
  ShellPropertyPageFrame,
  ShellPropertyContent,
  ShellKpiGrid,
  ShellWidgetCard,
  ShellChartCard,
} from "../../../_components/skeletons";

// Loading skeleton for /property/[id]/financials.
// Mirrors: KPI strip → income/expense chart → payments table + expenses table.
export default function FinancialsLoading() {
  return (
    <ShellPropertyPageFrame>
      <ShellPropertyContent>
        <ShellKpiGrid cells={4} />
        <ShellChartCard />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ShellWidgetCard rows={5} />
          <ShellWidgetCard rows={5} />
        </div>
      </ShellPropertyContent>
    </ShellPropertyPageFrame>
  );
}
