import {
  ShellPageFrame,
  ShellPageHeader,
  ShellKpiGrid,
  ShellWidgetCard,
} from "../_components/skeletons";

// Loading skeleton for /compliance.
// Mirrors: page header → progress + 3 monitoring cards → register table.
export default function ComplianceLoading() {
  return (
    <ShellPageFrame>
      <ShellPageHeader hasButton={false} />
      <ShellKpiGrid cells={3} cols={4} />
      <ShellWidgetCard rows={6} />
    </ShellPageFrame>
  );
}
