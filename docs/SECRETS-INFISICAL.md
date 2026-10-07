# Secrets in the web repo — Infisical for local, Vercel for runtime

Status: **local `.env.local` is Infisical-sourced, and the native
Infisical → Vercel secret syncs are armed for all three environments.** Auto-sync
remains **off** on all three. Vercel remains the runtime source of truth.

Not verified: real Clerk webhook **delivery** in dev. See the last section —
configured, but no delivery has ever arrived. Do not read that section as "done".

## The split, and why

| Consumer | Source | Why |
|---|---|---|
| Vercel production / preview | Vercel project env | Deploy-time injection; nothing else reaches the function runtime |
| Local `next dev` | **Infisical `/web`** via `scripts/sync-web-env.sh` | One place to type a value; no console spelunking |
| CI (`ci.yml`) | GitHub Actions secrets + a throwaway local Postgres | Never touch Infisical — a secret-store outage must not fail CI |
| iOS build config | **Infisical `/ios`** via `scripts/sync-secrets.sh` | Already shipped (xcconfig has no runtime store) |

`ci.yml` E2E job references secrets that **do not exist** on the repo, so the job
has never run. It needs `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` (GitHub
holds only `DATABASE_URL`). The two `E2E_CLERK_USER_EMAIL` / `_PASSWORD` refs at
`ci.yml:183-184` are **dead** — nothing in the repo reads them; `e2e/auth/auth.setup.ts`
signs in with hardcoded `+clerk_test` emails via Clerk's fixed dev OTP `424242`.
The job is `continue-on-error: true` on purpose and must stay that way until it
actually passes (TM1-62). Order: add the Clerk secrets → verify green → then drop
`continue-on-error`. Do not drop it first, or CI just goes red again.

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
   configured", not "set this to nothing". As of 2026-09-28 no env has blanks
   left, so this skips nothing — it reported 5 blanks in `staging` before they
   were cleaned up.
2. **Never deletes a Vercel key.** Any key Infisical does not define is KEPT and
   reported. Nothing in the script can remove a value. Vercel's own
   platform-injected names (`VERCEL`, `VERCEL_*`, `TURBO_*`, `NX_*`) are excluded
   from the report entirely: `vercel env pull` writes them into the pulled file
   while `vercel env ls` never lists them, so counting them made the tool claim
   ~21 phantom "destination-only secrets" that Infisical was supposedly silent
   about. They are not secrets and nobody manages them.
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

## Armed: three syncs, verified 2026-09-28

All three syncs exist and have completed a **successful** first run. Verified by
reading the sync records back from the API, not from the UI:

| Sync | id | source | destination | first run | auto-sync |
|---|---|---|---|---|---|
| `vercel-development-web` | `a61d5b82-8d21-40f0-b726-8adb4e0ed545` | `dev /web` | `valgate-webapp` development | ✅ succeeded | off |
| `vercel-preview-web` | `4773acd8-339a-4aba-aac1-7fd0880a996b` | `staging /web` | `valgate-webapp` preview | ✅ succeeded | off |
| `vercel-production-web` | `34300d32-1e6b-4992-a39c-511f606fb15a` | `prod /web` | `valgate-webapp` production | ✅ succeeded | off |

Every one carries the same options, copied from the dev sync that had already run
green rather than re-derived:

```
initialSyncBehavior   overwrite-destination
keySchema             {{secretKey}}
disableSecretDeletion true
isAutoSyncEnabled     false
```

Post-run independent check (`scripts/push-web-env.sh`, dry run) reports
`ADD 0 / UPDATE 0` and full agreement in all three pairs — 16 keys in
development, 17 in preview and production, zero blanks on either side. So the
first run overwrote nothing that differed and removed nothing.

### What `overwrite-destination` does when deletion is disabled

The two settings govern **different authorities** and compose cleanly:

| Setting | Governs | This project |
|---|---|---|
| `initialSyncBehavior` | which **value** wins a conflict | Infisical wins |
| `disableSecretDeletion` | whether Infisical may **delete** | no, never |

The first run is the evidence: 16–17 values agreed, nothing was blanked, and no
destination-only key disappeared. `overwrite-destination` did not remove anything,
because removal is `disableSecretDeletion`'s job and it is `true`.

