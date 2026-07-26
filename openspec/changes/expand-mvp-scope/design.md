# Design — expand-mvp-scope

Three of the five items are mechanical restores; the design work lives in **two** decisions — where the
docs go, and how the Activity panel gets data. The rest is re-wiring.

## 1. Restore strategy (Analytics, Financials, AI chat)

These were deleted by `cut-to-mvp-core`, not rewritten. The full files still exist on `valgate-pro`.

```
git checkout valgate-pro@44c70b9f -- <path>      # bring the files back onto valgate-mvp-v1
```

Paths (from the cut's own tasks.md, so they are exact):
- Analytics — `app/(shell)/analytics/`
- Financials tab — `app/(shell)/property/[id]/financials/`
- AI overlay — `components/layout/ai-overlay/` (+ the Agent Hub mount points inside `ShellLayout`)

**Why checkout over merge:** a branch merge would drag the whole Pro product back. A path-scoped checkout
takes exactly these three trees and nothing else. After checkout, `tsc` is the guide — any import the
restored files need that was *also* deleted gets restored the same way, one path at a time. The services
these features read (`property-valuations`, `documents`, financials derivations) were **kept** by the
cut, so the restores should re-connect with little surgery.

## 2. Docs placement — public route group, not app shell

The manual is support content. Putting it back at `app/docs/` inside the authenticated `(shell)` would
(a) require login to read a manual, (b) ship Fumadocs into the app bundle, and (c) re-inflate exactly what
the cut removed.

```
app/
  (shell)/        ← authenticated app (Clerk-gated)
  (marketing)/    ← NEW public group, no auth
    docs/         ← Fumadocs manual, restored here
```

- `(marketing)` is a **route group** — no URL segment, so the manual still lives at `/docs`.
- `middleware.ts` (Clerk) must list `/docs` (and `/docs/(.*)`) as **public** so logged-out visitors reach
  it. This is the one middleware edit in the change.
- Fumadocs config/deps that the cut removed come back with the route group.

Rejected: a separate `docs.valgate.co` subdomain — a second deploy to run, unjustified at this size.

## 3. Property Activity panel — data first, UI second

The panel is easy; **making it non-empty is the design problem.** The `activities` table already exists
and is already shaped for this (from `lib/db/schema/activities.ts`):

```
activities( id, orgId, userId, entity, action, entityId, title, description, propertyId, createdAt )
index ix_activities_property on (propertyId)   -- comment: "used by the per-property panel"
```

So schema is done. Two gaps:

**a. Reads.** A per-property query already belongs in the dormant `activities.ts` / `activity.ts`
service. Verify/restore `getPropertyActivity(propertyId, orgId)` — org-scoped, filter by `propertyId`,
order by `createdAt desc`, limit ~50. Never accept `propertyId` without the `orgId` guard (IDOR).

**b. Writes (the real work).** The table is **dormant — nothing writes to it**, so the panel would render
empty forever. Each kept mutation must append one activity row:

```
┌───────────────────────────┐     writes      ┌──────────────┐    reads     ┌───────────────┐
│ kept mutations            │ ──────────────▶ │ activities   │ ───────────▶ │ Activity panel│
│ • property update         │  logActivity()  │ (per-property)│  getProperty │ on /property  │
│ • valuation add           │                 │              │  Activity()  │ /[id]         │
│ • document add / remove    │                 └──────────────┘              └───────────────┘
│ • ownership edit          │
└───────────────────────────┘
```

- Add one small `logActivity(ctx, { entity, action, entityId, propertyId, title, description })` helper in
  the activities service (append-only; UUID id, org+user from ctx — matches the table's design notes).
- Call it from the service functions that already own these mutations (property update, valuation create,
  document create/delete, ownership update) — **inside** the same code path, best-effort: a failed log
  write must never fail the mutation it describes (wrap in try/catch, swallow-and-continue).
- Scope creep guard: only these four mutation types in this change. More event types are free later
  (plain-text `entity`/`action`, no migration) but out of scope here.

**UI.** A read-only right-rail list on the property detail (mount in `PropertyLayout.tsx`): avatar/initials,
`description`, relative timestamp, grouped by day — the Dropbox panel shape. Empty state: "No activity
yet." No filters in v1 (Dropbox has a Filter dropdown; defer — YAGNI until there is volume).

## What this change explicitly does NOT touch

- No new tables, no migration, no `seed:reset`.
- No Pro/manager code returns.
- No global `/activity` feed.
- Restored features are not redesigned.
