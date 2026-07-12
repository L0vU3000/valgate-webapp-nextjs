# Spec — cut-to-mvp-core

## Overview

Valgate v1 (MVP) is a **single Consumer product**: a property owner's digital record of the properties
they own, populated by AI document ingestion. The Professional product and all ops/lifecycle features
are removed from the running app. Their database tables remain in place but dormant.

## Surface (what a user can reach)

### Navigation

The Consumer sidebar has exactly four items, in order:

1. **Home** — `/`
2. **Portfolio** — `/portfolio`
3. **Rental** — `/rental`
4. **Settings** — `/settings`

There is no Pro/Professional entry point anywhere in the UI. Visiting `/pro/*` or `/manager/*` does
not resolve to a Pro surface.

### Property detail

A property page exposes exactly six sections plus edit:

`overview` · `location` · `valuation` · `ownership` · `rental` · `documents` · (`edit`)

Removed sections (`financials`, `safety`, `ownership2`) are not reachable and are not referenced by the
overview page's tab bar or summary cards.

### Add property

Adding a property supports:

- Manual entry (`/add-property`)
- AI document ingestion — upload a document (e.g. title deed), the vision/scan model extracts fields,
  the user reviews, and the property is created (`/add-property/import`, `/import-tenants`,
  `/import-valuations`).

The AI **extraction/scan** pipeline (`lib/services/ingestion/*`, document-scan, unified-extract) is
retained. The conversational **AI chat agent** overlay and Agent Hub are removed.

## Data (schema policy)

- All Drizzle schema files in `lib/db/schema/*` remain unchanged, including tables for cut features
  (rental is kept; work-orders, safety, compliance, estate, pro/clients, notifications, activities,
  change-requests stay as dormant tables).
- No migration is generated. No table is dropped. `seed:reset` is never run. Existing seed data is
  preserved verbatim.
- Services for cut features are deleted; the tables they used simply have no code path.

## Reversibility

The full pre-cut application is preserved on branch `valgate-pro` at commit `44c70b9f` (pushed to
origin). Any removed feature can be restored by checking out its files from that branch. Because no
schema or data was destroyed, a restored feature reconnects to its existing tables.

## Non-goals

- No redesign of kept features.
- No new capabilities.
- No change to the auth model (Clerk stays; org/manager roles go unused).
- No database schema or data deletion.
