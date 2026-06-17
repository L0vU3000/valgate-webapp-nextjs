# Backend Migration — Execution Plan (frontend side)

> **You are in:** `valgate-webapp-nextjs`, worktree `backend-migration` (off `valgate-webapp-nextjs-v1.0.2`).
> **Goal:** replace the simulated in-memory data layer with the real Neon/Drizzle/Clerk backend, running end-to-end in `DEMO_MODE` (no new accounts).
> **Canonical master plan + the backend-side prep:** `valgate-backend-independent/manila-v1/docs/plans/16-frontend-migration-plan.md`.

This repo is the **host app** (pages, components, routing). The backend is a **library layer** copied in beneath the existing action/query seam. Your React components don't change — the swap is below the action boundary.

## Prerequisite (blocks M5)
The **backend chat** must first finish contract catch-up (M0–M2): align `lib/data/types` to this branch's live contract + add migration `0004` for the new fields (`safety_risk.status`/`resolvedAt`, `property.clientId`). Copy the **aligned** modules, not the frozen B10 snapshot. Mechanical/dep work (M3–M4) can start in parallel; query rewrites (M5) need the aligned services + types.

## Strategy: partial migration
Migrate the **~28 covered domains** to real Neon. Leave **`clients`, `agent-runs`, `dbdiagram-state`** on the simulated layer (do **not** delete their `lib/data/db/*` files or rewrite their queries). They become backend phases B11+.

---

## M3 — Mechanical merge

Source = backend repo root (`valgate-backend-independent/manila-v1`). Copy into this repo at the same paths.

**COPY IN:**
```
lib/services/                 (all, incl _crud.ts _mapping.ts)
lib/db/                       (client, schema/, assert-safe-database-url, column-classifier)
lib/auth/ctx.ts
lib/env.ts  lib/ratelimit.ts  lib/log.ts
lib/data/wizards.ts           (barrel the actions import via @/lib/data/wizards)
lib/data/derivations/         (overwrite — backend's are the service-aligned copies)
lib/data/types/               (the UNION set from backend M0 — overwrites this branch's)
app/actions/*.ts  app/actions/_result.ts
app/api/webhooks/clerk/route.ts
middleware.ts                 (MERGE, see M4 — don't blind-overwrite)
drizzle/  drizzle.config.ts
scripts/{db-ping,seed-neon,schema-assert}.ts   (+ others as useful)
vitest.config.ts              (reconcile with existing)
```

**DELETE (simulated layer):**
```
lib/data/db/*                 EXCEPT clients.ts, agent-runs.ts, dbdiagram-state.ts, _fs.ts, index.ts*
lib/data/auth-shim.ts
lib/actions/*                 (replaced by app/actions/*)
```
\* trim `lib/data/db/index.ts` to re-export only the 3 retained simulated modules.

**KEEP (shared / host):** everything under `app/(shell)`, `app/(pro)`, `components/`, the wizard source files (`lib/data/financials-wizard.ts` etc. — verify `lib/data/wizards.ts` re-exports them or repoint), `lib/format.ts` (FE already has it — keep one), all build tooling (Tailwind v4, ESLint 9).

**Gate:** `npm install` clean.

---

## M4 — Dependency & config reconcile

### Deps — ADD to package.json (backend-only):
```
deps:  drizzle-orm @neondatabase/serverless ws @t3-oss/env-nextjs
       @upstash/ratelimit @upstash/redis
dev:   drizzle-kit @types/ws dotenv
```
Already present in FE (no action): `@aws-sdk/*`, `server-only`, `zod` (v4), `tsx`, `vitest`, `typescript`.

### Version reconcile:
| pkg | FE | backend | take |
|---|---|---|---|
| **next** | 15.5.15 | 16.2.9 | **15** — keep. Do NOT upgrade as part of this. |
| @clerk/nextjs | ^7.2.3 | ^7.5.2 | ^7.5.2 |
| react / react-dom | ^19.2.0 | 19.2.4 | ^19.2.0 (compatible) |
| zod | ^4.3.6 | ^4.4.3 | ^4.4.3 |

