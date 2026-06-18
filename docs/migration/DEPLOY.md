# Deploy to Vercel — guide (go-live item 6)

> Recommended path: **preview/staging first** on a free `*.vercel.app` URL using the **dev** Clerk
> keys, then a real production launch later with a Clerk **production instance** + custom domain.
> This lets us test the full serverless stack now without DNS/custom-domain work.

## Which deployment am I on? (environment convention)

Same code (`backend-migration`), two environments distinguished by config:

| First screen you see | Build | Neon branch | Data | Gate |
|---|---|---|---|---|
| **Preview Access** (password) | Preview / dev | `ep-tiny-rice` (dev) | seed + test | `SITE_PASSWORD` set (Preview only) |
| **`/login`** | Production | `ep-aged-cloud` (prod) | real users | no `SITE_PASSWORD` |

Set in Vercel via **per-environment** values: `DATABASE_URL` = dev string on Preview / prod string on
Production; `SITE_PASSWORD` on Preview only. Production build doesn't exist until `backend-migration`
is merged to the production branch. Note: with real Clerk auth, a logged-in user only sees **their own
org's** data — the preview won't *display* the `ORG-0001` seed catalog (that needs demo mode); pointing
preview at dev is about keeping prod clean.

## The Clerk dev-vs-production nuance (read first)

Clerk has two instances per app:
- **Development** (`pk_test_…`/`sk_test_…`) — what you've been using. Works on localhost **and** on
  `*.vercel.app` preview URLs, no domain setup. Fine for a staging deploy. Shows a small dev banner;
  not meant for real end users.
- **Production** (`pk_live_…`/`sk_live_…`) — needed for the real public launch. Requires a **custom
  domain** with DNS records (CNAMEs for `clerk.yourdomain.com`). A separate step we do at real launch.

➡️ **For this first deploy we use the DEV keys on a vercel.app URL.** Production instance = later.

## Pre-deploy: rotate the Neon prod password ⚠️

The production `DATABASE_URL` was pasted in chat earlier (exposed). Before putting it in Vercel:
1. Neon → `production` branch → **Reset password** (rotate).
2. Copy the **new** pooled connection string. Use THAT in Vercel (not the old one, not the dev one).

## Env vars to set in Vercel

Set these in **Project → Settings → Environment Variables** (tick all of Production/Preview for now).
Most copy straight from your `.env.local` — **except the two swaps marked ⚠️**.

| Variable | Value | Secret? |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | from `.env.local` (dev `pk_test_…`) | public |
| `CLERK_SECRET_KEY` | from `.env.local` (dev `sk_test_…`) | secret |
| `DATABASE_URL` | ⚠️ **rotated PRODUCTION** Neon string (NOT the dev one in `.env.local`) | secret |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | from `.env.local` — **required**, build needs it | public |
| `STORAGE_BUCKET` / `STORAGE_REGION` | from `.env.local` | public-ish |
| `STORAGE_ACCESS_KEY_ID` / `STORAGE_SECRET_ACCESS_KEY` | from `.env.local` | secret |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | from `.env.local` (REST values) | secret |
| `SITE_PASSWORD` | from `.env.local` (site-gate) | secret |
| `DEMO_MODE` | `false` (or omit — defaults false) | — |
| `CLERK_WEBHOOK_SIGNING_SECRET` | ⚠️ **add AFTER first deploy** (new webhook → its secret) | secret |
| `DATABASE_AUTHENTICATED_URL` | skip (RLS, item 5, later) | — |

## Steps

1. **Rotate** Neon prod password (above); have the new string ready.
2. **Connect** the GitHub repo to Vercel (vercel.com → Add New → Project → import `valgate-webapp-nextjs`).
3. **Branch:** deploy the `backend-migration` branch (set it as the project's production branch for now,
   or open a PR and use its preview deployment). Framework = Next.js (auto-detected).
4. **Paste env vars** from the table (all environments). Double-check the two ⚠️ swaps.
5. **Deploy.** Watch the build log; `next build` passes locally so it should build clean.
6. **Smoke-test** the `*.vercel.app` URL: site-gate → sign up (use `+clerk_test@…` + `424242`, or a real
   email) → land in app → add a property with a photo (S3) → sign out/in. Data lands in the **prod** Neon
   branch now (it was empty).
7. **Clerk webhook** (now that you have a stable URL): Clerk dashboard → Webhooks → add
   `https://<your-app>.vercel.app/api/webhooks/clerk`, subscribe `user.*`/`organization.*`/
   `organizationMembership.*`, copy its **signing secret** → set `CLERK_WEBHOOK_SIGNING_SECRET` in Vercel
   → redeploy. (JIT bootstrap covers first sign-in even before this, so it's not blocking.)

## After staging looks good — real production launch (later)
- Create the Clerk **production instance** (`pk_live`/`sk_live`) + add the custom domain DNS records.
- Point env `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`/`CLERK_SECRET_KEY` to the live keys; recreate the webhook
  on the production instance.
- Then item 5 (**RLS**) becomes runnable against real prod Clerk JWTs — see `RLS-PLAN.md`.
