# Production deployment — readiness checklist

> Companion to `DEPLOY.md`. That doc covers the **staging** deploy (dev Clerk keys on a
> `*.vercel.app` URL). THIS doc is the **real production launch**: production Clerk instance,
> custom domain, prod Neon, and the MCP connector surface shipped in PR #25.
>
> Nothing here is executed automatically — each step needs a human (secrets, DNS, dashboards).
> Order matters: **Clerk production instance + custom domain is the critical path**; several
> other items depend on the stable prod origin existing first.

Legend: ⬜ todo · ⚠️ needs a decision/secret from you · 🔒 security-sensitive

**Decisions locked (2026-07-06):**
- **App domain:** `www.valgate.co` (Clerk subdomain on the apex: `clerk.valgate.co`).
- **Legacy `/api/mcp`:** ✅ **removed** — route + its `/.well-known` descriptor deleted; only the live `/mcp` remains.
- **Seeding:** launch **empty** — do NOT run `seed:neon`/`seed:reset` against prod.

---

## 0. Code is ready (mostly done)
- ✅ PR #25 merged to `valgate-webapp-nextjs-v1.0.2` (Connect Claude UI + 16-tool MCP surface).
- ⬜ Confirm `tsc --noEmit`, `npm run lint`, and the test suites (`npm run test`, e2e) are green on the release branch head.
- ⬜ Confirm DB migrations are current and hand-authored ones apply in order (see `project_migration_ordering_gotcha` — verify live schema via Neon MCP after migrating).

## 1. Neon production database ⚠️🔒
- ⚠️ **Rotate the prod branch password FIRST** — the prod `DATABASE_URL` was exposed in chat earlier. Neon → prod branch (`ep-aged-cloud-…`) → Reset password → copy the **new pooled** string. That rotated string is what goes in Vercel.
- ⬜ Run migrations against the prod branch: `db:ping` → `db:migrate` (NOT `seed:reset` — never). Prod starts empty of app data by design.
- ⬜ Decide seeding: production should launch **empty** (real users create their own orgs/data). Do NOT run `seed:neon` against prod.

## 2. Clerk production instance ⚠️🔒 (critical path)
This is the gating item — it also fixes the deferred unbranded sign-in/consent screens.
- ⚠️ Create the Clerk **production instance** (`pk_live_…` / `sk_live_…`).
- ⬜ Add DNS records for the Clerk subdomain (`clerk.valgate.co`), per Clerk's dashboard.
- ⬜ Point `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` at the **live** keys.
- ⬜ Recreate the Clerk **webhook** on the prod instance → `https://www.valgate.co/api/webhooks/clerk`, subscribe `user.*` / `organization.*` / `organizationMembership.*` → set `CLERK_WEBHOOK_SIGNING_SECRET`. (JIT bootstrap covers first sign-in even before this — not blocking.)
- 🔒 Set the **custom consent screen URL** to `https://www.valgate.co/oauth-consent` — this is what makes the MCP "allow access" step Valgate-branded (see `project_mcp_consent_screen_unbranded`). On a stable prod domain it no longer drifts.

## 3. Custom domain
- ⚠️ Point `www.valgate.co` at Vercel; add it in Vercel → Domains.
- ⬜ Set `NEXT_PUBLIC_APP_URL` = `https://www.valgate.co` (fallback for invitation links; the MCP connector URL is computed live from `headers()`, so it becomes `https://www.valgate.co/mcp` automatically — no hardcoding).

## 4. Vercel env vars — Production scope 🔒
Build the Production environment from `lib/env.ts`. **Required** (build fails without): `DATABASE_URL`, `NEXT_PUBLIC_MAPBOX_TOKEN`. Everything else is optional to the *build* but needed for features to work.

