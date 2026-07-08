## Context

`getClientPortfolioData(clientId)` (`app/(pro)/pro/queries.ts`) builds a `scoped: ProContext` whose `leases`, `payments`, `maintenance`, `certifications`, and `properties` are filtered to one client's properties, then returns `activity: buildActivityFeed(scoped, 12)`. `buildActivityFeed` (`lib/services/pro-derive.ts`) synthesizes at most 12 `ProActivityEvent`s from payments (category `payment`), maintenance (`maintenance`), and leases (`lease`) — each with `description`, `clientName`, `propertyName`, `timestamp`, but **no actor**.

The real audit log lives in the `activities` table (`lib/db/schema/activities.ts`): `id`, `orgId`, `userId` (raw Clerk id — **no display name stored**), `entity` (plain text: `property`/`payment`/`workOrder`/`photo`/`document`/…), `action` (`created`/`updated`/`deleted`/…), `entityId`, `title`, `description`, `propertyId` (nullable), `createdAt`. Its domain type is `Activity` (`lib/data/types/activity.ts`). The only reader, `listActivities(ctx, propertyId?, limit)` (`lib/services/activities.ts`), filters by `ctx.orgId` (the manager's **own** auth org) or a single property — neither of which matches a managed client whose activity lives under `client.orgId`. The Standard shell page `app/(shell)/activity/page.tsx` renders this same table for the signed-in owner via a bespoke list (not `ActivityFeed`).

`loadProContext` (`lib/services/pro-dashboard.ts`) does **not** load `activities` at all — so surfacing the audit log requires a new read, not a filter over existing context.

## Goals / Non-Goals

**Goals:**
- Make the Activity tab a day-grouped, client-scoped timeline that surfaces MORE real data than the 12-row synthesized feed.
- Reach the real `activities` audit log for a managed client (who/what/when), honestly — show only what is stored, never a fabricated actor name or event.
- Keep Standard and Pro aligned by rendering both through one `ActivityFeed` component (Standard convergence tracked as follow-up).
- Keep every change to `ActivityFeed` additive so the dashboard and Overview usages are byte-unchanged.

**Non-Goals:**
- No new write path — Activity is read-only (writes stay on the `align-client-manager-parity` audited path).
- No schema migration — the `activities` table already exists.
- No Clerk user-name lookup service — actor display is limited to "You" vs. the stored id (see Decision 4).
- No rewrite of the Standard `/activity` shell page in this change (convergence is a follow-up).

## Decisions

### Decision 1: Merge the audit log with the synthesized feed (vs. audit-only or synthesized-only)
Build the tab's `activity` list as **synthesized record-events + mapped audit-log rows**, sorted newest-first, then grouped by day. The two sources answer different questions:
- **Synthesized** (`buildActivityFeed`) = current-state records → "a rent payment exists, a lease was signed" (covers seed data and anything not written through the audited path).
- **Audit log** (`activities`) = write events → "the manager updated this property / approved this change request, at this time."

**Why merged:** audit-only would show nothing for the seeded demo client (seed data writes no `activities` rows) and would drop the operational reality; synthesized-only is exactly today's gap (no actor, no audit trail). Merged is strictly more informative.

**Known limitation (flag):** a payment logged *through* the audited path can appear twice — once synthesized ("Rent collected — €X") and once as an audit row ("payment.created"). We do **not** build fuzzy dedup in v1; the two rows carry different icons/`source` and read as complementary ("a payment was recorded" + "you recorded it"). Hard dedup is deferred (open question iv). In practice the seeded client has audit rows only after the manager acts, so early overlap is minimal.

### Decision 2: Scope the audit read org-first, with a property-id fallback
Add a new reader in `lib/services/activities.ts`:
```
listActivitiesForScope(scope: { orgId?: string; propertyIds?: string[] }, limit = 50): Promise<Activity[]>
```
- **Managed client with `client.orgId`** → filter `activities.orgId === client.orgId` (org-first: catches org-level events with a null `propertyId`).
- **Own-portfolio / null-org / legacy client** → filter `activities.propertyId IN (client property ids)` within the manager's own org.

`getClientPortfolioData` already resolved the client and its `clientPropertyIds` under the manager's managed org set (`loadProContext`), so it passes a scope the manager is already authorized for. The reader stays strictly org-/property-scoped and never returns cross-org rows. **Alternative considered:** extend `listActivities` with an `orgId` override — rejected because its `ctx.orgId` contract ("your own org") is load-bearing for the Standard `/activity` page; a separate function keeps that contract intact.

### Decision 3: Extend `ActivityFeed` additively for day-grouping + load-more
`ActivityFeed` gains optional props, all defaulted to today's behavior:
- `grouped?: boolean` (default `false`) — when true, bucket items into **Today / Yesterday / This week / Earlier** with sticky-ish day headers (Zoho/Todoist grammar); when false, the current flat list (dashboard/Overview) is unchanged.
- `initialCount?: number` — when set, render the first N and reveal the rest via a **Load more** button (Vercel grammar). Client-side slice reveal, no server cursor.
- Rows optionally render an **actor line** when `item.actor` is present.

The Activity tab passes `grouped initialCount={20}`; the dashboard/Overview pass neither → identical output to today. **Why extend, not fork:** the prompt's alignment principle — one component across Standard and Pro so they can't drift. `ClientActivityPage` (a thin `"use client"` wrapper) may hold the Load-more state if we keep `ActivityFeed` presentation-only; either is fine.

### Decision 4: Honest actor attribution (no fabrication)
`activities.userId` is a raw Clerk id; no display name is stored and we add no Clerk lookup. The actor line resolves to **"You"** when `userId === authCtx.userId` (the manager's own on-behalf action — the common case) and otherwise shows nothing (or the raw id behind a subtle style) rather than inventing a name. Synthesized rows have no actor and render no actor line. This satisfies the "show only what's stored" constraint.

### Decision 5: Category mapping keeps the existing filter pills meaningful
Audit `entity` values map into the existing pill buckets where they fit — `payment`→`payment` (Financial), `workOrder`→`maintenance` (Maintenance), `lease`→`lease` (Leasing) — and everything else (`property`/`photo`/`document`/`coOwner`/…) falls into a new general **`update`** category surfaced by a 5th "Updates" pill. `CATEGORY_STYLE` gains an `update` entry (neutral slate icon, e.g. `PencilLine`); `FILTER_TO_CATEGORIES` gains the pill. Additive — the three existing categories keep their icons/colors.

### Decision 6: Overview keeps a compact flat snapshot + link
`ClientPortfolioPage.tsx` renders `ActivityFeed` in its current flat mode over the first few events (no `grouped`), plus a "View all activity →" link to the tab. The full grouped timeline lives only on the Activity tab, so the two surfaces stop duplicating a long list.

## Risks / Trade-offs

- **`ActivityFeed` is a shipped component (dashboard + Overview + Activity tab)** → every prop is optional and defaulted; flat mode output is unchanged. Verify the dashboard and Overview still typecheck and render identically.
- **Merge double-count** (Decision 1) → accepted for v1 with distinct `source`/icons; hard dedup deferred. Flagged as open question iv.
- **Scope leak** → the new reader is org-/property-scoped only; it never widens beyond the passed scope, and the caller only ever passes a client the manager manages.
- **Audit log empty for seed data** → the merged feed still shows the synthesized events, so the tab is never worse than today; a few real `activities` rows (via the `.context/seed-cli-0011.mjs` additive-seed precedent) exercise the audit path for QA.
- **`ProActivityEvent` category widening** touches `ActivityFeed`'s `CATEGORY_STYLE`/`FILTER_TO_CATEGORIES` and `buildActivityFeed` (exhaustive maps) → additive new key, existing keys unchanged; tsc catches any missed map entry.

## Migration Plan

Pure additive/compose change, no data migration. Rollback = revert the commit; no persisted state changes. Ship behind no flag (read-only UI). Verify on the seeded `CLI-0011` client (has payments/work-orders/leases so the synthesized feed is non-empty; add a few `activities` rows to exercise the audit view) and on an empty client for the empty state.

## Open Questions

1. **Source shape** — synthesized-only (richer) vs audit-log-only vs **MERGED**? *Recommendation: MERGED (Decision 1).*
2. **Scoping key** — org-first (`client.orgId`) vs property-id set? *Recommendation: org-first with property fallback for null-org clients (Decision 2).*
3. **Grouping** — day-grouped (Today/Yesterday/This week/Earlier) vs flat newest-first? *Recommendation: day-grouped on the tab, flat on Overview (Decision 3/6).*
4. **Cap / paging & dedup** — cap at ~50 with client-side Load-more (no dedup) vs. build audit↔synthesized dedup now? *Recommendation: 50 + Load-more, defer dedup (Decision 1/3).*
