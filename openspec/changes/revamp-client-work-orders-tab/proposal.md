## Why

The manager's client Work Orders tab (`/pro/clients/[clientId]/work-orders`) renders only one dashboard card — `MaintenanceQueueCard` filtered to non-Resolved items — so it reads as "empty" and thin even for a client with a live maintenance queue. This is not a data problem: `getClientPortfolioData` already returns `workOrders: ProWorkOrderRow[]` (all statuses, with severity, property, client, and vendor assignment), and the global `/pro/work-orders` page already derives the KPI counts, open-cost total, and vendor directory the tab needs — but the tab wires almost none of it. The richest work-order pieces (status tiles, the full orders table with inline status + assign-vendor actions, the vendor directory) already exist and are already client-filterable by construction; they are simply not composed onto this tab.

## What Changes

- **Work Orders tab becomes a client-scoped maintenance workspace.** Replace the single open-queue card with: a KPI metric strip (Open · In Progress · Urgent/Emergency · Resolved · Open est. cost), the full client-scoped **work-orders table** (per order: severity dot · title · property · opened · est. cost · status pill · inline Start/Resolve/Cancel + Assign-vendor), and the org **vendor directory** card that feeds the assign action.
- **Compose existing, tested components** — `KpiMetricStrip`, `WorkOrdersTable`, `VendorsCard`, `MaintenanceQueueCard` — rather than build new widgets. Reusing the same table + tiles the global `/pro/work-orders` page renders is what keeps the surfaces aligned by construction.
- **Extract a shared `deriveWorkOrderSurfaces(ctx)`** from the derivation currently inline in `getWorkOrdersPageData` (rows sort, `{open,inProgress,resolved,urgentOpen}` counts, open-cost total, trade-vendor directory) and call it from both `getWorkOrdersPageData` (full ctx) and `getClientPortfolioData` (the already-built `scoped` slice). No new business logic, no schema change — this guarantees the global page and the client tab can never drift.
- **Overview tab keeps a compact open-queue snapshot** (`MaintenanceQueueCard`, top of the queue) that links into the Work Orders tab; the full table + status tiles live only on the tab, so each surface has one job.

## Capabilities

### New Capabilities
- `client-work-orders-workspace`: The manager's per-client Work Orders tab presents a complete, client-scoped maintenance workspace — status/KPI tiles, the full work-order table with severity, property, vendor assignment and inline status actions, and the vendor directory — all derived from real records for that one client.

### Modified Capabilities
<!-- No archived specs in openspec/specs/ to modify. This tab composes surfaces defined by the still-active `align-client-manager-parity` change; the alignment principle (a shared work-order table + tiles derived by one `deriveWorkOrderSurfaces` helper) is captured in prose above and in design.md, to be reconciled as a delta once that change is archived. -->

## Impact

- **Query layer:** `app/(pro)/pro/queries.ts` — new pure `deriveWorkOrderSurfaces(ctx)` returning `{ rows, counts: {open,inProgress,resolved,urgentOpen}, totalOpenCost, vendors }`; `getWorkOrdersPageData` refactored to call it (behavior byte-identical); `ClientPortfolioData` gains `workOrderCounts`, `totalOpenWorkOrderCost`, and `workOrderVendors`; `getClientPortfolioData` calls `deriveWorkOrderSurfaces(scoped)` and its existing `workOrders` rows come from the same helper. No new derivation logic in `lib/services/pro-derive.ts`.
- **New tab composition:** `app/(pro)/pro/clients/[clientId]/work-orders/page.tsx` replaced with a `ClientWorkOrdersPage` client component (new `_components/ClientWorkOrdersPage.tsx`) that composes the reused tiles + table + vendors card.
- **Reuse (one additive prop):** `WorkOrdersTable` gains an optional `hideClient?: boolean` that drops the repeated client name from each row subtitle on a single-client surface — additive, backward-compatible; the global `/pro/work-orders` keeps passing nothing and is unchanged. `KpiMetricStrip`, `VendorsCard`, `MaintenanceQueueCard` reused with no prop changes.
- **Overview trim:** `app/(pro)/pro/clients/[clientId]/_components/ClientPortfolioPage.tsx` keeps the `MaintenanceQueueCard` open-queue snapshot and adds a "View all work orders →" link to the Work Orders tab; the full table lives only on the tab.
- **No schema migration.** Every field comes from existing tables (`maintenance_items`, `professionals`, `properties`) already loaded by `loadProContext`.
- **No new write path.** The tab reuses the existing, already-audited `updateWorkOrder` action via `WorkOrdersTable`'s inline actions; no new mutation is introduced.
