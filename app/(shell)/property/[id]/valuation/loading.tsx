import {
  ShellPropertyPageFrame,
  ShellPropertyContent,
  ShellKpiGrid,
  ShellWidgetCard,
  ShellChartCard,
} from "../../../_components/skeletons";

// Loading skeleton for /property/[id]/valuation.
// Mirrors: current value KPI → valuation history chart → comparable table.
export default function ValuationLoading() {
  return (
    <ShellPropertyPageFrame>
      <ShellPropertyContent>
        <ShellKpiGrid cells={2} cols={2} />
        <ShellChartCard />
        <ShellWidgetCard rows={5} />
      </ShellPropertyContent>
    </ShellPropertyPageFrame>
  );
}
