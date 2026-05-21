# 06 — Simulated Backend Plan

> Plan to wire the Next.js frontend to a local JSON file system that simulates a backend. Replaces `lib/mock-data.ts` and the hardcoded `TODO(backend):` values flagged in `01-read-map.md`. Source of truth for entity shapes: `00-entity-catalog.md`.

---

## Goal

Replace in-memory mocks with a file-based backend that:

1. Reads JSON from `public/data/` via **server-side code only**
2. Writes via Next.js API routes (forms create/edit real records on disk)
3. Computes totals / KPIs / pipeline counts from underlying data — no hardcoded values
4. Renders correctly when empty (every page handles "0 records" gracefully)

The simulated backend is the active backend. Convex is no longer the committed destination.

---

## Folder structure

```
public/data/                             # committed to git
  users/
    demo-user/                           # path-encoded ownership; one swap point when auth lands
      properties/
        PROP-0001/
          core.json                      # id, userId, name, code, type, status, lat, lng
          location.json                  # address, city, province, country, etc.
          finance.json                   # purchase, mortgage, tax, insurance
          media.json                     # photo + document references
      documents/
        DOC-0001/
          core.json
      folders/
        FLDR-0001/
          core.json
      tenants/
        TEN-0001/
          core.json
      leases/
        LEASE-0001/
          core.json
      payments/
        PMT-0001/
          core.json
      maintenance-items/
        MAINT-0001/
          core.json
      notifications/
        NOTIF-0001/
          core.json
      notification-preferences/
        NPREF-0001/
          core.json
      user-profiles/
        USR-0001/
          core.json
      drafts/
        DRAFT-0001/
          core.json
      professionals/
        PROF-0001/
          core.json
      successors/
        SUCC-0001/
          core.json
      property-valuations/
        VAL-0001/
          core.json
      inspections/
        INSP-0001/
          core.json
      certifications/
        CERT-0001/
          core.json
      safety-risks/
        RISK-0001/
          core.json
      emergency-contacts/
        EC-0001/
          core.json
      ownership-records/
        OWN-0001/
          core.json
      ownership-history/
        OWNH-0001/
          core.json
```

---

## Naming convention

Two rules carry the scheme:

1. **Every record is a folder.** Even if it only contains `core.json`. Consistent shape means one loader pattern; splits added later without restructuring.
2. **`core.json` is always present.** Split files are *additional* concern files alongside it, never replacements.

| Layer | Rule | Example |
|---|---|---|
| User namespace | `users/{userId}/` | `users/demo-user/` |
| Entity collection | plural, lowercase, kebab-case | `properties/`, `notification-preferences/`, `safety-risks/` |
| Record folder | `{PREFIX}-{4-digit-zero-padded}` | `PROP-0001`, `DOC-0042` |
| Canonical file | `core.json` | identifying + canonical fields |
| Split files | single lowercase word, concern-based | `location.json`, `finance.json`, `media.json` |
| Foreign key fields | `{singularEntity}Id` matching folder id | `propertyId: "PROP-0001"` |

### ID prefixes

| Entity | Prefix | Entity | Prefix |
|---|---|---|---|
| Property | `PROP-####` | Successor | `SUCC-####` |
| Document | `DOC-####` | Professional | `PROF-####` |
| Folder | `FLDR-####` | Valuation | `VAL-####` |
| Tenant | `TEN-####` | Inspection | `INSP-####` |
| Lease | `LEASE-####` | Certification | `CERT-####` |
| Payment | `PMT-####` | Safety risk | `RISK-####` |
| Maintenance item | `MAINT-####` | Emergency contact | `EC-####` |
| Notification | `NOTIF-####` | Ownership record | `OWN-####` |
| Notif. preference | `NPREF-####` | Ownership history | `OWNH-####` |
| User profile | `USR-####` | Draft | `DRAFT-####` |

### When to split a record

Split only when **both** are true:

- Record has >~20 fields, AND
- Fields cluster naturally by domain concern (not arbitrarily)

Today: only **Property** meets the bar (~47 fields). Every other entity is a single `core.json`. Apply the same rule to other entities later if/when they grow.

---

## Loader API

`lib/data/db/{entity}.ts` — one file per entity. Each exports:

```ts
list(userId: string): Entity[]
get(userId: string, id: string): Entity | null
create(userId: string, data: NewEntity): Entity
update(userId: string, id: string, patch: Partial<Entity>): Entity
remove(userId: string, id: string): void
```

The loader is the **only** code that knows about the split-file partition. `db.properties.get()` returns one assembled `Property` object (core + location + finance + media merged). Consumers above this layer never see the split.

`lib/data/db/_fs.ts` — shared file-IO helpers (read all `*.json` in a folder, merge, write).

