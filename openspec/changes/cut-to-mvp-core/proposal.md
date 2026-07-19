## Why

Valgate today is **two full products in one repo** — a Consumer owner app (10 nav items, 9-tab
property detail) and a Professional manager cockpit (~25 routes, an 8-page client view plus an 8-page
"as-client" mirror). ~48 DB tables, ~70 service modules. This is the Burbn problem: the app does
check-ins *and* plans *and* points *and* photos, and no single user has a clear reason to come back.

Before Valgate has product-market fit, breadth is a liability, not an asset. Every extra surface is
something to seed, QA, keep wired, and explain — and none of it is the thing a property owner actually
needs on day one:

> **An organized digital record of the properties I own — what it is, where it is, what it's worth,
> who owns it, its rental situation, and the documents that prove it — where AI reads my title deeds
> and fills it in for me.**

The core loop, and nothing else:

```
Add property  →  upload docs, AI extracts everything  →  see it in Portfolio  →  open it: facts, rental, documents
   (the magic filter)                                       (the feed)
```

This change is the Instagram-from-Burbn cut: keep the hyper-focused core, remove everything else. The
full pre-cut app is preserved on the `valgate-pro` branch (snapshot at `44c70b9f`, pushed to origin),
so nothing is lost — cut features are a git checkout away.

## What Changes

**Cut depth = B: delete the routes, components, and services for cut features. Leave the Drizzle
schema tables untouched (dormant).** The app surface becomes genuinely lean and the diff tells the
story, but the ~48 tables stay so the evolved seed data survives and any feature is a git-revert away.
We do **not** drop tables or run `seed:reset`.

### Keep (the MVP core)

| Area | Routes |
|---|---|
| Auth | `login`, `register`, `forgot-password`, `accept-invitation`, `oauth-consent` |
| Home + Portfolio | `/` , `/portfolio` |
| Add property + AI ingestion | `/add-property`, `/add-property/import`, `/import-tenants`, `/import-valuations` |
| Rental | `/rental` |
| Property detail | `overview`, `location`, `valuation`, `ownership`, `rental`, `documents`, `edit` |
| Settings | `/settings`, `/profile` |

Consumer sidebar shrinks from **10 → 4** items: Home, Portfolio, Rental, Settings.
Property detail shrinks from **9 → 6** tabs.

### Cut (deleted routes/components/services; schema left dormant)

| Cut | Includes |
|---|---|
| **Entire Pro product** | all of `app/(pro)/` — dashboard, clients, as-client mirror, rent, work-orders, compliance, agents, add-account |
| Work Orders | `/work-orders` + `maintenance-items` service |
| Compliance + Safety | `/compliance`, `property/[id]/safety` + `certifications`, `inspections`, `safety-risks` services |
| Estate Planning | `/estate-planning` + `successors`, `estate-assignments`, `estate-activity-events` services |
| Directory | `/directory`, `/directory/[id]` + `professionals` service |
| Analytics | `/analytics` |
| Activity feed | `/activity` (owner) + change-request / pending-changes surfaces |
| AI chat agent | the conversational AI overlay + Agent Hub (extraction/scan AI is **kept**) |
| Extra property tabs | `financials`, `ownership2` |
| Dev/marketing scaffolding | `/dbdiagram`, `/launch`, `/docs` (Fumadocs manual) |
| Pro-only middleware | `/pro`/`/manager` rewrites + the `(pro)` route-group guard |

### Wiring cleanup (the real work)

Deleting routes is easy; unwiring the cut features from the *kept* surface is the work:

1. **Consumer sidebar** — remove Directory, Work Orders, Compliance, Analytics, Estate Planning, Pro.
2. **Property overview page** — remove the cards/sections that summarize cut tabs (safety, financials,
   compliance); keep overview, location, valuation, ownership, rental, documents.
3. **Shell layout** — unmount the AI chat overlay; keep the scan/extraction entry points inside
   add-property.
4. **Services** — delete only services used *exclusively* by cut routes; `tsc` is the check. Keep
   `properties`, `documents`, `ownership*`, `leases`/`tenants` (rental), `property-valuations`,
   `land-parcels`, `co-owners`, the `ingestion/*` pipeline, `identity`, `user-profiles`, `storage`.
5. **Middleware / next.config** — drop `/pro` and `/manager` route handling.
6. **Nav guards** — remove the `Pro` link and the `(pro)` layout guard entirely.

## Non-goals

- **No schema/table deletion.** Cut tables stay in `lib/db/schema/*` and Neon. No migration, no
  `seed:reset`. (Depth C is explicitly rejected — the seed data is irreplaceable.)
- **No new features.** This is a subtraction-only change. Kept features are not redesigned.
- **No Pro rewrite.** Pro is removed, not rebuilt smaller. It lives on `valgate-pro` if we return to it.
- **No auth-model change.** Clerk stays; org/manager roles simply go unused.

## Impact

- **Affected routes:** ~35 deleted, ~18 kept.
- **Affected code:** `app/(pro)/**` (whole tree), several `app/(shell)/**` routes, cut-only services in
  `lib/services/`, the consumer `Sidebar`, `ShellLayout` (AI overlay), `middleware.ts`, `next.config.ts`.
- **Untouched:** `lib/db/schema/**` (dormant tables), seed data, Neon branch, the ingestion pipeline.
- **Reversibility:** full — `valgate-pro @ 44c70b9f` is the restore point.
- **Verification:** `tsc` clean + `npm run build` + a manual pass of the 4-item nav and the
  add → portfolio → property → rental → documents loop.
