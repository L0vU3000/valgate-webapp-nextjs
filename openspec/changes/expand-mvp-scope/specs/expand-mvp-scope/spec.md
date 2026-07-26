# Spec — expand-mvp-scope

## Overview

Valgate v1 remains a **single-owner** property-vault product. This change widens the post-cut surface:
three cut features return, the user manual returns as public content, and the property detail gains a
contextual Activity panel. The Professional product and the standalone Activity feed stay removed. No
database schema changes — every surface here reads tables that already exist.

## Surface (what a user can reach)

### Navigation

The consumer sidebar has exactly five items, in order:

1. **Home** — `/`
2. **Portfolio** — `/portfolio`
3. **Rental** — `/rental`
4. **Analytics** — `/analytics`
5. **Settings** — `/settings`

There is still no Pro/Professional entry point. `/pro/*` and `/manager/*` do not resolve. `/activity`
(the standalone feed) does not resolve.

### Property detail

A property page exposes six sections plus edit, with the Financials tab restored:

`overview` · `financials` · `documents` · `ownership` · `rental` · `location` · (`edit`)

The overview page shows a financials summary card. The page also renders a **contextual Activity panel**
(see below). Removed sections (`safety`, `ownership2`) remain unreachable.

### Property Activity panel

The property detail renders a read-only Activity panel scoped to that property:

- Lists recent actions on the property — valuation added, document added/removed, ownership edited,
  property updated — newest first, grouped by day, with a human-readable description and relative time.
- Reads the existing `activities` table filtered by `propertyId`, **org-scoped** (a property in another
  org's scope is never shown).
- Shows an empty state ("No activity yet.") when the property has no recorded actions.
- There is **no** standalone/global activity feed and **no** filter control in this version.

Every kept mutation on a property (update, valuation create, document create/delete, ownership update)
appends exactly one `activities` row. A failure to write the activity row never fails the mutation it
describes.

### AI chat assistant

The conversational AI overlay and Agent Hub are reachable again from the authenticated shell. The
document scan/extraction pipeline (kept by `cut-to-mvp-core`) is unchanged and independent.

### User manual (docs)

The Fumadocs user manual is served at `/docs` from a **public** `(marketing)` route group:

- Reachable **without authentication** (Clerk middleware treats `/docs` and its children as public).
- Not wrapped by the authenticated app shell.
- Not part of the authenticated app's bundle.

## Data (schema policy)

- No new tables and no migration. The Activity panel reads the pre-existing `activities` table
  (`propertyId` column + `ix_activities_property` index already present).
- Restored features (Analytics, Financials, AI chat) reconnect to tables that were never dropped.
- `seed:reset` is never run. Existing seed data is preserved verbatim.

## Reversibility

Restored features come from `valgate-pro @ 44c70b9f` via path-scoped checkout. Re-removing any of them is
deleting the same paths again. The full pre-cut app remains preserved on `valgate-pro`.

## Non-goals

- No Professional/manager product.
- No standalone `/activity` feed.
- No database schema or data changes.
- No redesign of the restored features.
- No activity event types beyond the four property mutations named above (more are free later without a
  migration, but out of scope here).
