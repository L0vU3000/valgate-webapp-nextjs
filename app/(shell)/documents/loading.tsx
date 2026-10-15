import {
  ShellPageFrame,
  ShellPageHeader,
  ShellKpiGrid,
  ShellWidgetCard,
} from "../_components/skeletons";

// Loading skeleton for /documents.
// Mirrors: page header (no action button — this page is a viewer) → 2-cell metric
// strip → toolbar + table block.
export default function DocumentsLoading() {
  return (
    <ShellPageFrame>
      <ShellPageHeader hasButton={false} />
      <ShellKpiGrid cells={2} cols={2} />
      <ShellWidgetCard rows={8} />
    </ShellPageFrame>
  );
}
