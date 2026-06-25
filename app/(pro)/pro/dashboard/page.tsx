import { ManagerDashboardPage } from "./_components/ManagerDashboardPage";
import { getProDashboardData } from "../queries";
import { requireCtx } from "@/lib/auth/ctx";
import {
  getIsManager,
  listManagedAccounts,
  listMyAccessRequests,
} from "@/lib/services/managers";
import type { ManagedAccount, MyAccessRequest } from "@/lib/services/managers";

// /pro/dashboard — Valgate Professional manager dashboard.
//
// Server component: loads the full dashboard payload (book-level KPIs,
// per-client rollups, alerts, work orders, compliance, activity — all
// derived from the shared local-db entities) and hands it to the
// client-side composition.

// Time-relative derivations (alerts, "expires in Nd") must use request time, not build time.
export const dynamic = "force-dynamic";

export default async function Page() {
  const ctx = await requireCtx();

  // Fetch dashboard data and the manager flag in parallel.
  // getProDashboardData() calls requireCtx() internally — safe because Clerk's
  // auth() is memoised per request and the JIT identity-sync is idempotent.
  const [data, isManager] = await Promise.all([
    getProDashboardData(),
    getIsManager(ctx),
  ]);

  // Managers get the account rollup; everyone else (owners) gets null → section absent.
  let managedAccounts: {
    accounts: ManagedAccount[];
    pending: MyAccessRequest[];
  } | null = null;

  if (isManager) {
    const [accounts, allRequests] = await Promise.all([
      listManagedAccounts(ctx),
      listMyAccessRequests(ctx),
    ]);
    // Only the pending slice goes to the sub-list; approved ones are shown as account rows.
    const pending = allRequests.filter((r) => r.status === "pending");
    managedAccounts = { accounts, pending };
  }

  return <ManagerDashboardPage data={data} managedAccounts={managedAccounts} />;
}
