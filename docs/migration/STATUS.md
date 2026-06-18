# Backend Migration — STATUS & Handoff

> Single entry point for picking this up. Repo: `valgate-webapp-nextjs`, branch `backend-migration`
> (off `valgate-webapp-nextjs-v1.0.2`). Architecture: Option A "mergeable modules" — the backend's
> `lib/` + `app/actions/` were copied in; the simulated data layer was deleted. Runs in DEMO_MODE on Neon.

## Phase status
| Phase | What | State |
|---|---|---|
| M0–M2 | (backend repo) type union, schema catch-up, gap scoping | ✅ done |
| M3 | mechanical copy/delete | ✅ done — `docs/migration/verify-m3.sh` PASS |
| M4 | deps + config reconcile (Next stays 15) | ✅ done — `verify-m4.sh` PASS |
| M5 | read/write rewrites (438 → 0 tsc errors; build clean) | ✅ done — `verify-m5.sh` PASS |
| M6 | browser smoke on real Neon | 🟡 in progress |

The three `verify-m*.sh` scripts are the repeatable machine gates. `M6-CHECKLIST.md` is the human smoke;
`M6-FINDINGS.md` logs the walk-through triage.

## Key facts to remember
- **Next 15** (backend was 16 — never upgrade). `revalidateTag` is single-arg on 15.
- **DEMO_MODE=true** → `requireCtx()` returns a hardcoded demo ctx (`USR-0001`/`ORG-0001`), no Clerk needed. Refused in production.
- **DEMO_ALLOW_WRITES=true** (added) → lets writes through the read-only demo guard locally (default off keeps a hosted demo read-only).
- **Deferred (still simulated, do NOT migrate)**: `clients`, `agent-runs`, `dbdiagram-state` keep `@/lib/data/db/*` + `getCurrentUserId()`. `auth-shim.ts` stays. (Backend for these = B11, later.)
- `(shell)/layout.tsx` is `force-dynamic` (auth+DB pages can't static-prerender).
- DB ops: `db:ping` → `db:migrate` → `seed:neon` (needs real `DATABASE_URL` + fixtures in `tests/fixtures/`).
- M6 fix applied: `getMyUserProfile(ctx)` (profile is keyed by `userId`, not the UPROF `id`) — `/profile` + `/settings`.

## ▶ NEXT — do this FIRST (feature: add-property photos/docs → S3)
The add-property wizard collects photos/docs in `Step4PhotosDocs.tsx` but **never uploads them**:
`_lib/use-drafts.ts#stripFileBlobs()` strips file blobs before persisting the draft, and the submit path
(`add-property/actions.ts` + `AddPropertyFlow.tsx`) never calls the S3 upload. The real S3 path
(`uploadDocument` / `uploadMultipleDocuments` in `app/(shell)/property/[id]/documents/actions.ts`) is only
wired to the Documents tab + pillar `VerificationStep.tsx`.
**Task:** after the property is created (we have `propertyId`), take the Step4 staged `File`s from the live
form state, build a `FormData` (`files`), and call `uploadMultipleDocuments(propertyId, fd)`. Surface
per-file success/failure. Files only exist in client memory (drafts stripped them), so this runs client-side
right after the create action returns. Requires S3 env (`STORAGE_*`) to actually land objects
(key shape: `ORG-0001/DOC-xxxx/<name>`, nested under the `ORG-0001/` prefix).

## Then — deployment provisioning (manual; authoritative list: backend repo `docs/working/go-live-checklist.md`)
| # | Service | Why | State |
|---|---|---|---|
| 1 | **Clerk** (auth) | required to leave demo; flip `DEMO_MODE=false` | 🟡 in progress — Organizations = "Membership required"; webhook deferrable (JIT bootstrap in `ctx.ts` covers first sign-in) |
| 2 | **AWS S3** (`STORAGE_*`) | document/photo uploads | 🟡 in progress — bucket + IAM user + CORS + keys; test via Documents tab, not add-property |
| 3 | **Neon prod branch** | required to deploy | ✅ done — `production` branch (`ep-aged-cloud-aohhlwhs`) migrated (all 5) + `db:assert` PASS (34 tables); verified empty (no seed). Dev stays `ep-tiny-rice`. |
| 4 | **Upstash Redis** (`UPSTASH_*`) | real rate limiting on serverless | 🟡 user provisioning manually. Code ready (`lib/ratelimit.ts` auto-upgrades when creds set, no code change). Use **REST** URL/token (not `redis://`); region near Neon `ap-southeast-1`. 2 vars → Vercel at deploy (item 6); not needed locally (in-memory fallback covers dev). |
| 5 | **Neon RLS** (`DATABASE_AUTHENTICATED_URL`) | defense-in-depth (service layer already scopes by org) | ☐ deferred by design → **plan written: `docs/migration/RLS-PLAN.md`** (7 phases). Blocked on item 1 (needs real Clerk JWT to test; un-testable in DEMO_MODE). Run after Clerk live + first deploy. |
| 6 | **Deploy** (Vercel) | go live | ☐ set all env vars in host, deploy to staging, smoke-test. ⚠️ **Rotate the Neon prod password first** — the string used for the item-3 migration was pasted in chat (exposed); regenerate it in Neon and put the *fresh* one in Vercel's `DATABASE_URL`. |

## Loose ends (non-blocking)
- AI-overlay chain migrated mechanically; deep behavioral QA pending.
- `formatCurrency` display: dashboards may show compact `$1.28M`; whole-dollar = repoint ~3 derivation calls to `formatCurrencyFull` (D3).
- Pre-existing UX (not migration): profile sub-nav buttons unrouted; add-property Step 5 review sparse; rental payment step re-asks input (see `M6-FINDINGS.md`).
- **Nothing committed yet** — the whole migration is uncommitted on `backend-migration`. Commit/PR when M6 is green.
