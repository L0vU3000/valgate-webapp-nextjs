# Valgate Independent Backend — Master Implementation Plan (NeonDB)

> **Status:** READY TO EXECUTE — `/plan-eng-review` verdict SHIP-WITH-FIXES (report at bottom); all HIGH/MED fixes incorporated into this body 2026-06-11
> **Date:** 2026-06-11 · **Branch:** `L0vU3000/valgate-backend` · **Author:** Claude (Fable 5) via gstack `/spec` + `/karpathy-guidelines`
> **Companion files:** `task_plan.md` (phase tracker), `findings.md` (F1–F9), `00-exploration-findings.md` (long-form research), `WHATS-WHAT.md` (decision log + reading list)
>
> This document merges what was originally planned as four docs (01-tech-stack, 02-data-model, 03-service-layer, 04-implementation-plan) into one master plan, per user request: "make a detailed plan to use later — work out everything."

---

## 1. Context — why this matters

Valgate's frontend is fully built and renders from a **file-system demo layer** (`public/data/users/demo-user/` JSON files read through `lib/data/db/`). That layer is single-user, fake-authenticated, and demo-only. Nothing a real user enters survives a deploy, no two users can exist, and the product's core concept — **verification-gated feature unlock** — has no data model at all.

This plan builds the real backend **independently** on **NeonDB (serverless Postgres)**, treating the frontend and its reference corpus as a *specification*, and wiring the frontend over to it **last**. When complete: real users (Clerk), real persistence (Neon), real ownership checks, and a working verification system — the thing that makes Valgate "Valgate."

### The Five Answers (spec gate)

1. **Who is affected?** Solo dev (you) today; every future Valgate user the moment the product has real accounts. Lenders/lawyers/successors downstream — they only trust verified records.
2. **Current behavior (verified):** All 16 routes read via Server Components → `queries.ts` → FS JSON. `getCurrentUserId()` returns the literal `"demo-user"` in 63+ call sites. Zero Convex usage at runtime (0 `ConvexProvider` imports). No `DATABASE_URL`, no ORM installed.
3. **Desired behavior:** Same 16 routes render identically from Neon Postgres; writes persist; auth is real; verification state is first-class.
4. **Why now?** The frontend is done enough that backend absence is the blocker for every next milestone (real users, the Professional product, "Valgate Verified").
5. **Done means (observable):** The parity checklist in §10 passes — every route renders from `DATA_BACKEND=neon` with output equal to the FS baseline, all 21 action files round-trip against Neon, an IDOR probe fails correctly, and the verification state machine passes its transition tests.

---

## 2. Decisions locked (D1–D12)

These were the open Phase-2 questions in `task_plan.md`. Resolved here with rationale. Each was the standing recommendation from `00-exploration-findings.md`; "work out everything" = adopt them and get precise.

