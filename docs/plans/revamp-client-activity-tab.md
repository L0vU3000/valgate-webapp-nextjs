# Revamp Client Activity Tab → day-grouped timeline + real audit log

- **Plan ID:** `plan-9fbe4bdd5e7f4caa` · [hosted](https://plan.agent-native.com/plans/plan-9fbe4bdd5e7f4caa)
- **OpenSpec change:** `openspec/changes/revamp-client-activity-tab/` (proposal · design · spec · tasks) — `openspec validate --strict` ✅
- **Status:** implemented (all 4 decisions locked → A/A/A/A; tsc + eslint green) — **live QA PENDING (author's)**.
- **Workspace:** luxembourg · **Route:** `/pro/clients/[clientId]/activity`

## Objective

`/pro/clients/[clientId]/activity` renders one `ActivityFeed` over `data.activity` — a feed **synthesized** by `buildActivityFeed(scoped, 12)` from the client's payments/work-orders/leases. It is capped at **12 rows**, has **no day grouping**, and records **no actor** (shows *what exists*, never *who did what, when*).

A real `activities` **audit-log table** (`entity · action · title · description · user_id · property_id · created_at`) already records the who/what/when — but it is **unreachable here**: `loadProContext` never loads it, and the only reader `listActivities` filters by the manager's *own* `ctx.orgId`, not the client's `client.orgId`. Unlike the Financials/Work-Orders tabs there is **no rich global page to mirror**, so the upgrade is *surfacing more real data*.

**Target:** a day-grouped (Today / Yesterday / This week / Earlier), client-scoped timeline that **merges** the real audit log with the synthesized events, filterable by category, with >12 rows via Load-more, honest actor attribution, and a compact Overview snapshot — all through **one shared `ActivityFeed`** so Standard and Pro can't drift.

## Locked decisions (user: "go with rec" — A/A/A/A)

| # | Question | Decision |
|---|---|---|
| 1 | Source shape | **MERGED** — synthesized records + real audit rows, each `source`-labeled |
| 2 | Scoping key | **Org-first** (`client.orgId`), property-id fallback for own-portfolio / null-org clients |
| 3 | Grouping | **By day** on the tab; flat compact snapshot (first 5) on Overview |
| 4 | Cap / paging & dedup | **Cap 50 + client-side Load-more**, no fuzzy dedup in v1 |

Actor line = **"You"** when the audit row's `userId` is the signed-in manager's Clerk id; otherwise render nothing — **never a fabricated name** (only a raw Clerk id is stored).

**Implemented** across 7 files (see reuse map). `npx tsc --noEmit` → 0 errors; `eslint` clean on all touched files; `graphify update .` run. Live QA (seeded `CLI-0011` + an empty client) is the author's to run.

## Design language (`.impeccable.md`)

Light-mode primary; **borders over shadows** (border-only `rounded-lg` card, no elevation); data-is-the-hero; blue stays precious (kept for the `lease` category only). Day headers are quiet uppercase muted labels (Zoho/Todoist grammar). Reuse the shipped `WidgetCard` + `EmptyState` + `formatRelativeTime`. Scoped density: the client tab breathes a little more than the cross-portfolio dashboard.

**Mobbin refs:** [Vercel — Activity](https://mobbin.com/screens/e6f12935-765d-40eb-b418-87195bbfe0ec) (whole surface: date-group + type filter + Load More) · [Zoho CRM — Audit Log](https://mobbin.com/screens/b27943e6-e8ff-4fc0-8d27-dfe0c33c124f) (day header + actor grammar) · [Todoist — Activity](https://mobbin.com/screens/e883e41d-e3c3-4e16-a779-a457643492af) (day header + actions dropdown) · [7shifts — Activity](https://mobbin.com/screens/39d6a081-1cd1-474a-91bc-81e63426ace9) (actor + action badge) · [Substack — No activity yet](https://mobbin.com/screens/e1f7fe3c-e7f1-4139-a815-9cedac37d689) (empty state).

## Reuse-first map

| File | Change | What it reuses / adds |
|---|---|---|
| `app/(pro)/pro/dashboard/_components/ActivityFeed.tsx` | REUSE + extend | Add optional `grouped?`, `initialCount?` (Load-more), actor line; add `update` to `CATEGORY_STYLE` + an "Updates" pill. Dashboard/Overview pass no new props → flat mode byte-unchanged. |
| `lib/services/activities.ts` | ADD reader | New `listActivitiesForScope({ orgId?, propertyIds? }, limit=50)` — org-first, else property-id set; org/property-scoped only; reuses `rowToActivity`. `listActivities` untouched (powers Standard `/activity`). |
| `app/(pro)/pro/queries.ts` | MERGE | `getClientPortfolioData` reads the audit log over `client.orgId`/`clientPropertyIds`, maps `Activity`→`ProActivityEvent` (`source:'audit'`, actor), merges with `buildActivityFeed(scoped,50)` (`source:'record'`), sorts, caps 50. |
| `lib/services/pro-derive.ts` | WIDEN type | `ProActivityEvent` gains optional `actor?`, `source?: 'record'\|'audit'`; `category` adds `update`. `buildActivityFeed` unchanged. |
| `app/(pro)/pro/clients/[clientId]/activity/page.tsx` | thin shell | Render `<ActivityFeed grouped initialCount={20} activity={data.activity} />` (optional `ClientActivityPage` wrapper for Load-more state). |
| `app/(pro)/pro/clients/[clientId]/_components/ClientPortfolioPage.tsx` | Overview | Compact flat `ActivityFeed` + "View all activity →" link. |
| `app/(pro)/pro/queries.test.ts` | tsc invariants | Client-scoping, `source:'audit'`, actor-only-for-self. Runner excludes this file (server-only) → tsc-checked, not executed. |
| `.context/seed-cli-0011.mjs` | QA seed | Additive-seed a few real `activities` rows for CLI-0011 to exercise the audit view live. |

## Query-layer merge (sketch)

```ts
// getClientPortfolioData — after `scoped` is built
const auditRows = await listActivitiesForScope(
  { orgId: client.orgId ?? undefined, propertyIds: [...clientPropertyIds] },
  50,
);
const auditEvents: ProActivityEvent[] = auditRows.map((a) => ({
  id: `audit-${a.id}`,
  category: categoryForEntity(a.entity),      // payment|maintenance|lease|update
  description: a.description,
  clientName: client.name,
  propertyName: a.propertyId ? scoped.propertyById.get(a.propertyId)?.name ?? "" : "",
  timestamp: a.createdAt,
  actor: a.userId === authCtx.userId ? "You" : undefined, // no fabricated names
  source: "audit",
}));
const recordEvents = buildActivityFeed(scoped, 50).map((e) => ({ ...e, source: "record" as const }));
const activity = [...auditEvents, ...recordEvents]
  .sort((a, b) => b.timestamp - a.timestamp)
  .slice(0, 50);
```

## Verification (Phase 5–6 exit)

- `npx tsc --noEmit` → 0 errors; `eslint` clean on every touched file.
- Confirm `ActivityFeed`'s **dashboard + Overview** usages still typecheck with unchanged/optional props (flat mode identical).
- `graphify update .`; refresh OpenSpec `tasks.md` checkboxes + this mirror with honest status.
- **Live QA is the author's** (seeded `CLI-0011` + an empty client) — mark **PENDING**.

## Process trail

`/opsx:explore` → 5× Mobbin → `/opsx:propose` (validated) → `/visual-plan` (this) → **CHECKPOINT (approval)** → implement → `/impeccable` polish.
