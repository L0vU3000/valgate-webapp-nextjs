import {
  ShellPageFrame,
  ShellPageHeader,
  ShellKpiGrid,
  ShellPropertyGrid,
} from "../_components/skeletons";

// Loading skeleton for /portfolio.
// Mirrors: page header → 4-cell KPI strip → 3-col property card grid.
export default function PortfolioLoading() {
  return (
    <ShellPageFrame>
      <ShellPageHeader hasButton />
      <ShellKpiGrid cells={4} />
      <ShellPropertyGrid count={6} />
    </ShellPageFrame>
  );
}