So "Infisical is the master" is now **true for values** and **false for
deletions** — which is exactly the intended, non-destructive arrangement. If you
ever want Infisical deletions to propagate, that is a separate, deliberate change
to `disableSecretDeletion`, and it is the one that can blank a runtime.

### Arming order — the order is the whole lesson

`isEnabled` is NOT the auto-sync switch; the API's `isAutoSyncEnabled` is, and
**the create endpoint defaults it to `true`**. So:

1. Create the sync for **one** environment (`dev -> development` first, the
   lowest-blast-radius pair).
2. In the payload, set `isAutoSyncEnabled: false` **explicitly** — the API
   default is `true`, and a sync that silently arms itself is the 09-21 shape.
3. Set **Initial Sync Behavior**. `overwrite-destination` is fine (see above);
   it is what this project runs.
4. Set a **Key Schema** (`{{secretKey}}`). Without it `syncOptions` carries no
   key restriction. Vendor docs recommend it.
5. Turn ON **Disable Secret Deletion**. Read the label carefully: "If enabled,
   Infisical will not remove secrets from the sync destination." ENABLED is the
   safe state.
6. **Trigger one run and read the result back.** `syncStatus` must become
   `succeeded` and `lastSyncedAt` must be non-null. A configured sync is not a
   run sync.
7. Inspect the diff with `scripts/push-web-env.sh` (dry run) — it should report
   no keys to change.
8. Only then consider auto-sync, and only for the pairs you have verified. This
   project has **not** enabled it anywhere.

Do **not** repeat the 09-21 mistake of creating a sync and trusting
`isEnabled: false` to keep it inert.

### Field names that cost time

Two of these read as null on a healthy sync and make a working setup look broken:

- There is **no `lastSyncStatus`** and no `lastSyncJob` object. The result fields
  are **`syncStatus`** and **`lastSyncedAt`**.
- **`isAutoSyncEnabled` is top-level**, not a `syncOptions` key. Reading it out of
  `syncOptions` yields `None` and silently passes a sync that is actually armed.
- The source path is **`folder.path`**; there is no top-level `secretPath` on a
  sync record (though the *create* payload uses `secretPath`).

`~/valgate-migration/verify_sync_settings.py` reads the correct fields and asserts
no-completed-run; it has a self-test covering all four hazards.

### Updating a sync via API: `syncOptions` is replaced, not merged

`PATCH /api/v1/secret-syncs/vercel/{syncId}` **replaces the whole `syncOptions`
object**. Sending only the field you want to change silently drops the others —
including `disableSecretDeletion`, which disarms the deletion guard. Echo every
field back plus the one you are changing, then re-read and assert nothing else
moved.

### Why the sync direction matters

From Infisical's own docs, the three options are:

| Option | What it does | Master |
|---|---|---|
| **Overwrite Destination Secrets** | Skips the import step; Infisical's values win on conflict | Infisical |
| **Import Secrets (Prioritize Infisical)** | Imports destination secrets first; conflicts resolve to **Infisical** | **Infisical** |
| **Import Secrets (Prioritize Vercel)** | Imports destination secrets first; conflicts resolve to **Vercel** | Vercel |

`Overwrite Destination Secrets` was described here as "**Removes** any
destination secrets not present in Infisical". **That was wrong, and it was
verified wrong on 2026-09-28** — see the next section. It does not delete; it
only decides who wins a *value* conflict. Deletion is controlled **solely** by
`disableSecretDeletion`.

**To make Infisical the master of value conflicts, any of the first two works.**
This project uses `overwrite-destination`, which is what the dev sync was
configured with and what ran green.

It sounds backwards — "import from Vercel" reads like Vercel wins — but the note
is about *conflicts during the initial import only*, not about later syncs.
"Import first" means nothing on the destination is lost; "(Prioritize Infisical)"
means the conflict tiebreak goes Infisical's way. Steady-state, the sync always
writes Infisical → Vercel. There is no "Vercel wins forever" mode.

`Overwrite Destination Secrets` is also Infisical-as-master, and is how you'd
eventually delete keys you removed from Infisical — but it deletes on the
destination, so it is the wrong first move.

For **this project** the choice is nearly academic: all three pairs are already
byte-identical, so there are no conflicts to break. Pick
**Import Secrets (Prioritize Infisical)** because it matches the intent and is
safe in both directions.

