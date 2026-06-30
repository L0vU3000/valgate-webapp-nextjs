import {
  ShellPropertyPageFrame,
  ShellPropertyContent,
  ShellKpiGrid,
  ShellWidgetCard,
  ShellChartCard,
} from "../../_components/skeletons";

// Loading skeleton for the property/[id] layout level.
// Fires while property/[id]/layout.tsx fetches the property + progress context.
// Shows a full PropertyLayout-shaped skeleton so there is no blank screen on
// first load (deep-link) before the layout resolves and the sub-route takes over.
export default function PropertyLoading() {
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
