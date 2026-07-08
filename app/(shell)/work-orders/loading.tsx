import {
  ShellPageFrame,
  ShellPageHeader,
  ShellKpiGrid,
  ShellWidgetCard,
} from "../_components/skeletons";

// Loading skeleton for /work-orders.
// Mirrors: page header → 4 status tiles → grouped work-order lists.
export default function WorkOrdersLoading() {
  return (
    <ShellPageFrame>
      <ShellPageHeader hasButton />
      <ShellKpiGrid cells={4} />
      <ShellWidgetCard rows={4} />
      <ShellWidgetCard rows={3} />
    </ShellPageFrame>
  );
}
