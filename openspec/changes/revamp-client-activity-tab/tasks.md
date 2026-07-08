## 1. Service layer — client-scoped audit-log read

- [x] 1.1 Added `listActivitiesForScope(scope: { orgId?; propertyIds? }, limit = 50)` to `lib/services/activities.ts` — org-first (`activities.orgId === scope.orgId`), else `activities.propertyId IN scope.propertyIds`; empty scope returns `[]` (never the whole table); newest-first; reuses `rowToActivity`.
- [x] 1.2 Left `listActivities` untouched (its `ctx.orgId` contract powers the Standard `/activity` page).

## 2. Query layer — merge audit rows into the client activity feed

- [x] 2.1 Widened `ProActivityEvent` (`lib/services/pro-derive.ts`): added optional `actor?: string`, `source?: "record" | "audit"`; category union gained `"update"`. Additive — existing producers still compile.
- [x] 2.2 `getClientPortfolioData` (`app/(pro)/pro/queries.ts`) calls `listActivitiesForScope({ orgId: client.orgId ?? undefined, propertyIds: [...clientPropertyIds] }, 50)`, maps each `Activity` → `ProActivityEvent` (category via `categoryForEntity`; `actor` = "You" when `userId === authCtx.userId`, else undefined; `source:"audit"`; property name from `scoped.propertyById`), merges with `buildActivityFeed(scoped, 50)` (`source:"record"`), sorts newest-first, caps 50. `requireCtx()` hoisted to the top of the function and reused.
- [x] 2.3 Own-portfolio / null-org clients pass `propertyIds` only (orgId undefined) → fallback scopes by property. `OWN_PORTFOLIO_ID` path unchanged.
- [x] 2.4 `queries.test.ts` (tsc-checked, not executed): added a merge test asserting cap ≤ 50, newest-first ordering, valid category, `source ∈ {record, audit}`, record events carry no actor, and any actor is exactly "You".

## 3. ActivityFeed — additive grouping + load-more (backward-compatible)

- [x] 3.1 `ActivityFeed`: added optional `grouped?: boolean` and `initialCount?: number`. Default (both absent) = flat list. `grouped` buckets into Today / Yesterday / This week / Earlier with day headers. `initialCount` renders the first N + a "Load more" reveal (client-side slice). Extracted a shared `ActivityRow` so flat and grouped can't drift.
- [x] 3.2 Added the `update` entry to `CATEGORY_STYLE` (neutral slate `PencilLine`) and an "Updates" pill to `FILTERS` / `FILTER_TO_CATEGORIES`.
- [x] 3.3 Row renders the optional actor line ("You") above the description when `item.actor` is present; synthesized rows render none.
- [x] 3.4 Dashboard (`ManagerDashboardPage`) + Overview usages compile unchanged (flat mode, no new props) — verified by tsc.

## 4. Activity tab composition + Overview snapshot

- [x] 4.1 `activity/page.tsx`: renders `<ActivityFeed activity={data.activity} grouped initialCount={20} />` (Load-more state lives inside `ActivityFeed`, already a client component — no wrapper needed).
- [x] 4.2 `ClientPortfolioPage.tsx` Overview: compact flat `ActivityFeed` over `data.activity.slice(0, 5)` + a "View all activity →" link card to the Activity tab.
- [x] 4.3 Empty state: reused `ActivityFeed`'s `EmptyState`; refined copy to include edits ("… and edits you make will land here").

## 5. Verify

- [x] 5.1 `npx tsc --noEmit` → 0 errors; `eslint` clean on all seven touched files.
- [x] 5.2 `ActivityFeed`'s dashboard + Overview usages typecheck with unchanged/optional props (flat mode identical).
- [~] 5.3 Live QA on seeded `CLI-0011` (synthesized feed non-empty; add a few `activities` rows via the `.context/seed-cli-0011.mjs` precedent to exercise the audit view) — **PENDING (author runs; dev server is theirs)**.
- [~] 5.4 Live QA on an empty client (empty state) — **PENDING**.
- [x] 5.5 `graphify update .` run; docs/plans mirror + this file updated with honest status.