| Variable | Prod value | Notes |
|---|---|---|
| `DATABASE_URL` | ⚠️ rotated **prod** Neon string | 🔒 |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_…` | public |
| `CLERK_SECRET_KEY` | `sk_live_…` | 🔒 |
| `CLERK_WEBHOOK_SIGNING_SECRET` | from the prod webhook (§2) | 🔒, add after first deploy |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | required | build needs it |
| `NEXT_PUBLIC_APP_URL` | `https://www.valgate.co` | — |
| `SITE_PASSWORD` | **omit** in Production (gate is preview-only) | 🔒 |
| `DEMO_MODE` | omit / `false` | prod refuses demo anyway |
| `STORAGE_BUCKET` / `STORAGE_REGION` | prod bucket | — |
| `STORAGE_ACCESS_KEY_ID` / `STORAGE_SECRET_ACCESS_KEY` | prod IAM | 🔒, confirm `s3:DeleteObject` on the **prod** key (see `project_s3_delete_permission_gap`) |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` / `RESEND_WEBHOOK_SECRET` | prod Resend + **verified domain** | 🔒 |
| `OPENAI_API_KEY` | prod key | 🔒, document AI summaries |
| `ANTHROPIC_API_KEY` | prod key | 🔒, AI overlay (read via process.env, not in env.ts) |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | prod Upstash | 🔒, rate limiting (falls back to in-memory if unset — set it for prod) |
| `CRON_SECRET` | strong random | 🔒, cron routes 401 without it |
| `MCP_ALLOW_ANY_OAUTH_CLIENT` | `true` | 🔒 see §5 |
| `DATABASE_AUTHENTICATED_URL` | skip until RLS (§7) | — |

## 5. MCP connector — production specifics 🔒
- ⚠️🔒 `MCP_ALLOW_ANY_OAUTH_CLIENT=true` is **required** for Claude to connect in prod. Reason: Claude registers via Dynamic Client Registration (DCR) with a client id we can't know ahead of time; in prod `NODE_ENV` the `/mcp` endpoint fails closed unless this opt-in is set (see `lib/env.ts` comment + `project_mcp_dcr_client_rejected`). **Tradeoff:** with it on, `/mcp` accepts *any* valid OAuth client in our Clerk instance. Acceptable for launch; tighten later via `MCP_ALLOWED_OAUTH_CLIENT_IDS` if/when clients are known.
- ✅ **`/api/mcp` removed** (2026-07-06). The legacy endpoint and its `/.well-known/oauth-protected-resource/api/mcp` descriptor are deleted, so `/mcp` is the single MCP surface. `MCP_ALLOW_WRITES` / `MCP_CONFIRM_SECRET` are no longer read anywhere — don't set them.
- ⬜ The 14 write tools need **no** env flag — they're role-enforced in the service layer. A prod user with `viewer` role is refused; `member+` can write.

## 6. Deploy + smoke-test
- ⬜ Deploy the release branch to Production (Vercel). Watch the build log.
- ⬜ Smoke-test on the custom domain: land on `/login` (no site-gate) → sign up (real email) → add a property with a photo (S3) → sign out/in.
- ⬜ **MCP end-to-end**: connect Claude to `https://www.valgate.co/mcp` → sign-in + consent should now be **Valgate-branded** → "list my properties" → a write round-trip (create/update/delete a throwaway). Reconnect the connector after any tool changes (client caches the tool list).

## 7. Post-launch (not blocking)
- ⬜ **RLS** (go-live item 5): now runnable against real prod Clerk JWTs — see `RLS-PLAN.md`; set `DATABASE_AUTHENTICATED_URL`.
- ⬜ Error monitoring (Sentry connector is available but unauthenticated in this session).
- ⬜ Connection-status / Disconnect in the Connect Claude sheet (deferred TODO — needs Clerk OAuth-grant queries).

---

## Critical-path summary
1. **Clerk production instance + custom domain** (§2, §3) — unblocks branded auth/consent and a stable origin.
2. **Rotate + migrate prod Neon** (§1).
3. **Set Production env vars**, incl. `MCP_ALLOW_ANY_OAUTH_CLIENT=true` (§4, §5).
4. **Deploy + smoke-test**, MCP end-to-end (§6).
5. RLS + monitoring (§7) after.

## Decisions — resolved 2026-07-06
- **Custom domain:** `www.valgate.co` (app) + `clerk.valgate.co` (Clerk subdomain, on the apex).
- **`/api/mcp`:** removed — `/mcp` is the only MCP surface.
- **Seeding:** launch empty.
