import {
  ShellPageFrame,
  ShellPageHeader,
  ShellKpiGrid,
  ShellChartCard,
  ShellWidgetCard,
} from "../_components/skeletons";

// Loading skeleton for /analytics.
// Mirrors: page header → KPI strip → period picker → chart card + table card.
export default function AnalyticsLoading() {
  return (
    <ShellPageFrame>
      <ShellPageHeader hasButton={false} />
      <ShellKpiGrid cells={4} />

      {/* Period selector */}
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-8 w-16 animate-pulse rounded-md bg-slate-200/80" />
        ))}
      </div>

      {/* Chart + breakdown side by side on lg */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
        <ShellChartCard />
        <ShellWidgetCard rows={5} />
      </div>

      {/* Second chart row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ShellChartCard />
        <ShellChartCard />
      </div>
    </ShellPageFrame>
  );
}