| # | Decision | What we chose | Why (and what we rejected) |
|---|---|---|---|
| **D1** | ORM | **Drizzle ORM** + `@neondatabase/serverless` driver + **Drizzle Kit** for migrations. **Driver mode: WebSocket `Pool` (`drizzle-orm/neon-serverless`), NOT the `neon-http` driver** | Type-safe from a schema you can read like SQL, no codegen step, first-class Neon serverless support. The http driver throws on `db.transaction()` — and this plan needs transactions (D8 counters, B2 seed, B6 atomic verification writes). Rejected: Prisma (heavier, codegen "magic" — worse for a backend beginner), Kysely (fine but less batteries-included for migrations), raw SQL (hand-maintained types). |
| **D2** | Schema shape | **Flat-first from `schema.sql`** (26 tables, 19 enums), with **tightening** (D5) applied. Normalization deferred except where the product demands it (ownership is already semi-normalized: `co_owners`, `ownership_records` are separate tables) | `schema.sql` is a ready-made Postgres translation of exactly what the FE renders. The fully-normalized `convex/` model is design input only. Rejected: full normalization now (more joins, an adapter layer, and slower path to working for no v1 gain). |
| **D3** | Logic layer | **Next.js Server Actions + `lib/services/` layer.** Routes keep calling the same `queries.ts` functions | Mirrors the existing seam exactly — the swap is invisible to pages. Matches `CLAUDE.md` rules already in the repo. |
| **D4** | Frontend contract | **Services return the existing Zod types from `lib/data/types/` unchanged.** All DB↔FE shape conversion happens inside the service layer | This is the single most important architectural rule in this plan. It means zero frontend changes during the swap, and the FS layer remains a comparable baseline. The DB schema gets *tighter* types; the service layer converts. |
| **D5** | Type tightening (Q5.B) | Apply at the DB boundary: numerics → `integer`/`numeric`, dates → `timestamptz`, `Document.category` → 7-value enum (incl. "Estate"), add `payments.due_date`, add `notifications.property_id` | These are the already-resolved Q-gate items (see §4). Migrating once (into Postgres) beats migrating twice. |
| **D6** | Money | DB: `numeric(14,2)`. Service layer converts to plain `number` (dollars) for the FE | `numeric` is exact (no float rounding on money). Rejected: integer cents (correct but forces conversion everywhere and diverges further from FE shapes — more risk for v1), `double precision` (rounding bugs on money). |
| **D7** | Timestamps | DB: `timestamptz`. Service layer converts to **ms-epoch numbers** (what the FE already uses) | Readable in any SQL tool, correct timezone semantics. The conversion is one `.getTime()` per field in the service mapper. |
| **D8** | IDs | Keep existing **TEXT primary keys** with prefix scheme (`PROP-0042`, etc.). ID generation: `id_counters` table bumped with a **single atomic `UPDATE id_counters SET next = next + 1 WHERE collection = $1 RETURNING next`** — one statement, race-free without an explicit transaction | Preserves all seed data, all FE links, all route params. The single-statement form is simpler and safer than a read-then-write transaction. Rejected: UUIDs (breaks every existing reference and URL for zero v1 benefit). |
| **D9** | Auth | **Clerk** (already in `package.json`). `lib/data/auth-shim.ts` keeps its signature; internals swap to Clerk's `auth()`, with `DEMO_MODE=true` env fallback returning `"demo-user"`. **Demo mode is READ-ONLY** (mutating services throw under it) **and the flag is refused when `NODE_ENV=production`** | The shim is the single point of replacement (63+ call sites never change). Demo mode keeps the seed portfolio usable for demos — but a standing auth bypass with write access through 21 action files would be a security hole, so it can only read, and only outside production. |
| **D10** | Tenancy | **Single-tenant v1, org-ready.** Every table keeps `user_id TEXT` (Clerk subject). No `orgs`/`org_members` tables until the Professional product is scheduled | The Pro product is real but not v1. Nothing in this schema blocks adding `org_id` columns later. Building multi-tenancy now is speculative complexity (karpathy rule 2). |
| **D11** | Verification model | **Designed fresh** (§6): `pillar_verifications` + `verification_evidence` + `verification_events`, with "Valgate Verified" **derived, never stored** | No reference exists anywhere (the #1 gap, F4). Derivation-first matches the presentation's stated architecture. |
| **D12** | `convex/` folder | Legacy reference. Do not build on it, do not delete it in this effort (deletion is a separate explicit user decision) | Its normalized model stays useful as design input; its code can't run on Neon. |

**Genuinely still open (not blockers, decide at the marked phase):**
- Rate-limiting tool (`CLAUDE.md` says "decide later") → decide at **B9**; lean Upstash Ratelimit (serverless-friendly), alternative: a small Postgres-based limiter table.
- Payments → out of scope entirely.
- Document storage provider (S3 vs R2) → decide at **B7**; AWS SDK deps already in `package.json`, so S3-compatible either way.

---

## 3. Current state (verified 2026-06-11)

### The seam we swap behind

```
Server Component (page.tsx)
        ↓ calls
app/(shell)/<route>/queries.ts        ← 16 routes, signatures stay IDENTICAL
        ↓ calls
lib/data/db/<entity>.ts  (25 entities) ← THIS layer gets a Neon twin
        ↓ reads
public/data/users/demo-user/**.json    ← FS layer = behavioural baseline

Writes: Client form → lib/actions/<domain>.actions.ts (21 files, Zod validated)
        → lib/data/db writes → revalidateTag(...)
```

### Inventory (the constraint envelope)

| Asset | Count | Where |
|---|---|---|
| Routes reading through the seam | 16 (18 queries.ts files incl. nested) | `app/(shell)/**/queries.ts` |
| Entities (flat, Zod-typed, seeded) | 25 | `lib/data/db/`, `lib/data/types/`, `public/data/users/demo-user/` |
| Postgres tables ready in DDL | 26 | `.claude/data-audit/schema/schema.sql` |
| Enum types in DDL | 19 | same file |
| Derivation functions (read shapes) | ~23 across 12 files | `lib/data/derivations/` |
| Server-action files (write paths) | 21 | `lib/actions/` |
| Fake-auth call sites | 63+ | every queries.ts + every actions file via `lib/data/auth-shim.ts` |
| Verification-shaped actions already stubbed in FE | `verifyFinancials`, `revokeFinancialsVerification`, `verifyOwnership`, `revokeOwnershipVerification` | `lib/actions/properties.actions.ts`, `lib/actions/ownership-records.actions.ts` |

### Extra FS modules NOT in schema.sql (decide late, B10)

`ai-sessions.ts`, `ai-messages.ts`, `dbdiagram-state.ts` — used by the AI overlay and the dbdiagram dev page. They stay on the FS layer until B10 (optional phase). They are not on any verification or money path.

---

## 4. The 8 Q-blockers — current resolutions (carried into the schema)

Resolved at the Phase 10 Q-gate (2026-05-14), recorded in `ref/05-open-questions.md`. The schema below bakes them in:

| Q | Resolution | Schema consequence |
|---|---|---|
| Q3.A total value | Sum of `buyNumeric` (purchase price) | none (derivation only) |
| Q3.C YoY growth | Badge removed | none |
| Q3.E arrears base | Age from due date | **add `payments.due_date timestamptz NULL`** (defaults to `date` when absent) |
| Q3.H occupancy | `rented / total × 100` | none |
| Q3.I attention count | Overdue rent OR emergency maintenance | none (derivation only) |
| Q5.B permissive types | Tighten now | numerics become `integer`/`numeric`, dates `timestamptz` (D5/D6/D7) |
| Q5.R document category | Closed 7-value enum | **`document_category` enum: Title, Sales, Tax, Rental, Photos, Insurance, Estate** |
| Q4.A drafts | Stay in localStorage for v1 | none (revisit post-cutover) |

Plus one carried fix from `ref/08`: **add `notifications.property_id` FK** (kills the URL-parsing workaround).

---

## 5. Target architecture

```
                    ┌──────────────────────────────────────────┐
                    │  Next.js 15 (existing app, unchanged UI) │
                    └──────────────────────────────────────────┘
   READS                                                WRITES
app/(shell)/*/queries.ts  (signatures unchanged)   lib/actions/*.actions.ts (21 files)
        │                                                │  Zod validate → auth → ownership
        ▼                                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ lib/services/<entity>.ts  — NEW service layer                   │
│  • same list/get/create/update/delete interface as lib/data/db  │
│  • returns EXISTING Zod types from lib/data/types (D4)          │
│  • converts: timestamptz→ms-epoch, numeric→number (D6/D7)       │
│  • every function takes userId; every query filters by it       │
└─────────────────────────────────────────────────────────────────┘
        │                          ▲
        ▼                          │ lib/data/backend-switch.ts
┌─────────────────────────┐   DATA_BACKEND=fs|neon (per-env flag)
│ lib/db/  — Drizzle      │        │
│  schema.ts (29 tables)  │   lib/data/db/* (FS layer — kept intact
│  client.ts (Neon driver)│   as baseline until B9 burn-in ends)
│  drizzle/ (migrations)  │
└─────────────────────────┘
        │
        ▼
   NeonDB (Postgres)  — branch-per-phase for rollback (§12)
   S3/R2 (B7)         — document blobs via presigned upload
   Clerk (B5)         — identity; auth-shim swaps internals
```

**New directories this plan creates:**

| Path | Purpose |
|---|---|
| `lib/db/schema.ts` (+ split files per domain) | Drizzle table + enum definitions |
| `lib/db/client.ts` | Neon connection (server-only) |
| `drizzle/` + `drizzle.config.ts` | generated SQL migrations |
| `lib/services/<entity>.ts` | Neon-backed twin of each `lib/data/db/<entity>.ts` |
| `lib/data/backend-switch.ts` | one flag, re-exports fs or neon implementation |
| `scripts/seed-neon.ts` | seed pipeline from `public/data/` |
| `scripts/parity-check.ts` | FS vs Neon output comparison (the verifier) |

---

## 6. Verification model — the fresh design (D11)

The product rule (F4): *"Features unlock from verification, not data entry."* No artifact models this; we design it once, here.

### 6.1 Tables (Drizzle-flavored shapes, exact)

```ts
// lib/db/schema/verification.ts

export const pillarEnum = pgEnum("pillar", [
  "location", "financials", "rental", "ownership",
  "valuation", "safety", "estate", "documents",
]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "unverified",      // default state — nothing submitted
  "pending_review",  // user submitted evidence, awaiting decision
  "verified",        // approved
  "rejected",        // reviewed and declined (user may resubmit)
  "revoked",         // was verified, later withdrawn (doc expired, dispute)
]);

export const pillarVerifications = pgTable("pillar_verifications", {
  id: text("id").primaryKey(),                    // VRF-0001 (D8 scheme)
  userId: text("user_id").notNull(),
  propertyId: text("property_id").notNull().references(() => properties.id),
  pillar: pillarEnum("pillar").notNull(),
  status: verificationStatusEnum("status").notNull().default("unverified"),
  method: text("method"),                          // "document_upload" | "kyc" | "manual_review" — open for v1
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  decidedBy: text("decided_by"),                   // userId of reviewer; v1 = self/admin
  expiresAt: timestamp("expires_at", { withTimezone: true }), // certs can lapse
  notes: text("notes"),
}, (t) => [
  uniqueIndex("uq_property_pillar").on(t.propertyId, t.pillar), // ONE row per pillar per property
  index("ix_pv_user").on(t.userId),
]);

export const verificationEvidence = pgTable("verification_evidence", {
  id: text("id").primaryKey(),                    // VEV-0001
  verificationId: text("verification_id").notNull().references(() => pillarVerifications.id),
  documentId: text("document_id").notNull().references(() => documents.id),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verificationEvents = pgTable("verification_events", {
  id: text("id").primaryKey(),                    // VHE-0001 — append-only audit trail
  verificationId: text("verification_id").notNull().references(() => pillarVerifications.id),
  event: text("event").notNull(),                  // submitted|approved|rejected|revoked|expired|resubmitted
  actorId: text("actor_id").notNull(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  note: text("note"),
});
```

### 6.2 State machine (enforced in `lib/services/verification.ts`, unit-tested)

```
unverified ──submit──▶ pending_review ──approve──▶ verified
    ▲                       │                         │
    │                    reject                    revoke / expire
    │                       ▼                         ▼
    └────resubmit──── rejected                    revoked ──resubmit──▶ pending_review
```

Illegal transitions (e.g. `unverified → verified` without a submit, `rejected → revoked`) throw. Every transition writes a `verification_events` row in the same transaction.

### 6.3 "Valgate Verified" is DERIVED — never a column

```ts
// lib/data/derivations/valgate-verified.ts
// Required set per feature-requirements.md §"What Valgate Verified means":
//   always:           location, financials, ownership
//   if rental use:    rental, safety
//   never required:   valuation, estate, documents (quality signals only)
export function computeValgateVerified(
  property: Property,
  verifications: PillarVerification[],
): { verified: boolean; missing: Pillar[]; signals: Pillar[] }
```

This follows the repo's derivation-first commitment and means no stored flag can drift from the evidence.

### 6.4 Wiring to what already exists — and the legacy-field projection (review HIGH-2)

The FE Zod types already declare per-record verification fields (`properties.*Verified` flags, `ownership_records.verified`, `documents.verifies`), and the 4 existing verify/revoke actions write them. `schema.sql` does NOT contain these columns. Under D4 the FE contract is untouchable, so:

- **B1 adds the legacy verification columns to the schema exactly as the FE types declare them.** They are ordinary columns at first — this lets B4 port the 4 verify actions as plain column writes with no dependency on B6 (no broken window between phases).
- **In B6, the verification service becomes the writer of record:** submit/approve/revoke updates `pillar_verifications` + events AND the legacy projection columns **in the same transaction**. The legacy columns are from then on a *maintained projection* (denormalized read model), never written directly by anything else.
- **The "derived, never stored" rule (D11) applies to the property-level "Valgate Verified" badge** — that is always computed by `computeValgateVerified` from `pillar_verifications`. The per-record legacy fields are projections kept only because the FE reads them today; collapsing them is a post-v1 FE cleanup, out of scope here.
- `verifyFinancials(propertyId, docIds)` / `verifyOwnership(...)` become `submitVerification(propertyId, "financials", docIds)` + (v1) auto-approve, since there is no human review queue yet. The state machine still runs; v1 simply has `decidedBy = userId` (self-attested). When real review arrives, only the approve step changes.
- The Progress pillars stat (`computeProgressDetails`, weighted score already specced) starts reading verification status as an input in B6 — *completeness* (data present) and *verifiedness* (pillar verified) become separately visible.

---

## 7. Data model — the other 26 tables

**Source of truth to copy from:** `.claude/data-audit/schema/schema.sql` (26 tables, 19 enums — already matches the FE 1:1). Port table-by-table into Drizzle with only these deltas:

| Delta | Tables affected | Detail |
|---|---|---|
| Tighten numerics (Q5.B) | `properties` (yearBuilt, bedrooms, bathrooms, parkingSpaces, totalArea→total_area_m2, all money fields), `leases`, `payments`, `expenses`, etc. | strings → `integer` / `numeric(14,2)` |
| Dates → `timestamptz` (D7) | `inspections.date`, `certifications.issued/expires`, `ownership_documents.date`, `ownership_history.date`, all `createdAt/updatedAt` | service layer emits ms-epoch |
| `payments.due_date` (Q3.E) | `payments` | nullable, defaults to `date` in the arrears derivation |
| `document_category` enum (Q5.R) | `documents` | 7 values incl. "Estate" |
| `notifications.property_id` | `notifications` | nullable FK |
| Drop presentational/dead fields | `ownership_history.color`, `properties.health` (superseded by Progress derivation), `safety_risks.resolved` | per `ref/08` §2 notes |
| Legacy verification projection columns (§6.4) | `properties` (`*Verified` flags), `ownership_records.verified`, `documents.verifies` | match the FE Zod types field-for-field; plain columns in B1, maintained projections from B6 on |
| Indexes | every child table | `(user_id)`, `(property_id)`, plus `(lease_id)`, `(tenant_id)` on payments; `(parent_folder_id)` on folders |
| `id_counters` table (D8) | new | `collection TEXT PK, next INT` — atomic `UPDATE … RETURNING` `nextId()` |

Full column-level field reference when porting: `ref/07-entity-fields.md` (do not re-derive from the UI — the tables there are the audit-grade truth).

---

## 8. Service layer contract

One file per entity in `lib/services/`, long-form and explicit (user preference). Every file follows the same template:

```ts
// lib/services/tenants.ts  (TEMPLATE — same shape for all 25 entities)
import "server-only";
import { db } from "@/lib/db/client";
import { tenants } from "@/lib/db/schema";
import { TenantSchema, type Tenant } from "@/lib/data/types/tenant"; // EXISTING type (D4)

// Convert one DB row into the exact shape the frontend already consumes.
// NOTE (review MED-5): Postgres returns NULL for empty columns, but the FE Zod
// types use .optional() (= undefined). A shared stripNulls() helper in
// lib/services/_mapping.ts converts every null to undefined BEFORE parsing —
// without it all 25 mappers fail Zod and the parity comparator reports false
// diffs. parity-check.ts normalizes null/undefined the same way.
function rowToTenant(row: typeof tenants.$inferSelect): Tenant {
  return TenantSchema.parse(stripNulls({
    ...row,
    createdAt: row.createdAt.getTime(),   // timestamptz → ms epoch (D7)
    rent: Number(row.rent),               // numeric → number (D6)
  }));
}

export async function listTenants(userId: string): Promise<Tenant[]> { /* select where user_id */ }
export async function getTenant(userId: string, id: string): Promise<Tenant | null> { /* + ownership check */ }
export async function createTenant(userId: string, input: NewTenantInput): Promise<Tenant> { /* zod-validated input, nextId, insert */ }
export async function updateTenant(userId: string, id: string, patch: TenantPatch): Promise<Tenant> { /* ownership check THEN update */ }
export async function deleteTenant(userId: string, id: string): Promise<void> { /* ownership check THEN delete */ }
```

**Non-negotiable rules (from `CLAUDE.md` security section, enforced in review):**
1. Every function takes `userId` explicitly — no ambient auth inside services.
2. Every read filters `where(eq(table.userId, userId))`; every mutation verifies the row belongs to the user **before** touching it (IDOR).
3. Inputs are Zod-validated in the action layer before reaching services; services may re-parse outputs (cheap drift alarm).
4. Errors: log internally, return generic strings to the client. Never `err.message` outbound.
5. The ~23 derivation functions are **not rewritten** — they are pure functions of entity arrays and keep working as-is once services return the same types (D4).

---

## 9. Build phases B0–B10 (PR-sized, each independently verifiable)

> Effort shown both scales per gstack convention: `(human / CC-assisted)`. Every phase ends with: `/review` on the diff, then `/ship`. Phase-specific gstack calls listed inline. Karpathy rule 4: every phase has a binary pass/fail check — no "seems fine."

```
B0 ──▶ B1 ──▶ B2 ──▶ B3 ──▶ B4 ──▶ B5 ──▶ B6 ──▶ B9
                         └────────▶ B7 ──────────┘
                         └────────▶ B8 ──────────┘
B10 (optional, anytime after B4)
```
*B7 (storage) and B8 (derivations/analytics) only need B3/B4; they can run parallel to B5/B6 if desired. B9 needs everything.*

### B0 — Foundations (0.5d / ~1h)
- Create Neon project + a `dev` branch. `npm i drizzle-orm @neondatabase/serverless ws` + `npm i -D drizzle-kit vitest` (no test runner exists in the repo yet — §11 needs one; add a `"test": "vitest run"` script).
- **`@t3-oss/env-nextjs` is in the CLAUDE.md stack table but NOT installed and has no schema file** — install it (`npm i @t3-oss/env-nextjs zod`), create `lib/env.ts` with a server schema, and put `DATABASE_URL` (+ later `DEMO_MODE`) in it. Add `DATABASE_URL` to `.env.local`.
- `lib/db/client.ts` (server-only, **WebSocket `Pool` driver per D1** — `drizzle-orm/neon-serverless`), `drizzle.config.ts`, `npm run db:ping` script that selects `now()`.
- **Accept:** `db:ping` prints server time; `npm test` runs (even with 1 placeholder test); `tsc --noEmit` clean; no client bundle contains the driver (check with `next build`).

### B1 — Schema migration 0001 (1–1.5d / ~3h)
- Port all 26 tables + 19 enums from `schema.sql` → `lib/db/schema/` (one file per domain: property, rental, safety, ownership, estate, documents, people, notifications) with §7 deltas + `id_counters`.
- `drizzle-kit generate` → migration SQL → apply to the Neon dev branch.
- **Accept:** migration applies cleanly twice (idempotency via fresh branch); `drizzle-kit check` no drift; table count = 27 (26 + id_counters); every FK and index from §7 present (verify with information_schema query in a script).
- **gstack:** `/careful` before writing the migration (schema is one-way-ish), `/review` after.

### B2 — Seed pipeline (1d / ~2h)
- `scripts/seed-neon.ts`: walk `public/data/users/demo-user/*/`, Zod-parse each record (catches drift), apply tightening transforms (string→number, string-date→Date, category casing), insert in FK-safe order (properties before children), wrap per-collection in a transaction.
- `--reset` flag mirrors existing `seed:reset` convention.
- **Accept:** row count per table === seed record count (script prints a table and exits non-zero on mismatch); re-running with `--reset` is idempotent; 3 spot-checked entities byte-match after FS→Neon→service-read round trip.

### B3 — Read services + backend switch (2–3d / ~5h)
- All 25 `lib/services/<entity>.ts` read functions per §8 template + `lib/data/backend-switch.ts` honoring `DATA_BACKEND=fs|neon` (default `fs` until B9).
- `scripts/parity-check.ts`: for each entity, run FS list vs Neon list as the demo user, normalize ordering, deep-compare; print per-entity ✅/❌ diff.
- **Accept:** parity script 25/25 ✅; all 16 routes render without error under `DATA_BACKEND=neon` (manual click-through + `/qa http://localhost:3001` for the main routes); derivations (portfolio stats, rental pipeline, analytics) produce identical numbers both backends.
- **gstack:** `/qa-only` on localhost after the flip; `/investigate` on any parity diff.

### B4 — Write services (2–3d / ~5h)
- Port the 21 action files' write paths: each `lib/actions/*.actions.ts` keeps its exported signature and Zod schema, but its db calls go through the switch. Wizard actions (`financials-wizard`, `location-wizard`, `rental-wizard`, `estate-wizard`, `ownership-wizard`) follow.
- `revalidateTag` calls preserved exactly.
- **Accept:** per-entity integration test: create → read → update → delete round-trips on Neon (a single `scripts/crud-smoke.ts` covering all 25); add-property wizard completes end-to-end in the browser writing to Neon; `nextId` produces no duplicate under `Promise.all` of 10 concurrent creates (transaction test).
- **gstack:** `/qa` add-property + key edit flows; `/review` with attention on ownership checks.

### B5 — Real auth via Clerk (1d / ~3h)
- Swap `lib/data/auth-shim.ts` internals: Clerk `auth()` → `userId`; `DEMO_MODE=true` env returns `"demo-user"` (demo portfolio keeps working). Middleware per Clerk docs. Upsert a `users` row + `user_profiles` skeleton on first login.
- **Accept:** two real test users see only their own rows (manual + scripted check); IDOR probe — user B fetching user A's property id via action and via route — returns not-found/denied; demo mode renders the seed portfolio but every mutating action is refused (D9 read-only rule) and the flag is inert under `NODE_ENV=production`; signed-out users redirected.
- **gstack:** **`/cso`** (first security audit — auth boundary is now real), `/qa` signed-in flows.

### B6 — Verification core (2d / ~4h)
- §6 tables (migration 000N), `lib/services/verification.ts` (submit/approve/reject/revoke/expire + transactional event log), `computeValgateVerified` derivation, rewire the 4 existing verify/revoke actions, surface pillar status in the Progress derivation context.
- **Accept:** state-machine unit tests pass (every legal transition, every illegal transition throws); submitting financials verification with 2 docs creates 1 verification + 2 evidence rows + 1 event atomically (failure injection: bad doc id rolls back all); property page shows pillar verification state from real data; `computeValgateVerified` returns correct `missing` set for an investment vs owner-occupied property.

### B7 — Document storage (1d / ~3h) — parallel-safe after B4
- Presigned-POST uploads (deps already present: `@aws-sdk/s3-presigned-post`) to S3-or-R2 (decide here); `documents.storage_id` becomes the object key; a URL-resolver service handles both legacy seed paths (`public/...`) and object keys; size + MIME validation server-side.
- **Accept:** upload → list → open round trip in browser; 11MB file rejected; `.exe` rejected; seed documents still render.

### B8 — Derivations + analytics burn-in (1d / ~2h) — parallel-safe after B3
- No rewrites (D4) — this phase is *verification* of the ~23 compute* functions on Neon data at realistic volume: seed a synthetic 200-property portfolio on a Neon branch; run analytics/portfolio/rental routes.
- **Accept:** cross-card identities hold (NOI = rent − expenses; pipeline counts sum to lease count; arrears buckets sum to overdue total); analytics route < 2s server render on the 200-property branch (measure, don't guess — `/benchmark` if wired).

### B9 — Cutover + hardening (1d / ~3h)
- Default `DATA_BACKEND=neon`. Rate limiting on auth-sensitive actions (decide tool now — lean Upstash). Error-handling pass over all 21 action files (no `err.message` outbound — grep-audit). `loading.tsx` check on data-heavy routes (repo rule).
- FS layer stays in the tree, flag-switchable, for one burn-in week. Its removal (and `convex/` deletion) are separate explicit decisions afterwards.
- **Accept:** full `/qa` pass on staging URL; **`/cso`** second audit clean on its blockers; parity script still 25/25; rollback drill executed once (flip flag back to `fs`, site renders).

### B10 — AI tables (optional, 0.5d / ~1h)
- `ai_sessions`, `ai_messages` tables + services if/when the AI overlay should persist across devices. `dbdiagram-state` stays FS (dev tool).

**Total: ~12–15 working days human / roughly 3–5 focused CC days.** Matches the ref/08 estimate (8–10d) plus auth, verification, and storage phases it didn't cover.

---

## 10. Acceptance criteria (plan-level Definition of Done)

1. `scripts/parity-check.ts` exits 0 with 25/25 entities equal between FS and Neon for the demo user.
2. All 16 routes render under `DATA_BACKEND=neon` with no console/server errors (route list: `ref/09-page-wiring-status.md`).
3. All 21 action files round-trip CRUD against Neon (crud-smoke script exits 0).
4. IDOR probe fails correctly for cross-user reads AND writes (B5 test kept green thereafter).
5. Verification state machine: 100% of legal transitions succeed, 100% of illegal transitions throw (unit suite).
6. "Valgate Verified" derivation returns correct required-set for both property-use variants.
7. Concurrency: 10 parallel creates produce 10 unique sequential IDs.
8. `tsc --noEmit` and `next build` clean at every phase boundary.
9. Two `/cso` audits (B5, B9) with all HIGH findings resolved.
10. Rollback drill performed and documented once before cutover is called done.

## 11. Testing pyramid

| Layer | What | Where |
|---|---|---|
| Unit | verification state machine; row↔type mappers (ms-epoch, numeric→number); `computeValgateVerified` | per-service test files |
| Integration | crud-smoke per entity; seed idempotency; nextId concurrency; evidence-rollback injection | `scripts/` + test runner |
| Parity | FS vs Neon deep-equality, 25 entities | `scripts/parity-check.ts` |
| E2E / QA | add-property wizard, verify-financials flow, signed-in user isolation, document upload | gstack `/qa` on localhost:3001 / staging |

## 12. Rollback strategy

- **Schema:** every migration applied to a fresh **Neon branch** first; production branch only gets a migration after the phase's accept gate passes. Bad migration = delete branch, nothing touched.
- **Data:** Neon point-in-time restore covers the production branch.
- **App:** `DATA_BACKEND=fs` flag flips any environment back to the FS baseline instantly until the burn-in ends (this is why the FS layer is not deleted in this plan).
- **Code:** every phase is one PR; revert = revert one PR.

## 13. Out of scope (explicit — karpathy rule 2)

- Professional/multi-org product (schema stays org-ready; no org tables).
- Payments, rate-limit final tooling beyond B9's pick, encryption-at-rest/KMS envelope (the `convex/crypto` ambition — revisit when there's real PII beyond ssnMasked), RAG copilot backend, human review queue for verifications (v1 self-attests), drafts persistence (Q4.A), deleting `convex/` or the FS layer.

## 14. Risks (named, with mitigations)

| Risk | Likelihood | Mitigation |
|---|---|---|
| Type tightening breaks FE expectations (string vs number) | High — this WILL bite somewhere | D4 contract + parity script catches it per-entity before any route flips; service mappers are the single fix point |
| Seed data fails tightened validation (dirty strings, casing) | Medium | B2 Zod-parses with transforms and reports per-record failures; fix seed or transform, never loosen the schema silently |
| `nextId` race under serverless concurrency | Medium | transactional counter + the B4 concurrency test |
| Neon cold-start latency on serverless driver | Low-Medium | measure in B8; Neon's pooled connection string; cache headers unchanged |
| Clerk demo-mode leak (demo data visible to real users) | Low | DEMO_MODE only reads the demo user id; B5 isolation test covers it |
| Scope creep into Pro/encryption | Medium (it's tempting) | §13 is the contract; new scope = new plan doc |

## 15. Reference map (where the truth lives)

| Need | File |
|---|---|
| This plan's tracker / session log | `Back end independed implementation/task_plan.md`, `progress.md` |
| Decisions + research detail | `findings.md`, `00-exploration-findings.md`, `WHATS-WHAT.md` |
| Postgres DDL to port | `.claude/data-audit/schema/schema.sql` |
| Column-level field truth | `.claude/data-audit/ref/07-entity-fields.md` |
| Q resolutions | `.claude/data-audit/ref/05-open-questions.md` |
| Per-route wiring status | `.claude/data-audit/ref/09-page-wiring-status.md`, `.claude/data-audit/pages/SUMMARY.md` |
| Wiring conventions to preserve | `.claude/data-audit/WIRING-PLAYBOOK.md` |
| Product verification rules | `docs/feature-requirements.md` |
| Consumer vs Pro boundary | `docs/products.md` |
| Legacy normalized model (input only) | `convex/schema/` |

## 16. gstack workflow appendix (which skill, when)

| Moment | Skill |
|---|---|
| Before starting any phase | re-read this plan + `/plan-eng-review` if the phase deviates |
| Schema/migration edits | `/careful` |
| Phase diff done | `/review`, then `/ship` |
| After B3 flip, after B4 wizard, after B5 auth, before B9 done | `/qa` (real browser) on `localhost:3001` / staging |
| B5 and B9 | `/cso` security audit |
| Any bug found | `/investigate` |
| Context getting long mid-phase | `/context-save`, resume with `/context-restore` |
| After B9 | `/retro` |

---

## GSTACK REVIEW REPORT (/plan-eng-review, 2026-06-11)

### Verdict

**SHIP-WITH-FIXES** — architecture and sequencing are sound; two HIGH gaps (Neon driver/transaction mode, verification-field projection under D4) will strand a beginner mid-build unless specified now.

### Verified claims

- ✅ `lib/data/auth-shim.ts` exists; `getCurrentUserId()` returns literal `"demo-user"` (171 references across lib/ + app/, satisfies "63+")
- ✅ `.claude/data-audit/schema/schema.sql`: exactly 26 `CREATE TABLE`
- ❌ Enum count: 19 `CREATE TYPE ... AS ENUM`, not 20 as stated in §3/§7
- ✅ `lib/actions/`: exactly 21 action files
- ✅ `package.json`: has `@clerk/nextjs`, `@aws-sdk/s3-presigned-post`, `@aws-sdk/client-s3`; no drizzle/prisma/pg/@neondatabase
- ❌ `@t3-oss/env-nextjs` is NOT in package.json and no `createEnv`/env file exists — B0 references a schema that doesn't exist
- ✅ `verifyFinancials` (properties.actions.ts:54) and `verifyOwnership` (ownership-records.actions.ts:41) exist; they write `financialsVerified`/`verified` + `documents.verifies`
- ❌ Route count: 18 `queries.ts` files under `app/(shell)`, plan says 16 (dbdiagram + root/home likely the delta)
- ✅ 25 swap-eligible entities in `lib/data/db/` (30 files − `_fs.ts`, `index.ts` − 3 excluded AI/dbdiagram modules); 12 derivation files
- ✅ Seed data contains NO verification fields (softens B3 parity risk for finding 2)
- ❌ No test runner installed (no vitest/jest/playwright, no `test` script) — §11's unit suite has nowhere to run

### Findings

1. **HIGH — Neon driver mode unspecified; transactions may throw at runtime.** B0 says only "`@neondatabase/serverless` driver." Drizzle's `neon-http` driver does NOT support interactive (multi-statement) transactions — `db.transaction()` throws. Yet the plan depends on transactions in three places: `id_counters` "incremented inside a transaction" (D8), B2 "wrap per-collection in a transaction," and B6 "1 verification + 2 evidence + 1 event atomically." A beginner will build B0–B1 on the HTTP driver and hit a runtime wall in B2. **Fix:** in B0, pin the choice: use the WebSocket `Pool` (`drizzle-orm/neon-serverless`) for all transactional paths, and implement `nextId()` as a single atomic statement (`UPDATE id_counters SET next = next + 1 WHERE collection = $1 RETURNING next`) so it works on either driver. Add one sentence to §5 naming the driver mode.

2. **HIGH — D4 contract vs. verification fields: schema.sql has no home for them, and the projection back is unspecified.** Verified by reading the DDL: `properties` has no `locationVerified/financialsVerified/rentalVerified/estateVerified(+At)` columns, `ownership_records` has no `verified/verifiedAt/evidenceDocIds`, `documents` has no `verifies` — but the FE Zod types declare all of these (property.ts:49–84, ownership-record.ts:40–41) and the two existing verify actions write them. Consequences the plan doesn't address: (a) B4 ports all 21 action files, including the 4 verify/revoke actions, against a schema where their target columns don't exist — broken between B4 and B6; (b) after B6, nothing says how `pillar_verifications` rows project back into the legacy type fields the FE renders. **Fix:** add to B4 "the 4 verify/revoke actions are explicitly deferred to B6 (return not-implemented or keep FS-only)"; add to §6.4 one paragraph: the property/ownership/document service mappers synthesize the legacy fields from `pillar_verifications` + `verification_evidence` (one extra query or join), keeping D4 intact. Seed data has none of these fields, so B3 parity is unaffected — say that too.

3. **MED — B0 references a non-existent env validation layer.** `@t3-oss/env-nextjs` is in CLAUDE.md's stack table but not installed; there is no env schema file. A beginner following B0 step 1 ("add DATABASE_URL to the @t3-oss/env-nextjs server schema") hits a dead end immediately. **Fix:** B0 adds `npm i @t3-oss/env-nextjs`, creates `lib/env.ts` with `DATABASE_URL` server var, and imports it in `lib/db/client.ts` — three lines in the plan.

4. **MED — No test framework exists; §11's unit/integration suites have no runner.** B6's acceptance is "state-machine unit tests pass," but the repo has no vitest/jest and no `test` script. **Fix:** B0 installs vitest (`npm i -D vitest`) + adds `"test": "vitest run"`; name the file convention (`lib/services/__tests__/*.test.ts` or co-located `.test.ts`).

5. **MED — null vs undefined will break every row mapper and the parity check.** Postgres returns `null` for absent values; the FE Zod types use `.optional()` (undefined), so `Schema.parse({ rent: null })` fails even when types otherwise match. §8's template and §14's risk table cover string→number but not this, and it hits all 25 mappers. **Fix:** add a shared `stripNulls(row)` helper to the §8 template (drop or convert null→undefined before parse) and add null/undefined normalization to `parity-check.ts`'s comparator alongside ordering.

6. **MED — DEMO_MODE is a standing auth bypass with write access.** B5's `DEMO_MODE=true` makes every visitor `"demo-user"` with full mutation rights through all 21 actions. The §14 risk entry ("Low") only covers data visibility, not writes, and nothing prevents the flag being set in production. **Fix:** demo mode refuses mutations (actions return a friendly "demo is read-only" error) OR `auth-shim` throws if `DEMO_MODE=true && NODE_ENV=production`. One guard, pick at B5.

7. **LOW — counts drift: 19 enums (not 20), 18 queries.ts files (not 16 routes).** Acceptance gates reference "all 16 routes" and "20 enums"; an implementer can't tell if a miss is a bug or a counting artifact. **Fix:** at B1 start, pin the exact route list (state dbdiagram and root are excluded/included) and re-count enums from the DDL; correct §3.

8. **LOW — crud-smoke says "all 25 entities" but only 21 have action files.** Read-only entities (e.g. `expenses`, `land-parcels`, `ownership-history`, `estate-activity-events`) have no write path. **Fix:** state that crud-smoke calls services directly for entities without actions, or scope it to the 21.

### What's strong

- **D4 is the right load-bearing wall.** Services returning the existing Zod types, with FS kept as a flag-switchable baseline plus a per-entity parity script, makes the entire migration falsifiable — this is the difference between "swap and pray" and a verifiable cutover.
- **Verification model is genuinely well designed:** one row per (property, pillar), append-only event log written in the same transaction, "Valgate Verified" derived not stored — no drift class by construction, and v1 self-attest degrades gracefully into future human review.
- **Phase gates are binary and PR-sized.** Every phase has a pass/fail check (parity 25/25, idempotent migration, concurrency test, rollback drill), and the B7/B8 parallel lanes are correctly scoped to B3/B4 dependencies.
- **Scope discipline holds:** D10 (org-ready, no org tables), D12 (convex untouched), §13's explicit out-of-scope list are exactly karpathy-rule-2 compliant — nothing speculative made it in.
