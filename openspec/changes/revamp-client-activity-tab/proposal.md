## Why

The manager's client Activity tab (`/pro/clients/[clientId]/activity`) renders a single `ActivityFeed` over `data.activity` — a feed **synthesized** by `buildActivityFeed(scoped, 12)` from the client's payments, work orders, and leases. It is capped at 12 rows, has no day grouping, and — critically — records **no actor**: it shows *what exists* (a rent payment, a signed lease) but never *who did what, when*. Meanwhile a real `activities` audit-log table already records exactly that — the audited write path (manager on-behalf edits, change-request approvals, property/photo/document changes) writes a row per action with `entity`, `action`, `title`, `description`, `user_id`, `property_id`, `org_id`, `created_at`. That audit trail is **completely unreachable on this surface**: `loadProContext` never loads it, and the only reader, `listActivities`, filters by the manager's own `ctx.orgId` — not the client's `client.orgId`. So the genuine "more informative" opportunity is not composing existing widgets (unlike the Financials/Work-Orders tabs, there is no rich global page to mirror) — it is **surfacing the real audit log** alongside the synthesized events.

## What Changes

- **Activity tab becomes a day-grouped, client-scoped timeline** — events bucketed under **Today / Yesterday / This week / Earlier**, each row an icon + description + property + relative time, filterable by category (existing pills), with more than 12 rows via a client-side **Load more**.
- **Merge the real `activities` audit log into the feed** (recommended — see design Decision 1). Synthesized record-events (payment/maintenance/lease) show the financial/operational reality; audit-log events add the **who/what/when** the synthesized feed can't. Each row keeps its own category icon; audit rows carry an optional **actor line** ("You" when the actor is the manager's own Clerk id; otherwise the stored id — never a fabricated name).
- **Add a client-scoped audit-log read.** `getClientPortfolioData` gains an activities read scoped by `client.orgId` (org-first) with a `property_id`-set fallback for own-portfolio / null-org clients. This needs a new service function in `lib/services/activities.ts` because the existing `listActivities` only reads the caller's own org or a single property.
- **Extend `ActivityFeed` additively** — a new optional `grouped` mode (day headers), an optional actor line, and a Load-more affordance. The dashboard and Overview keep calling it with unchanged props, so their flat compact list is untouched. Standard (`/activity` shell) and Pro share this one component so the two presentations cannot drift.
- **Overview keeps a compact recent-activity snapshot** (first few events, flat) that links into the Activity tab; the full grouped timeline lives only on the tab.

## Capabilities

### New Capabilities
- `client-activity-workspace`: The manager's per-client Activity tab presents a complete, client-scoped activity timeline — day-grouped events merging the client's real audit log (who/what/when) with synthesized payment/work-order/lease events, filterable by category, with load-more paging and honest actor attribution — all derived from real records and audit rows for that one client.

### Modified Capabilities
<!-- No archived specs in openspec/specs/ to modify. This tab surfaces the audit log written by the still-active `align-client-manager-parity` change; the alignment principle (one shared ActivityFeed across Standard and Pro) is captured in prose here and in design.md, to be reconciled as a delta once that change is archived. -->

## Impact

- **Service layer:** `lib/services/activities.ts` — add a client-scoped reader (e.g. `listActivitiesForScope({ orgId, propertyIds }, limit)`) that filters by an explicit org id (org-first) or a property-id set (fallback). Org-scoped, never cross-org; trusts the caller (`getClientPortfolioData`) to pass an org/properties the manager already manages — the same trust model as the rest of the `scoped` slice.
- **Query layer:** `app/(pro)/pro/queries.ts` — `getClientPortfolioData` calls the new reader over `client.orgId` (or the client's property ids) and **merges + maps** audit rows into the activity list; `ClientPortfolioData.activity` items gain optional `actor` / `source` fields. `buildActivityFeed` in `lib/services/pro-derive.ts` stays as-is (still the synthesized source); the merge happens in the query layer.
- **Type:** `ProActivityEvent` (`lib/services/pro-derive.ts`) gains optional `actor?`, `source?: "record" | "audit"`, and its `category` union widens to cover audit entities not already mappable to payment/maintenance/lease (a general "update" bucket). All additive — existing producers/consumers keep compiling.
- **Component:** `app/(pro)/pro/dashboard/_components/ActivityFeed.tsx` — additive optional props: `grouped?`, `initialCount?` (Load more). Dashboard/Overview usages unchanged (flat mode by default).
- **New tab composition:** `app/(pro)/pro/clients/[clientId]/activity/page.tsx` stays a thin server shell; renders `<ActivityFeed grouped activity={data.activity} />` (optionally via a small `ClientActivityPage` wrapper for the Load-more state).
- **Overview trim:** `ClientPortfolioPage.tsx` keeps a compact flat snapshot + "View all activity →" link.
- **No schema migration.** The `activities` table already exists and is already written by the audited path. This is a read/compose change.