The vendor note about `sensitive` vars is the 09-21 mechanism: Vercel does not
expose those values, so the initial import would create them in Infisical
**empty** and they would need re-entering by hand. We measured **0 sensitive
vars**, so it does not apply here — but do not re-introduce `--sensitive` flags
before arming a sync.

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

### The connection already exists — do not recreate it

Measured 2026-09-26 via `GET /api/v1/app-connections?projectId=<valgate>`:

| app | name | id |
|---|---|---|
| github | `valgate` | `2737dece-53ea-4abd-8360-4b7026e4bd0a` |
| **vercel** | **`vercel-valgate`** | **`dda275dd-0789-40e2-a4b0-4fa64c4fa447`** |

Secret syncs in the project: **none**. So the connection is in place and only the
syncs need creating. Recreating the connection would leave two of them and make
the destination picker ambiguous.

If the Vercel project dropdown comes up **empty**, the cause is the connection's
API token, not Infisical: a token minted against a personal account cannot see
team-owned projects. Both projects here are team-owned
(`team_nAZ8SakgJYQi3XpdsF10a73A`), so the token must be scoped to that team.

### Which Vercel project

The team has **two**:

| Project | Production URL | Last updated | Use it? |
|---|---|---|---|
| `valgate-webapp` | https://www.valgate.co | recent | **yes — this is production** |
| `web` | https://web-puce-mu-97.vercel.app | ~37d ago | no — stale |

`.vercel/project.json` links this repo to `valgate-webapp`
(`prj_nQ870fzy7rzZ4pNhh2urszWbwmGf`), and every env audit above was run against
that project. Pick `valgate-webapp` in the sync's destination.

### Finding the right Infisical project

The login sees **7** projects, and several are unrelated Infisical product types
that contain no secrets:

`Agent Vault` · `Certificate Manager` · `Example Project` (kms) ·
`Example Project` (secret-manager) · `Example Project` (secret-scanning) ·
`Privileged Access Manager` · **`Valgate`** (secret-manager)

Open **Valgate** (`d84d9384-ce77-4aa5-a63b-29312617af15`, type `secret-manager`)
**before** clicking Integrations. The Integrations view is project-scoped; opening
it from the organisation level shows an empty project context, which reads as "no
project selected".

### `scripts/push-web-env.sh` now that the syncs are armed

Keep it, but demote it. Now that the native syncs exist it is no longer the
primary push path — it is the **dry-run/diff tool**, because the native sync gives
you no preview of what it is about to change. Auto-sync is off on all three, so
there is no second writer today; if you ever enable it, running `--apply` would
give you two writers on one surface. Use it for the diff.

## Keys land on `origin/main`, not in a worktree

A key added to Infisical `/web` is **not** visible from any checkout until someone
runs `npm run env:sync <env>` there. `.env.local` is untracked and never copied
between worktrees, so each checkout (main clone, kmz-location, parcel, octopus) has
its own snapshot and its own staleness. Checking for a new key in one worktree
proves nothing about another.

