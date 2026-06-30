import {
  ShellPropertyPageFrame,
  ShellPropertyContent,
  ShellKpiGrid,
  ShellWidgetCard,
  ShellChartCard,
} from "../../../_components/skeletons";

// Loading skeleton for /property/[id]/overview.
// Mirrors: KPI strip → income chart + activity feed → lease table.
export default function OverviewLoading() {
  return (
    <ShellPropertyPageFrame>
      <ShellPropertyContent>
        <ShellKpiGrid cells={4} />

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
          <ShellChartCard />
          <ShellWidgetCard rows={4} />
        </div>

        <ShellWidgetCard rows={5} />
      </ShellPropertyContent>
    </ShellPropertyPageFrame>
  );
}
