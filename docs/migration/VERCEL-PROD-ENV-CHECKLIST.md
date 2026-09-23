# Valgate Webapp — Production Vercel Environment Variables Checklist

> Generated from `/home/hermes/development/projects/valgate-webapp-vps/lib/env.ts`.
> Source repo: `https://github.com/L0vU3000/valgate-webapp-nextjs`.
> Add these in Vercel → Project → Settings → Environment Variables → **Production** scope.
> Do NOT paste secrets into `.env.local` on the VPS if it may be copied.

Legend:
- ✅ = already set in local `.env.local` (likely have a dev/preview value; prod needs its own)
- ⬜ = currently missing even locally (must source from dashboard)
- 🔒 = secret / sensitive
- 🌐 = public (safe in `NEXT_PUBLIC_*`)

---

## Required for build

| Variable | Prod Value | Scope | Status | Notes |
|---|---|---|---|---|
| `DATABASE_URL` | Neon prod branch pooled connection string | Server | ✅🔒 | Rotate prod password first if not already done. |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox public token | Production | ✅🌐 | Build fails without it. |

## Clerk production instance

| Variable | Prod Value | Scope | Status | Notes |
|---|---|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_…` | Production | ✅🌐 | From Clerk production instance. |
| `CLERK_SECRET_KEY` | `sk_live_…` | Production | ✅🔒 | From Clerk production instance. |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Webhook secret | Production | ✅🔒 | Create webhook `https://www.valgate.co/api/webhooks/clerk` first. |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/login` | Production | ✅🌐 | Baked at build time. Already set locally. |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/register` | Production | ✅🌐 | Baked at build time. Already set locally. |

## S3-compatible storage (document/photo uploads)

| Variable | Prod Value | Scope | Status | Notes |
|---|---|---|---|---|
| `STORAGE_BUCKET` | prod bucket name | Production | ✅ | e.g. `valgate-prod-uploads` |
| `STORAGE_REGION` | region | Production | ✅ | e.g. `us-east-1` |
| `STORAGE_ACCESS_KEY_ID` | prod IAM key | Production | ✅🔒 | Confirm `s3:DeleteObject` permission. |
| `STORAGE_SECRET_ACCESS_KEY` | prod IAM secret | Production | ✅🔒 | — |

## Upstash Redis (rate limiting)

| Variable | Prod Value | Scope | Status | Notes |
|---|---|---|---|---|
| `UPSTASH_REDIS_REST_URL` | `https://…upstash.io` | Production | ✅🔒 | Falls back to in-memory limiter if unset. |
| `UPSTASH_REDIS_REST_TOKEN` | token | Production | ✅🔒 | — |

## AI / email

| Variable | Prod Value | Scope | Status | Notes |
|---|---|---|---|---|
| `OPENAI_API_KEY` | prod OpenAI key | Production | ✅🔒 | For document AI summaries. |
| `RESEND_API_KEY` | prod Resend key | Production | ⬜🔒 | Optional until client invitations are used in prod. |
| `RESEND_WEBHOOK_SECRET` | Resend webhook secret | Production | ⬜🔒 | For bounce handling. |
| `RESEND_FROM_EMAIL` | verified sender | Production | ⬜ | e.g. `noreply@valgate.co` |

## MCP connector (Claude integration)

| Variable | Prod Value | Scope | Status | Notes |
|---|---|---|---|---|
| `MCP_ALLOW_ANY_OAUTH_CLIENT` | `true` | Production | ⬜🔒 | Required for Claude DCR. Defaults `false` → /mcp rejects all in prod. |
| `MCP_ALLOWED_OAUTH_CLIENT_IDS` | comma-separated ids | Production | ⬜🔒 | Leave unset if `MCP_ALLOW_ANY_OAUTH_CLIENT=true`. |

## Cron / advanced

| Variable | Prod Value | Scope | Status | Notes |
|---|---|---|---|---|
| `CRON_SECRET` | `openssl rand -hex 32` | Production | ⬜🔒 | Protects `/api/cron/*` routes. |
| `DATABASE_AUTHENTICATED_URL` | Neon authenticated-role URL | Production | ⬜🔒 | Skip until RLS is implemented. |
| `NEXT_PUBLIC_APP_URL` | `https://www.valgate.co` | Production | ⬜🌐 | Used for server-generated links. |

---

## Values to OMIT in Production

| Variable | Why omit |
|---|---|
| `DEMO_MODE` | Production refuses it anyway; leave unset/false. |
| `DEMO_ALLOW_WRITES` | Only for local dev with `DEMO_MODE=true`. |
| `SITE_PASSWORD` | Preview-only site gate. Omit in Production. |
| `NEXT_PUBLIC_ENABLE_DEV_TOOLS` | Leave unset so DEV buttons are hidden. |

---

## Pre-flight before first prod deploy

1. [ ] Neon prod password rotated and `DATABASE_URL` updated.
2. [ ] `drizzle-kit migrate` run against prod branch (do NOT run seed scripts).
3. [ ] Clerk production instance created; `pk_live`/`sk_live` generated.
4. [ ] DNS: `www.valgate.co` → Vercel; `clerk.valgate.co` → Clerk.
5. [ ] Vercel Production env vars from table above all set.
6. [ ] Clerk webhook created and signing secret set.
7. [ ] Production branch selected in Vercel (not `main` if `main` is stale).
8. [ ] Run `npm run lint`, `npx tsc --noEmit`, `npm run test` green on deploy commit.
9. [ ] Deploy and smoke-test: login → add property → upload document → MCP list properties.

---

## Status of this codebase (2026-09-03)

- Repo: `/home/hermes/development/projects/valgate-webapp-vps`
- Branch: `main` at `41a4a56` (merge of `release/launch-readiness`)
- Lint: 0 errors, 16 warnings
- TypeScript: clean
- Tests: 284/284 passing
- One minor fix applied: `lib/db/client.ts` explicit `any` → `unknown` cast
