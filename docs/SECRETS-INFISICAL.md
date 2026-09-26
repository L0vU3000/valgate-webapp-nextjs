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

## Still missing from `/web` (measured 2026-09-26)

Absent in **all** envs: `DATABASE_AUTHENTICATED_URL`, `RESEND_FROM_EMAIL`.
Absent in `staging`/`prod` only: `DEMO_MODE`, `DEMO_ALLOW_WRITES` (present in
`dev` by design). Everything else the earlier version of this section listed —
`CRON_SECRET`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET` — is now present.

All are `.optional()` or demo-only, so nothing breaks — but Resend transactional
email stays off until `RESEND_FROM_EMAIL` is set. `staging`/`prod` should get the
two `DEMO_*` keys only if you want demo writes there (that is a footgun: one
shared value that silently disables auth for whoever pulls it next).

## Arming the native Vercel secret sync

**Preconditions were cleared on 2026-09-26.** All three pairs are byte-consistent
and the failure mode that caused the 09-21 incident is gone:

| Pair | Infisical keys | Vercel keys | Blanks | Vercel-only | State |
|---|---|---|---|---|---|
| `prod -> production` | 17 | 17 | 0 | 0 | **clean** |
| `staging -> preview` | 17 | 17 | 0 | 0 | **clean** |
| `dev -> development` | 16 | 16 | 0 | 0 | **clean** |

What changed:

1. **No `sensitive` Vercel vars remain.** `vercel env ls --format json` reports
   50 vars, `sensitive=0`, all `encrypted`. The 09-21 mechanism was: a sync
   imported Vercel's `sensitive` values as empty strings (Vercel never exposes
   them to anyone) and then pushed those blanks back, blanking 18 values. With
   zero sensitive vars there is nothing for that to bite, and `vercel env pull`
   can read every value — which is also why an Infisical↔Vercel diff is now
   meaningful at all.
2. **Staging's 5 blank placeholders were removed** (`ANTHROPIC_API_KEY`,
   `MCP_ALLOWED_OAUTH_CLIENT_IDS`, `OPENAI_API_KEY`, `SITE_PASSWORD` — Vercel
   preview never had them), and `NEXT_PUBLIC_CLERK_SIGN_IN_URL` was filled from
   Vercel preview. A blank secret is not "unset" to a sync: it is a *value*, and
   pushing it would CREATE an empty key on the destination. `lib/env.ts` sets
   `emptyStringAsUndefined: true` and every one of these is `.optional()`, so
   removing the blanks is behaviour-neutral.
3. **The stray `HERMES_READINESS_PROBE`** in `/web prod` was deleted. `infisical
   secrets delete` works; the earlier note that "CLI + API both fail" was wrong
   (it was probably attempted against the personal rather than shared scope — the
   CLI defaults to `--type personal`, and shared secrets need `--type shared`).

**Arming order — the order is the whole lesson.** `isEnabled` is NOT the
auto-sync switch; the UI has a separate **Auto-Sync Enabled** option, and it
defaults on. So:

1. Create the sync for **one** environment (`dev -> development` first, the
   lowest-blast-radius pair).
2. **Immediately** turn off **Auto-Sync Enabled** before it does anything else.
   The UI is the only place for this; the API's create payload
   (`POST /api/v1/secret-syncs/vercel`) carries `isEnabled` +
   `syncOptions.initialSyncBehavior` and nothing about auto-sync.
3. Set **Initial Sync Behavior** to **Import Secrets (Prioritize Vercel)**, so
   the first import cannot overwrite destination values.
4. Set a **Key Schema** (`{{secretKey}}`) so Infisical only manages the keys you
   intend and leaves everything else alone. The docs recommend this explicitly.
5. Turn ON **Disable Secret Deletion**. Read the label carefully: "If enabled,
   Infisical will not remove secrets from the sync destination." ENABLED is the
   safe state. This is the setting that could delete Vercel keys Infisical does
   not define.
6. Inspect the resulting diff against `scripts/push-web-env.sh` (dry run) — it
   should report no keys to change.
7. Only then enable auto-sync, and only for the pairs you have verified.

Do **not** repeat the 09-21 mistake of creating a sync and trusting
`isEnabled: false` to keep it inert.

### Why `Import Secrets (Prioritize Vercel)` matters here

The vendor note says Vercel does not expose `sensitive` environment variable
values, so the initial import creates them in Infisical **empty** and they must
be re-entered by hand. That is precisely the 09-21 mechanism. We measured **0
sensitive vars** in the project, so this no longer applies — but it is the reason
the direction and the deletion toggle are not cosmetic choices.

### The CLI cannot create a sync — but the API can

`infisical` (v0.43.133) exposes no sync/integration command — `secrets`,
`export`, `init`, `login` only.

The **HTTP API** can: `POST /api/v1/secret-syncs/vercel` takes `name`,
`projectId`, `connectionId`, `environment`, `secretPath`, `isEnabled`,
`syncOptions.initialSyncBehavior` and `destinationConfig` (`app`, `env`,
`branch`, `appName`, `teamId`). It needs an auth token and a `connectionId`,
which is why the App Connection must exist first.

That means the whole thing is scriptable **except** creating the App Connection,
whose credential is a Vercel API token that can only be minted in the Vercel
dashboard. One human step, then the rest can be automated if you want it.

`destinationConfig.app` is the Vercel **project id** — for this project that is
`prj_nQ870fzy7rzZ4pNhh2urszWbwmGf` (team `team_nAZ8SakgJYQi3XpdsF10a73A`, from
`.vercel/project.json`).

### `scripts/push-web-env.sh` after arming

Keep it, but demote it. Once the native sync is armed it is no longer the primary
push path — it is the **dry-run/diff tool**, because the native sync gives you no
preview of what it is about to change. Running its `--apply` while auto-sync is
enabled gives you two writers on one surface; use it for the diff, not for the
write, unless the sync is paused.

## Environment facts that cost time

- `infisical export --path /web` needs `--projectId` unless the repo has been
  `infisical init`'d; the error reads like a missing folder. The script supplies
  the id by default.
- The Infisical CLI's stored token is a `go-keyring-base64:<json>` envelope, not a
  raw JWT — unusable as a `curl` header.
- Vercel `sensitive` vars are write-only for everyone including the CLI. They can
  never be imported; they must be re-issued to enter Infisical at all.
