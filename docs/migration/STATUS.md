# Backend Migration — STATUS & Handoff

> Single entry point. Repo: `valgate-webapp-nextjs`, branch `backend-migration` (off
> `valgate-webapp-nextjs-v1.0.2`). Architecture: Option A "mergeable modules" — backend's `lib/` +
> `app/actions/` copied in, simulated layer deleted. **Now runs REAL Clerk auth (`DEMO_MODE=false`)
> and is deployed to a gated Vercel preview.** Everything below is committed + pushed.

## Where we are (one line)
Migration done → Clerk auth built & working → deployed to a **Vercel preview** (gated, dev branch).
Remaining = the real production launch (merge to prod branch, Clerk production instance + domain, RLS).

## Go-live checklist
| # | Item | State |
|---|---|---|
| 1 | **Clerk auth** | ✅ done — headless on Clerk **Future/signals API**; login/register(OTP+auto-org)/forgot(reset)/sign-out all work locally + on the preview. See `CLERK-PLAN.md` + memory `project_clerk_future_api`. |
| 2 | **AWS S3** | ✅ verified — Documents tab + add-property wizard upload to the bucket. |
| 3 | **Neon prod branch** | ✅ done — `production` (`ep-aged-cloud-aohhlwhs`) migrated + `db:assert` PASS, empty. **Password ROTATED** (old exposed one deleted). |
| 4 | **Upstash Redis** | 🟡 deleted from preview env to unblock build; add valid **REST** URL/token (`https://…upstash.io`, no quotes) to Vercel **Production** for real rate limiting. Optional (in-memory fallback works). |
| 5 | **Neon RLS** | ☐ planned (`RLS-PLAN.md`, 7 phases). Now **unblocked** (real Clerk JWTs exist). Do after production launch. |
| 6 | **Deploy (Vercel)** | 🟡 **preview live & green**; production not deployed yet (see NEXT). |

## What this session did
- Wired **add-property photos/docs → S3** (`AddPropertyFlow` uploads Step-4 staged files after create).
- Finished **M5/M6 fixes** (`getMyUserProfile`, `DEMO_ALLOW_WRITES`).
- Created + migrated the **Neon production branch** (item 3).
- Wrote the **RLS plan** (`RLS-PLAN.md`).
- Built **Clerk headless auth** end-to-end (item 1). Dashboard config: email verification = **code**,
  **"Create first organization automatically" = ON** (so register does NOT call `createOrganization`).
  Fixes found along the way: missing **`#clerk-captcha`** element (bot protection silently blocked the
  verification email); **`DEMO_MODE` env-parse bug** (`z.coerce.boolean("false")===true` → fixed to
  enum parse in `lib/env.ts`); **`/profile` falls back to Clerk identity** for new users.
- **Deployed to a Vercel preview** and wrote `DEPLOY.md`.
- **Claimed the seed catalog** into a real account so it's viewable under real auth (see below).

## Deployment specifics (read before touching the deploy)
- **Only deploy the `backend-migration` branch** (Preview). `main` is OLD pre-migration code
  (`@clerk/nextjs@7.2.3` → npm **ERESOLVE**); its builds fail — **ignore them**. Production launch =
  merge `backend-migration` → the production branch (brings the fixed deps).
- **Per-environment Vercel env vars** (this is the convention — also in `DEPLOY.md`):
  | First screen | Build | `DATABASE_URL` | `SITE_PASSWORD` |
  |---|---|---|---|
  | **Preview Access** gate | Preview / dev | **dev** string (`ep-tiny-rice`) | set (Preview only) |
  | **`/login`** | Production | **prod** string (`ep-aged-cloud`, rotated) | not set |
- **Env-var gotchas learned:** values must have **no surrounding quotes** (copying from `.env.local`
  drags quotes in); each var needs the right **Environment scope** (Preview vs Production); a Vercel
  build **fails at "Collecting page data"** if any required var (esp. `DATABASE_URL`) is missing/malformed
  — `createEnv` validates at build time.
- **Clerk keys are DEV** (`pk_test`/`sk_test`) — fine on `*.vercel.app`. Real launch needs a Clerk
  **production instance** (`pk_live`) + custom domain DNS.
- **Trigger a preview build** by pushing any commit to `backend-migration` (empty commit works) — the
  Redeploy button kept selecting `main` deployments.

## Seed data on dev (how a real login sees it)
The 26 seed properties (+319 related rows) were owned by the **ghost org `ORG-0001`** (`demo@valgate.app`,
no real Clerk login). Reassigned to real account **`xuvfkg2q@oceansinfinite.addymail.com` (ORG-0009)** via
`.context/claim-seed.ts <email>` (gitignored, **dev-only**, prod-guarded, one transaction). Re-run with a
different email to re-claim; `npm run seed:neon` on dev resets. Real auth scopes by org, so seed shows only
for whoever owns it — there is **no demo-mode on Vercel** (refused in prod builds).

## ▶ NEXT — real production launch (when ready)
1. **Merge** `backend-migration` → production branch (fixes `main`'s ERESOLVE by bringing new deps).
2. **Clerk production instance** (`pk_live`/`sk_live`) + custom domain DNS; point Vercel Clerk keys at it.
3. **Clerk webhook** → add endpoint `https://<domain>/api/webhooks/clerk` (events `user.*`,
   `organization.*`, `organizationMembership.*`) → put its signing secret in Vercel
   `CLERK_WEBHOOK_SIGNING_SECRET`. (JIT bootstrap covers first sign-in until then.)
4. **Upstash** → add valid REST creds to Vercel Production (item 4).
5. **RLS** → run `RLS-PLAN.md` (now unblocked).

## Key facts to remember
- **Next 15** (never upgrade to 16). `revalidateTag` single-arg.
- **Clerk = Future/signals API** — `signIn.password/finalize`, `signUp.verifications.*` — NOT classic
  `create/attemptFirstFactor`. (memory `project_clerk_future_api`.)
- **Deferred (still simulated)**: `clients`, `agent-runs`, `dbdiagram-state` (`@/lib/data/db/*`).
- `(shell)/layout.tsx` is `force-dynamic`. DB ops: `db:ping` → `db:migrate` → `seed:neon`.

## Docs map
`STATUS.md` (this) · `CLERK-PLAN.md` · `RLS-PLAN.md` · `DEPLOY.md` · `M6-CHECKLIST.md` · `M6-FINDINGS.md`
