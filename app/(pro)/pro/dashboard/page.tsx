import { ManagerDashboardPage } from "./_components/ManagerDashboardPage";

// /pro/dashboard — Valgate Professional manager dashboard.
//
// The (pro) route group's layout (app/(pro)/layout.tsx) calls notFound()
// when NODE_ENV === "production" until Pro auth ships. ManagerProShell
// wraps this segment via app/(pro)/pro/layout.tsx.
//
// Server component — renders the client-side dashboard composition.

export default function Page() {
  return <ManagerDashboardPage />;
}