### Config:
- **`middleware.ts`** — MERGE: the FE may already have middleware; fold in Clerk's `clerkMiddleware()` + matcher. Don't blind-overwrite.
- **`tsconfig`** — both use `@/` paths; keep FE's (Tailwind/Next plugins). Add `noUncheckedIndexedAccess` only if backend code needs it (it was authored with it).
- **`.env.local`** — add `DATABASE_URL` (+ `_UNPOOLED`) = Neon **dev** branch, `DEMO_MODE=true`. Clerk/S3/Upstash stay placeholder.
- **`next.config.ts`** — keep FE's; no backend-specific needs.
- **scripts** — add `db:migrate`, `db:generate`, `seed`, `db:ping` (the `tsx --conditions=react-server --env-file=.env.local …` form).

**Gate:** `tsc` = 0 except the 19 query files; `npm run build` deferred to M5.

---

## M5 — Read rewrites (the real work: 19 files)

Each `queries.ts` reads via `lib/data/db/*` + `getCurrentUserId()`. Rewrite to backend services + `ctx`.

**Transform pattern:**
```ts
// BEFORE
import * as paymentsDb from "@/lib/data/db/payments";
import { getCurrentUserId } from "@/lib/data/auth-shim";
const userId = getCurrentUserId();
const rows = await paymentsDb.list(userId);

// AFTER
import { listPayments } from "@/lib/services/payments";   // ← check the real exported name
import { requireCtx } from "@/lib/auth/ctx";
const ctx = await requireCtx();
const rows = await listPayments(ctx);
```
- `getCurrentUserId(): string` → `const ctx = await requireCtx()` (async — the function becomes/stays `async`).
- Pass `ctx` as the **first arg** to every service call (services are `(ctx, …)`).
- Reader names are **not** 1:1 with the db names — open the target `lib/services/<domain>.ts` and use its actual `get*/list*` export.

**The 19 files:**
```
app/(shell)/queries.ts
app/(shell)/portfolio/queries.ts
app/(shell)/analytics/queries.ts
app/(shell)/directory/queries.ts        app/(shell)/directory/[id]/queries.ts
app/(shell)/estate-planning/queries.ts
app/(shell)/profile/queries.ts
app/(shell)/rental/queries.ts
app/(shell)/settings/queries.ts
app/(shell)/property/[id]/{overview,financials,location,rental,safety,ownership,valuation,documents}/queries.ts
app/(shell)/dbdiagram/queries.ts        ← KEEP simulated (dbdiagram-state deferred)
app/(pro)/pro/queries.ts                ← partial: clients/agent-runs parts stay simulated
```

**Name mismatch to watch:** FE `db/successor-property-assignments` → backend service **`estate-assignments`**.

**Deferred domains — leave on the simulated layer:** any `queries.ts` line reading `clients`, `agent-runs`, or `dbdiagram-state` keeps its `lib/data/db/*` import + `getCurrentUserId()`. The pro page (`app/(pro)/pro/queries.ts`) is mixed — migrate the property/portfolio reads, keep the client reads simulated.

**Per-file loop:** rewrite → `tsc` that file → spot-check against seeded dev org. Don't batch-rewrite all 19 blind.

**Gate:** `tsc` = 0; `npm run build` clean.

---

## M6 — Run + verify
```
# .env.local: DATABASE_URL=<neon dev pooled>, DEMO_MODE=true
npm run db:migrate     # applies 0000–0004
npm run seed           # demo org ORG-0001 + fixtures
npm run dev
```
- Click every shell page + property tabs — data loads from real Neon.
- **Write spot-checks:** create a property, resolve a safety risk (M1 field), edit a tenant — confirm they persist (re-load, check Neon).
- `clients`/`agent-runs` pages still work (simulated) — confirm no dead-service errors.

**Gate:** app runs end-to-end on real Neon in DEMO_MODE.

---

## After this (separate, infra-gated)
`valgate-backend-independent/docs/working/go-live-checklist.md`: Clerk Orgs (→ flip `DEMO_MODE=false`) → Neon RLS → S3 → Upstash → deploy. None blocks M0–M6.