Routes' existing `queries.ts` files keep their public shape; they swap `lib/mock-data.ts` reads for loader calls.

---

## Derivations

`lib/data/derivations/{domain}.ts` — pure functions over loaded entity arrays. These replace the four `TODO(backend)` hardcoded values in `app/(shell)/portfolio/queries.ts:50-53` and similar hardcoded counts called out in `01-read-map.md`.

```ts
// portfolio.ts
computeStats(properties: Property[]): PortfolioStats
computeKpis(properties: Property[], payments: Payment[]): PortfolioKpis

// rental.ts
computePipeline(leases: Lease[]): PipelineStages
computeArrears(payments: Payment[]): ArrearsBuckets
computeUpcomingEvents(leases, maintenance, payments): RentalEvent[]

// property.ts
computeEquity(property: Property): { equityPercent, remainingMortgage }
```

All derivations return zero/empty shapes when input is empty.

---

## Write paths

API routes under `app/api/{entity}/`:

- `POST   /api/{entity}` — create (validates with Zod per CLAUDE.md)
- `GET    /api/{entity}` — list
- `PATCH  /api/{entity}/[id]` — update
- `DELETE /api/{entity}/[id]` — remove

Each route:
1. Reads `userId` via `getCurrentUserId()` (auth shim)
2. Validates body with Zod
3. Calls the loader (`db.properties.create(userId, data)`)
4. Calls `revalidateTag()` so Server Components re-fetch (per CLAUDE.md data flow)
5. Returns the new entity (or generic error string — never `err.message` per CLAUDE.md security rules)

---

## Auth shim

`lib/data/auth-shim.ts`:

```ts
export const DEMO_USER_ID = "demo-user";
export function getCurrentUserId(): string {
  return DEMO_USER_ID;
}
```

When real Clerk auth lands:
1. Replace body with `auth().userId`
2. Move `public/data/` → outside `public/` (e.g. `data/`, gitignored) so files stop being publicly served
3. Add ownership guards to API routes

---

## Phasing

| Phase | Goal | Verify |
|---|---|---|
| 1 | Loader + derivations + empty-state UI for every page | All routes load without error against empty `public/data/users/demo-user/`. No mock values rendered anywhere. KPI tiles show "0" / "—". |
| 2 | Add-property wizard wires to `POST /api/properties` | Submit creates `public/data/users/demo-user/properties/PROP-####/{core,location,finance,media}.json`. Property appears on `/portfolio` and `/property/[id]/*`. KPIs computed from it. |
| 3 | Document, Tenant, Lease, Payment write paths | Each has a UI form → API route → JSON → render path. `/property/[id]/documents` upload flow works end-to-end. |
| 4 | (Optional) `pnpm seed` script | Copies a fixture set sourced from `lib/mock-data.ts` into `public/data/users/demo-user/` for dev/demo without 30 minutes of clicking. |

Phase 1 is the foundation. Phases 2–4 layer on independently.

---

## Decisions locked

| # | Decision | Answer |
|---|---|---|
| 1 | Read-only vs writable | Writable (via API routes) |
| 2 | Destination after this | Undecided. Simulated backend is the active backend. |
| 3 | Folder location | `public/data/`, committed to git |
| 4 | Loader location | `lib/data/db/`, replaces `lib/mock-data.ts` reads |
| 5 | Done criterion | Empty start; populated through the system |
| 6 | Splitting policy | Folder-per-record always; split files added per concern when entity grows |
| 7 | User namespacing | `users/{userId}/` from day one (single demo user today) |
| 8 | Auth | None yet. `DEMO_USER_ID = "demo-user"` shim. |

---

## Future migrations (deferred, do not start)

**Auth migration**: when Clerk wires in, move `public/data/` → `data/` (or DB), implement `auth().userId`, add ownership guards. Until then, the path namespace is structural-only — does not enforce security.

**Schema gaps from `Valgate Client Profile Template(2).xlsx`** (cross-checked against `00-entity-catalog.md`):

- `GOV REQUEST` — title verification workflow (Sent / Received / Added). New entity. Not in current UI.
- `SECURITY INCIDENTS` — separate from SafetyRisk. New entity or fold-in.
- `TAX & FINANCIAL` — xlsx models tax as a yearly history table; audit currently treats as flat fields on Property.
- `MULTIMEDIA MAPPING` — equipment, GPS coords, resolution, file format. Possibly a separate `media` entity vs current generic `Document`.
- `PLATFORM STATUS` — operational/admin tracking. Probably never UI-facing.
- Tenant — xlsx has 20+ fields; current `Tenant` has 5.

These are scope expansion decisions, not Phase 1–4 work. Add to `05-open-questions.md` when prioritized.

**Real file uploads**: photo and document binaries are stubbed as URL strings today. Real upload paths (UploadThing, S3, etc.) come later.
