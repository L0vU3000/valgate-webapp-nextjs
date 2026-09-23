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
```

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

## Do NOT re-arm the Vercel secret sync yet

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
