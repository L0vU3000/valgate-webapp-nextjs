# Secrets in the web repo — Infisical for local, Vercel for runtime

Status: **local `.env.local` is now Infisical-sourced.** Vercel remains the
runtime source of truth. No secret sync is armed.

## The split, and why

| Consumer | Source | Why |
|---|---|---|
| Vercel production / preview | Vercel project env | Deploy-time injection; nothing else reaches the function runtime |
| Local `next dev` | **Infisical `/web`** via `scripts/sync-web-env.sh` | One place to type a value; no console spelunking |
| CI (`ci.yml`) | GitHub Actions secrets + a throwaway local Postgres | Never touch Infisical — a secret-store outage must not fail CI |
| iOS build config | **Infisical `/ios`** via `scripts/sync-secrets.sh` | Already shipped (xcconfig has no runtime store) |

`ci.yml:181-184` references four secrets that **do not exist** on the repo, so the
E2E job has never run. Decide: set them, or delete the refs. Recommendation was to
delete (TM1-62 adjacent).

## Daily use

```sh
scripts/sync-web-env.sh                 # Infisical env "staging" -> .env.local
scripts/sync-web-env.sh prod            # or "dev" / "prod"
scripts/sync-web-env.sh --selftest      # fixture check, no network or auth

# Infisical -> Vercel (the deployment side; .env.local does not reach Vercel)
scripts/push-web-env.sh                 # dry run: shows the plan, writes nothing
scripts/push-web-env.sh --apply         # apply it
scripts/push-web-env.sh prod production --apply
scripts/push-web-env.sh --selftest      # invariant checks, no network or auth
```

`push-web-env.sh` is the supported way to get Infisical values into Vercel. It is
one-way and non-destructive by three invariants, each with a selftest case:

1. **Never pushes an empty value.** An empty Infisical secret means "not
   configured", not "set this to nothing". On `staging -> preview` this
   currently skips 5 blanks (`ANTHROPIC_API_KEY`, `MCP_ALLOWED_OAUTH_CLIENT_IDS`,
   `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `OPENAI_API_KEY`, `SITE_PASSWORD`) and
   leaves Vercel's values alone.
2. **Never deletes a Vercel key.** Vercel's own injected keys (`VERCEL_*`,
   `NX_*`, `TURBO_*`) and any key Infisical does not define are KEPT and
   reported. Nothing in the script can remove a value.
3. **Always compares normalized values.** `infisical export` quotes values, and
   can *double*-quote them. Comparing raw text makes byte-identical secrets look
   different and pushes a literal-quoted value over a good one. This was a real
   near-miss: the first draft planned to overwrite production `UPSTASH_*` with a
   quote-wrapped copy of the same string.

Dry run is the default; `--apply` is required to write. It never prints a secret
value — names and fingerprints only. All three environments currently plan as
no-ops, which is the healthy state.

Vercel only applies environment changes to **new** deployments — redeploy after
applying.

The script **merges**, it does not overwrite. `.env.local` holds operator switches
that must not live in a shared secret store:

```
DEMO_MODE              DEMO_ALLOW_WRITES
VERCEL_OIDC_TOKEN      STAGING_DEMO_MODE
```

Those four are preserved verbatim from the existing file; every other key comes
from Infisical. `DEMO_MODE` in Infisical would be a footgun — one shared value that
silently disables auth for whoever pulls it next. The previous file is saved to
`.env.local.bak` (covered by `.gitignore:42` `.env*`).

## Which Infisical environment maps to what

| Infisical env | `/web` content | Vercel tier it corresponds to |
|---|---|---|
| `dev` | demo/development set — **incl. `DEMO_MODE=true`** | development |
| `staging` | the fuller preview set | preview |
| `prod` | production set | production |

`dev` and `staging` both point at the Neon **dev** branch (`ep-tiny-rice…`), so
`sync-web-env.sh dev` is the safe local default. `prod` points at production —
do not run it for local work.

`infisical export` quotes values (`KEY='value'`). `next` / `@t3-oss/env-nextjs`
strip surrounding quotes, so this is fine as-is.

## Still missing from `/web` staging

Required by `lib/env.ts` but absent: `CRON_SECRET`, `DATABASE_AUTHENTICATED_URL`,
`DEMO_MODE`, `DEMO_ALLOW_WRITES`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`,
`RESEND_WEBHOOK_SECRET`. All are `.optional()` or demo-only, so nothing breaks —
but Resend (transactional email) is quietly off. `dev` intentionally carries the
two `DEMO_*` keys; `staging`/`prod` should get them only if you want demo writes
there.

## Do NOT re-arm the native Vercel secret sync yet

Use `scripts/push-web-env.sh` instead — one-way, never destructive, dry-run by
default, and it skips blanks rather than propagating them.

Status of the native sync's preconditions, measured 2026-09-26:

| Pair | Vercel-only keys (Secret Deletion risk) | Infisical blanks | Armable? |
|---|---|---|---|
| `prod -> production` | `VERCEL` (system) | none | **no** |
| `staging -> preview` | `VERCEL` (system) | 5 (see above) | **no** |
| `dev -> development` | none | none | yes |

The 2026-09-21 incident: a sync created with `isEnabled: false` still ran.
`isEnabled` is not the auto-sync switch — `isAutoSyncEnabled` is, and it defaults
on. The initial sync imported Vercel's `sensitive` values as **empty strings**
(Vercel will not expose them to anyone, ever) and then pushed those blanks back,
overwriting 9 production + 9 preview values. Full record in the iOS worktree's
`docs/SECRETS-INFISICAL.md`.

Safe order, if you revisit it:

1. **First** un-flag the sensitive vars in Vercel (or re-issue them) so real values exist.
2. Create the sync, then immediately PATCH `isAutoSyncEnabled: false`.
3. Disable Secret Deletion in the UI — it is not in the API schema.
4. Inspect the diff, then enable.

Values first, sync second. Never the reverse. Note `vercel env pull` also cannot
read sensitive values, so a sync would import blanks even after rotation unless
the flags were cleared.

## Environment facts that cost time

- `infisical export --path /web` needs `--projectId` unless the repo has been
  `infisical init`'d; the error reads like a missing folder. The script supplies
  the id by default.
- The Infisical CLI's stored token is a `go-keyring-base64:<json>` envelope, not a
  raw JWT — unusable as a `curl` header.
- Vercel `sensitive` vars are write-only for everyone including the CLI. They can
  never be imported; they must be re-issued to enter Infisical at all.