Verified 2026-10-05: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` reported "added", yet it was
absent from Infisical `/web` dev/staging/prod, absent from every `.env.local`, and
absent from the Vercel `valgate-webapp` project (17 keys in each of production /
preview / development, no `GOOGLE*`). Three separate surfaces, all empty. See the
token-expiry entry below for why Infisical itself could not be re-read to confirm.

When a key is "added", prove it on the surface the code actually reads:
`infisical export --env dev --path /web | grep NAME` **and** `npm run env:sync dev`,
then restart the dev server.

## Environment facts that cost time

- **The Infisical CLI session expires in ~14 days.** The stored token is a
  `go-keyring-base64:<json>` envelope, not a raw JWT — unusable as a `curl` header.
  The key inside it is spelled `JTWToken` (Infisical's own typo, not `JWTToken`).
  Decoded (2026-10-05) it returns `403 Your token has expired`, so the CLI cannot
  read secrets *even though the keyring entry and `~/.infisical/infisical-config.json`
  both still look healthy*. Re-run `infisical login` (browser, 60 s) before trusting
  any "not found" result from the CLI. Script:
  `python3 /tmp/vg-infisical-token.py` — writes `/tmp/.iftok`, 0600, never prints the value.
- `infisical export --path /web` needs `--projectId` unless the repo has been
  `infisical init`'d; the error reads like a missing folder. The script supplies
  the id by default.
- **A dead CLI session exits 1 with an interactive login prompt on stdout.** It never
  fails loudly, so `grep NAME` prints nothing and every missing key looks like
  "confirmed absent". Check the exit code, or the absence is not evidence.
- Vercel `sensitive` vars are write-only for everyone including the CLI. They can
  never be imported; they must be re-issued to enter Infisical at all.
- `vercel env ls --format json` prints a CLI banner before the JSON **and** may
  print more after it, so `json.loads(stdout)` fails with
  `Extra data: line N`. Decode one value with `raw_decode` starting at the first
  `[`.
- A sync's `POST .../sync-secrets` can return **HTTP 500** while the run itself
  still succeeds. A 500 is "unknown", not "failed" — poll `syncStatus` /
  `lastSyncedAt` before drawing a conclusion. This is the same Infisical-side
  flakiness previously seen on sync deletion.
- A preflight gate that cannot read its inputs must **fail**, not pass. An early
  version of the emptiness check printed a confident "GATE: clear" while every
  environment had failed to parse — it had zero data and still returned green.

## Dev Clerk webhook — configured, delivery UNVERIFIED (2026-09-28)

`CLERK_WEBHOOK_SIGNING_SECRET` now exists in Infisical `/web` **dev** and is synced
to Vercel `development`. It is a **distinct value per environment** (dev, staging,
prod each hold their own) because each points at a different Clerk instance —
do not copy one across.

**What is proven:** a correctly-signed payload reaches the handler and is accepted
— `200 ok` on `POST /api/webhooks/clerk` both on `127.0.0.1:3001` and through the
public cloudflared tunnel. The handler and the secret match.

**What is NOT proven:** a real Clerk delivery has **never arrived**. After a real
sign-in the dev log showed `0` Clerk-originated webhook POSTs and the tunnel
logged `0` inbound requests. The rows that appeared were written by the web-UI
JIT path, identifiable because the org row is a placeholder
(`name == clerk_org_id`, `slug = null`; `lib/auth/ctx.ts:53`). The webhook path
would have written a **real** org name via
`organizations.createOrganization()` (`lib/services/owner-home-org.ts:175`).

So: **configured ≠ delivered.** Next step is the Clerk dashboard delivery log.
Empty log = endpoint URL or instance wrong. Failed rows = secret mismatch.

### Why the webhook matters even though the web app works

For a web user it is nearly redundant — `requireCtx()` (`lib/auth/ctx.ts:35-55`)
JIT-upserts the mirror rows from the session's existing active org, so the web UI
is fully functional without it.

**iOS is the opposite.** `resolveApiV1Ctx` runs
`ctxFromMcpAuth(..., { provisionIfMissing: false })` (`lib/api/v1/auth.ts:68`) —
it refuses to auto-provision, and ClerkKit sign-in does not run the web JIT path.
The webhook is the **only** thing that creates a consumer's first Clerk org
(`ensureOwnerHomeOrganizationForClerkUser` step 5). No webhook ⇒ no org ⇒
`/api/v1` 401 for iOS, no matter how many Neon rows exist.

### Local dev checklist

- `DEMO_MODE` **must be `false`** or `resolveApiV1Ctx` short-circuits and returns
  `USR-0001` **before Clerk runs** (`lib/api/v1/auth.ts:32`) — the webhook fires,
  writes rows, and every request ignores them. A working webhook then looks broken.
- The signing secret must be in **`.env.local`**, not only in Infisical.
  `npm run env:sync dev` is the supported path; `LOCAL_ONLY_RE` preserves
  `DEMO_MODE`, `DEMO_ALLOW_WRITES`, `VERCEL_OIDC_TOKEN` (`scripts/sync-web-env.sh:29`).
  Symptom of missing it: correct signatures rejected with `400 bad signature`.
- Clerk cannot reach `localhost`. Needs a public URL —
  `npm run dev:tunnel` (cloudflared quick tunnel). The hostname changes on every
  restart, so re-paste it into the Clerk endpoint each time.
- **Dev shares a Neon branch with staging** (`ep-tiny-rice-…`). Rows written by a
  dev-Clerk webhook land in the staging dataset. Expected — don't treat them as
  disposable.
