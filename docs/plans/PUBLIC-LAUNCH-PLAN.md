# Valgate — Public Launch Plan

> **Written:** 2026-08-11 · **Branch:** `encryption` · **Base:** `origin/valgate-webapp-nextjs-v1.0.2`
>
> Full guide to take Valgate from its current post-MVP-cut state to a product that
> real members of the public can sign up for and use.
>
> Companion documents:
> - `docs/migration/PROD-DEPLOY-CHECKLIST.md` — the raw ops checklist (this plan supersedes and sequences it)
> - `openspec/changes/cut-to-mvp-core/tasks.md` — the MVP cut that created the current state
> - `docs/plans/IOS-APP-PLAN.md` — the iPhone app, which starts *after* this plan completes
>
> **Backend and ops steps are written for a beginner** — each one explains *what* it does and
> *why it exists* before telling you to run it. Frontend steps assume you already know the codebase.

---

## Table of contents

- [0. Where we are today](#0-where-we-are-today)
- [Phase 1 — Make the app usable](#phase-1--make-the-app-usable)
- [Phase 2 — Make the app launchable](#phase-2--make-the-app-launchable)
- [Phase 3 — Ship to production](#phase-3--ship-to-production)
- [Phase 4 — First week after launch](#phase-4--first-week-after-launch)
- [Appendix A — Environment variable reference](#appendix-a--environment-variable-reference)
- [Appendix B — Rollback plan](#appendix-b--rollback-plan)
- [Appendix C — Decisions you need to make](#appendix-c--decisions-you-need-to-make)

---

## 0. Where we are today

### Verified health of the branch

Everything below was actually run on 2026-08-11, not assumed:

| Check | Command | Result |
|---|---|---|
| Type safety | `npx tsc --noEmit` | ✅ 0 errors |
| Lint | `npm run lint` | ✅ 0 errors, 62 unused-variable warnings |
| Unit / integration tests | `npm run test` | ✅ 155 passed, 19 files |
| Production build | `npm run build` | ✅ succeeds, 23 routes emitted |
| End-to-end tests | `npm run test:e2e` | ⬜ not yet run (needs Node ≥ 24) |

Git position: **6 commits ahead of `origin/main`, 0 behind.** A clean fast-forward, so
`npm run promote` will work without a merge.

### What the product is now

The MVP cut (`5da1488f`) removed roughly 37,000 lines. What remains is a focused
single-owner property portfolio app:

| Area | Routes |
|---|---|
| Auth | `/login`, `/register`, `/forgot-password`, `/accept-invitation`, `/oauth-consent`, `/login/tasks` |
| Shell | `/` (home), `/portfolio`, `/rental`, `/settings`, `/profile` |
| Add property | `/add-property`, `/add-property/import`, `/add-property/import-tenants`, `/add-property/import-valuations` |
| Property detail | `/property/[id]` + `overview`, `location`, `documents`, `ownership`, `rental`, `valuation`, `edit` |
| Machine surface | `/mcp` (16 tools), `/.well-known/oauth-protected-resource/mcp` |
| Background | `/api/cron/cleanup-drafts` (nightly 04:00) |

Removed by the cut: the Pro/manager cockpit, AI chat overlay, analytics, compliance,
work orders, professional directory, estate planning, the schema diagram tool, and the
Fumadocs user manual.

### The core problem — RESOLVED 2026-08-12

**The app could not be logged into.** The cut deleted `app/launch/page.tsx` while leaving
`/launch` as the destination every authentication path redirected to.

**Fixed** in commits `c68771f6`, `4347e2e7`, `2717b4cf`, `cb72c663`. Independently verified
2026-08-12: `tsc` 0 errors, lint 0 errors, build green, and a live runtime check of every
route — `/`, `/app`, `/portfolio`, `/rental`, `/settings`, `/profile`, `/add-property`,
`/login`, `/register` all return 200; `/launch` and every cut route correctly 404.

---

## Phase 1 — Make the app usable ✅ COMPLETE

**Goal:** a person can sign up, get into the app, and never hit a 404 by clicking
something in the UI.

**Status:** done and verified 2026-08-12. Steps 1.1–1.3 below are retained as the record of
what changed and why; **the file:line tables describe the original defect, not work still to
do.** Step 1.4 (manual smoke test) is still worth running against a real Clerk session — the
runtime check above used DEMO_MODE, which bypasses Clerk and therefore does not exercise the
actual sign-in redirect.

⚠️ **The implemented landing route is `/app`, not `/` as originally specified below.** See the
note in Step 1.1. `/app` is the permanent authenticated home; `/` currently serves the same
page as a temporary alias until the marketing site takes the root.

---

### Step 1.1 — Restore the post-authentication landing path ✅ DONE (target changed to `/app`)

> **What actually shipped differs from this step as written.** The redirect target is **`/app`**,
> not `/`. A new `app/(shell)/app/page.tsx` is the permanent authenticated home, and `/` aliases
> it for now.
>
> This is the better call and supersedes the spec below: it lets the marketing page take `/` in
> Phase 2.1 without revisiting a single redirect target. Appendix C item 2 is decided accordingly.
>
> **Read every `→ "/"` in the table below as `→ "/app"`.** `ARCHITECTURE-PRIMER.md` and the code
> are the current truth.

#### What is broken

`/launch` used to be the "post-auth decider": after Clerk finished signing someone in, it
sent them to `/launch`, which read the database to work out whether they were a manager
(→ Pro cockpit) or an owner (→ portfolio), and then redirected accordingly.

The MVP cut deleted that page — correctly, since the Pro cockpit it decided between no
longer exists. But nothing updated the **seven** places that still point at it. The
production build's route table confirms `/launch` is gone, so every one of these produces
a 404.

#### Why it is safe to just delete the concept

`/launch` also did three pieces of real work, and you need to know these are covered
elsewhere before removing it:

1. **`upsertUser`** — creating the row in our own `users` table the first time a Clerk
   user appears. *Covered:* `lib/auth/ctx.ts:36` does this just-in-time on every request,
   and `app/api/webhooks/clerk/route.ts:41` does it on the `user.created` webhook.
2. **`ensureManagerHomeOrganizationForClerkUser`** — creating a manager's own org.
   *Covered:* the same Clerk webhook, at line 52.
3. **`completePendingHandoffsForUser`** — finishing a manager→client portfolio handoff.
   *Only mattered for the Pro flow, which is cut.*

So the redirect target can simply become `/` — the home page — with no loss of behaviour.

#### The changes

| File | Line | Change |
|---|---|---|
| `app/(auth)/_lib/resolve-redirect-url.ts` | 1 | `const DEFAULT_REDIRECT = "/launch"` → `"/"` |
| `app/layout.tsx` | 46 | `signInFallbackRedirectUrl="/launch"` → `"/"` |
| `app/layout.tsx` | 47 | `signUpFallbackRedirectUrl="/launch"` → `"/"` |
| `app/(auth)/login/_components/LoginPage.tsx` | 82 | `decorateUrl("/launch")` → `decorateUrl("/")` |
| `app/(auth)/register/_components/RegisterPage.tsx` | 163 | `decorateUrl("/launch")` → `decorateUrl("/")` |
| `app/(auth)/accept-invitation/_components/AcceptInvitationPage.tsx` | 44 | `decorateUrl("/launch")` → `decorateUrl("/")` |
| `app/(auth)/accept-invitation/_components/AcceptInvitationPage.tsx` | 105 | `router.replace("/launch")` → `router.replace("/")` |
| `app/(auth)/oauth-consent/_components/OAuthConsentPage.tsx` | 164 | `<Link href="/launch">` → `<Link href="/">` |
| `middleware.ts` | 100–105 | Replace the `/launch` redirect target with `/` |

For `middleware.ts`, the block currently builds a `/launch` URL and forwards
`redirect_url` through it. Since `/` is now the landing page, the whole special case can
collapse to redirecting to the resolved `redirect_url` if present, or `/` otherwise.

Also update the two stale comments that describe the old behaviour:
`middleware.ts:82-84` and `app/(shell)/layout.tsx:38`.

#### Verify

```bash
npx tsc --noEmit          # must stay at 0 errors
grep -rn "/launch" app lib components middleware.ts
# expected: no matches at all
```

Then start the dev server and manually sign in. **This is not optional** — a passing type
check does not prove the redirect chain works, and a broken login is invisible to `tsc`.

---

### Step 1.2 — Remove dead navigation to cut features 🔴 BLOCKER

Task 5.5 of the OpenSpec cut ("grep for orphaned imports and dangling links") was never
completed. These links all render in the UI today and all 404.

#### 1.2a — Command palette

`components/home/CommandPalette.tsx`, the `Navigate` array around lines 185–192.

Remove three entries:
- `{ label: "Analytics", path: "/analytics" }` — route deleted by the cut
- `{ label: "Succession Planning", path: "/estate-planning" }` — route deleted by the cut
- `{ label: "Map View", path: "/map" }` — **this route has never existed**, predating the cut

The surviving entries — Add Property, All Properties, Settings, Profile — match the real
route table. Also audit the palette's other command groups for anything referencing cut
features; the `Navigate` group is the one confirmed broken but is unlikely to be the only
place with stale entries.

#### 1.2b — The manager "Pro →" pill

`components/layout/AppHeader.tsx:66–75`. A pill linking to `/pro/dashboard`, rendered when
`isManager` is true.

There is no Pro cockpit any more, so delete the whole `{isManager && (...)}` block rather
than repointing it. Remove the now-unused `isManager` prop if nothing else in the
component consumes it.

#### 1.2c — The manager context banner and org switcher

Two files that exist only to move a manager between an owner org and the Pro cockpit:

- `components/layout/ManagerContextBanner.tsx` — mounted at `app/(shell)/layout.tsx:68`
- `lib/hooks/use-switch-org.ts` — its only consumer is that banner; `backToCockpit()`
  navigates to `/pro/dashboard` at line 29

Delete both files and the mount point in the shell layout. This is cleaner than repointing
`backToCockpit`, because with the cockpit gone there is nothing to switch *to*.

#### 1.2d — The Pro/account-type toggle in Settings

`app/(shell)/settings/_components/SettingsPage.tsx`, the "Account type" section around
lines 285–310. This is OpenSpec task 4.5, which was never done.

The toggle flips `is_manager` on the user, and its downgrade guard at line 300 pushes to
`/` if the user is inside `/pro`. In the MVP there is no Pro experience to switch into, so
a user who enables it gets an identical app plus a broken header pill.

Remove the section and the `setManagerMode` action wiring behind it. **Leave the
`is_manager` column and `lib/services/managers.ts` in place** — the Clerk webhook still
writes the flag, the MCP surface reads it, and you will want it back if the Pro cockpit
returns.

#### Verify

```bash
npx tsc --noEmit
npm run lint
grep -rnoE '"/(pro|analytics|compliance|directory|estate-planning|work-orders|activity|dbdiagram|docs|launch|map)[^"]*"' app components lib
# expected: only comments, or nothing
```

---

### Step 1.3 — Re-enable build-time safety nets 🟡

#### What is wrong

`next.config.ts` currently contains:

```ts
eslint:      { ignoreDuringBuilds: true },
typescript:  { ignoreBuildErrors: true },
```

These tell Next.js "build even if the code does not type-check." They exist as an escape
hatch from the backend migration, when ~438 type errors were an expected work-in-progress.

Today `tsc` is clean, so they are protecting nothing — but they mean **Vercel will happily
deploy broken code**. Given that migration drift already took production down once, this
is a safety net worth having back.

#### The change

Remove `typescript.ignoreBuildErrors` so the build fails on type errors.

Keep `eslint.ignoreDuringBuilds: true` for now. You have 62 lint warnings; flipping this
turns a green build red for cosmetic unused-variable issues. Clear the warnings in Phase 4,
then flip it.

#### Verify

```bash
npm run build   # must still succeed with the flag removed
```

If it fails, that failure is real and was previously being hidden. Fix it before moving on.

---

### Step 1.4 — Manual smoke test

Automated checks cannot see a broken redirect chain. Run the app and do this by hand:

```bash
npm run dev     # http://localhost:3001
```

1. Sign up with a **fresh** email address → you land on `/`, not a 404
2. The sidebar shows exactly: Home, Portfolio, Rental, Settings
3. Open the command palette (⌘K) → every Navigate entry leads to a real page
4. Add a property, including a photo upload → it saves and appears in the portfolio
5. Open the property → all seven tabs render without error
6. Sign out → sign back in → you land on `/` again
7. Visit `/settings` → no Pro toggle, no broken controls

Any failure here is a Phase 1 bug. Do not proceed to Phase 2 with an open item.

---

## Phase 2 — Make the app launchable

**Goal:** the things a stranger on the internet needs, which an internal tool never did.

**Estimated effort:** 1–2 days, dominated by writing the landing page and legal copy.

---

### Step 2.1 — A public landing page 🟡

#### What is missing

Every page under `app/(shell)/` calls `requireCtx()` and is therefore behind
authentication. `app/(shell)/layout.tsx` also sets `export const dynamic = "force-dynamic"`.

The practical consequence: a signed-out visitor to `www.valgate.co` sees a login form and
nothing else. No explanation of what Valgate is, no reason to sign up.

#### The work

Create a public marketing route outside the `(shell)` group — e.g. `app/(marketing)/page.tsx`
with its own layout — and add its path to `isPublicRoute` in `middleware.ts` so
`auth.protect()` does not intercept it.

Content, at minimum: what Valgate does, who it is for, two or three screenshots, and a
prominent "Get started" that goes to `/register`.

**What `/` resolves to is already decided — Option A.** The authenticated home is `/app`
(shipped in Step 1.1), and `/` currently serves the same page only as a temporary alias.

So this step is now a straight substitution rather than a decision:

1. Build the marketing page and let it take over `/`
2. Delete the `/` alias in `app/(shell)/page.tsx` — `/app` is already the redirect target
   everywhere, so **no redirect target needs revisiting**
3. Add `/`, `/privacy` and `/terms` to `isPublicRoute` in `middleware.ts`
4. Have the middleware send signed-in visitors from `/` to `/app`

This is your area of expertise — no further prescription on the page itself.

#### Verify

Load the site in a private browsing window. You should see the landing page, not a login
form.

---

### Step 2.2 — Privacy policy and terms of service 🟡

#### Why this is not optional

Valgate stores real names, postal addresses, property valuations, ownership records and
uploaded legal documents. That is personal and financial data belonging to identifiable
people. Publishing a service that collects it without a privacy policy is a legal exposure,
and Clerk, Resend and any future payment provider all expect these pages to exist.

#### The work

Two static routes — `/privacy` and `/terms` — added to `isPublicRoute` in `middleware.ts`,
and linked from both the landing page footer and the sign-up form.

The privacy policy needs to state, at minimum: what data you collect, why, where it is
stored (Neon in your chosen region, S3 for documents), who it is shared with (your
sub-processors: Clerk, Neon, AWS S3, Resend, OpenAI, Mapbox, Vercel), how long you keep
it, and how a user requests deletion.

⚠️ **The OpenAI sub-processor disclosure matters more than the others.** Document scanning
and AI summaries send user-uploaded document content to OpenAI. Users must be told this
before they upload their title deeds.

Get these reviewed by someone qualified. A template is a starting point, not a substitute.

---

### Step 2.3 — Run the end-to-end suite

#### What this is

Playwright drives a real browser through real user journeys — the only automated check
that would have caught the `/launch` breakage.

#### Running it

The suite has a known constraint: **it needs Node 24 or newer.** Node 22 combined with
Playwright 1.61 hits a module-loader bug. Check with `node --version` and switch with
`nvm use 24` if needed.

```bash
npm run dev:e2e     # terminal 1 — demo-mode server, no Clerk
npm run test:e2e    # terminal 2
```

There is also a real-Clerk variant that exercises actual sign-in:

```bash
npm run dev:e2e-auth    # terminal 1, port 3002
npm run test:e2e:auth   # terminal 2
```

⚠️ **Never run `npm run seed:reset`.** It destroys the evolved seed data that the whole
local demo depends on, and it is not recoverable.

#### Known open findings

Two issues were previously identified and may still be live: document deletion is not
role-gated, and `/pro` org-scoping was never verified (now moot — `/pro` is deleted).
Confirm whether the document-deletion gap still exists; it is a real authorization hole
if so.

---

### Step 2.4 — Decide the fate of the MCP surface ⚠️

`/mcp` survived the cut intact — 16 tools, OAuth, rate limiting. But its in-app entry
point was the "AI assistant" section of Settings, which may have been removed by the cut.

You have three choices:

- **Keep and expose it** — verify the Settings entry point still exists, and include the
  MCP connection test in Phase 3's smoke test.
- **Keep but hide it** — leave `/mcp` functional for your own use, remove any UI pointing
  at it. Lowest effort, no user-facing risk.
- **Cut it** — delete `app/mcp/`, `app/.well-known/`, `mcp-server/`, and the MCP entries
  in `middleware.ts`. Smallest attack surface.

**Recommendation: keep but hide.** It works, it costs nothing to leave running, and it is
not part of the consumer story you are launching. Revisit once you have users.

Whatever you choose, this affects the Phase 3 environment variables — see Appendix A.

---

## Phase 3 — Ship to production

**Goal:** the code is live on `www.valgate.co` and a real person can sign up.

**Estimated effort:** half a day of hands-on work, plus DNS propagation waiting time
(typically minutes, occasionally hours).

⚠️ **Read the whole phase before starting any of it.** The steps are ordered by dependency
and doing them out of order will cost you a redeploy.

---

### Step 3.0 — Confirm what is currently in production ⚠️ DECISION REQUIRED

Notes from earlier work say production is **already live** at `www.valgate.co`, running
the *pre-cut* application — Pro cockpit, AI overlay, analytics and all.

If that is accurate, then deploying this branch is **not a launch. It is a feature removal
on a live site.** Anyone currently using the Pro cockpit or the AI chat loses them without
warning.

Before doing anything else:

1. Open the Vercel dashboard and confirm which commit production is serving.
2. Check whether any real accounts exist beyond your own test accounts.
3. If there are real users on Pro features, decide: notify them, or hold the deploy.

Do not skip this. It is the difference between a launch and an outage.

---

### Step 3.1 — Rotate the production database password 🔒 DO THIS FIRST

#### Why

The production `DATABASE_URL` was pasted into a chat window at some point, which means it
must be assumed compromised. That connection string grants full read/write access to every
user's data.

#### How

1. Neon dashboard → project `summer-cloud-22226501` → the **production** branch
   (`ep-aged-cloud-aohhlwhs`)
2. Reset the password
3. Copy the new **pooled** connection string — pooled, not direct. Pooled connections are
   required for serverless environments like Vercel, where each request may start a fresh
   function instance; without pooling you exhaust the database's connection limit.
4. That new string is what goes into Vercel in Step 3.4. Do not paste it anywhere else.

---

### Step 3.2 — Create the Clerk production instance 🔒 CRITICAL PATH

#### Why a separate instance

Clerk gives you a development instance (`pk_test_…` / `sk_test_…`) and a production
instance (`pk_live_…` / `sk_live_…`). They are entirely separate: separate user databases,
separate settings. The dev instance also has behaviours unsuitable for real users — it
injects a "development mode" banner, and it rewrites some unauthenticated requests to
`/404` instead of the sign-in page, which is what broke the OAuth consent screen before.

This is the **longest-lead item** in the whole plan because it requires DNS changes.
Start it first, then do other steps while records propagate.

#### How

1. Clerk dashboard → create the production instance for your application
2. Add the DNS records Clerk gives you for `clerk.valgate.co` at your domain registrar
3. Wait for Clerk to verify them (usually minutes)
4. Copy the `pk_live_…` and `sk_live_…` keys — these go into Vercel in Step 3.4
5. Create a **webhook** on the production instance:
   - Endpoint: `https://www.valgate.co/api/webhooks/clerk`
   - Events: `user.*`, `organization.*`, `organizationMembership.*`
   - Copy the signing secret → `CLERK_WEBHOOK_SIGNING_SECRET`
   - The webhook keeps our `users` table in sync with Clerk. Just-in-time sync in
     `lib/auth/ctx.ts` covers first sign-in even without it, so this is not blocking, but
     without it user *updates* and *deletions* never reach our database.
6. If you kept the MCP surface (Step 2.4): set the **custom consent screen URL** to
   `https://www.valgate.co/oauth-consent`. This is what makes the "allow access" step
   Valgate-branded instead of showing Clerk's default.

---

### Step 3.3 — Point the domain at Vercel

1. Vercel → project → Domains → add `www.valgate.co`
2. Add the DNS records Vercel specifies at your registrar
3. Wait for the certificate to be issued

Note that `NEXT_PUBLIC_APP_URL` (next step) must match this exactly, including the `www`.
It is used to build absolute links in outbound emails; a mismatch sends users to a URL
that does not resolve.

---

### Step 3.4 — Set production environment variables 🔒

In Vercel → Settings → Environment Variables, **Production scope only**.

The full table is in [Appendix A](#appendix-a--environment-variable-reference). Read it
rather than working from memory — several of these fail silently rather than loudly.

The three that fail *silently* and so are easiest to miss:

- **`CRON_SECRET`** — without it the nightly draft-cleanup cron returns 401. Nothing
  breaks visibly; abandoned drafts and their S3 objects simply accumulate forever.
- **`UPSTASH_REDIS_REST_URL` / `_TOKEN`** — without these, rate limiting falls back to an
  in-memory limiter. On serverless, each function instance has its own memory, so the
  limit is effectively per-instance and provides almost no protection.
- **`OPENAI_API_KEY`** — without it, document scanning and AI summaries fail at the point
  of use, not at build time.

Also confirm the **production** S3 IAM key has `s3:DeleteObject`. This was verified on the
development key only. Without it on production, deleting a document removes the database
row but orphans the file in the bucket — you pay for storage forever and the data is not
actually deleted, which undercuts any deletion promise in your privacy policy.

---

### Step 3.5 — Run the database migrations 🔴 THE STEP THAT CAUSED THE LAST OUTAGE

#### What migrations are and why this is manual

A migration is a versioned SQL file describing a schema change — adding a column, creating
a table. The repository has 29 of them in `drizzle/`, currently through
`0024_property_cover_storage_id`. Drizzle tracks which have been applied in the database
itself.

**Vercel does not run migrations on deploy.** There is no build step that does it. If you
deploy code expecting column `X` to a database that does not have it, every query touching
that table throws — which on 2026-07-14 meant every authenticated page returned a 500.

#### How

```bash
# 1. Confirm you can reach the production database
DATABASE_URL="<rotated pooled string>" npm run db:ping

# 2. Apply any pending migrations
DATABASE_URL="<rotated pooled string>" npx drizzle-kit migrate

# 3. Verify the schema actually matches
DATABASE_URL="<rotated pooled string>" npm run db:assert
```

⚠️ **Never run `seed:neon` or `seed:reset` against production.** Production launches empty
by design — real users create their own data. The seed script is single-tenant and
destructive: it claims `ORG-0001` and will hijack an existing account.

⚠️ **Verify the result, do not trust the exit code.** There is a known ordering trap: a
hand-authored migration with a `when` timestamp larger than the migration after it causes
Drizzle to *silently skip* the later one. Check the live schema directly (Neon dashboard
or the Neon MCP tools) and confirm the columns you expect are actually there. A "Failed
query" error after deploy is usually a genuinely missing column, not a transient fault.

---

### Step 3.6 — Deploy

```bash
npm run promote     # fast-forwards origin/main to this branch
```

The `promote` script refuses to run if `main` has commits this branch does not — as of
2026-08-11 it does not, so this is a clean fast-forward.

Watch the Vercel build log. With `typescript.ignoreBuildErrors` removed in Step 1.3, a
type error will now correctly fail the build rather than shipping.

---

### Step 3.7 — Production smoke test

Do this on the real domain, in a private browsing window, with a real email address:

1. Visit `https://www.valgate.co` → the landing page loads, no development banner
2. `/privacy` and `/terms` load while signed out
3. Sign up with a fresh real email → verification email arrives → you land on the app home
4. Add a property including a photo → it saves, the photo displays (proves S3 works)
5. Upload a document → it saves and opens (proves S3 and the presigned upload path work)
6. Sign out, sign back in → you land in the right place
7. Check the Neon dashboard → your user and property rows exist
8. If you kept MCP exposed: connect Claude to `https://www.valgate.co/mcp`, confirm the
   consent screen is Valgate-branded, and run one read and one write

Any failure here is a rollback trigger — see [Appendix B](#appendix-b--rollback-plan).

---

## Phase 4 — First week after launch

Not blocking, but do not let these slide indefinitely.

| Item | Why it matters |
|---|---|
| **Error monitoring** | You currently have no way to know a user hit an error. Sentry is the obvious choice; a connector exists but needs authorizing. Without this you find out about breakage from users, or not at all. |
| **Clear the 62 lint warnings, then enable `eslint.ignoreDuringBuilds: false`** | Completes the safety net started in Step 1.3. |
| **Row Level Security (RLS)** | Postgres-enforced data isolation, so a bug in application code cannot leak one user's data to another. Currently isolation is enforced only in the service layer. Plan exists at `docs/migration/RLS-PLAN.md`; needs `DATABASE_AUTHENTICATED_URL`. Meaningful defence in depth once real users share a database. |
| **Confirm the document-deletion authorization gap** | Flagged by an earlier E2E pass as not role-gated. If real, any member could delete another's documents. Verify and fix. |
| **Tighten `MCP_ALLOW_ANY_OAUTH_CLIENT`** | If MCP is exposed, this flag accepts *any* valid OAuth client in your Clerk instance. Once you know which clients you need, list them in `MCP_ALLOWED_OAUTH_CLIENT_IDS` and turn the flag off. |
| **Archive the OpenSpec change** | `openspec/changes/cut-to-mvp-core/tasks.md` shows 0 of 24 tasks checked despite most being done. Reconcile it and move to `openspec/changes/archive/`. |
| **Rename the branch** | `encryption` contains no encryption work. Misleading for anyone reading the history later. |

---

## Appendix A — Environment variable reference

Vercel → Settings → Environment Variables → **Production** scope.

### Required — the build fails without these

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | rotated **pooled** Neon string | 🔒 from Step 3.1 |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | your Mapbox token | public by design; property maps break without it |

### Required for the app to actually function

| Variable | Value | Consequence if missing |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_…` | no authentication |
| `CLERK_SECRET_KEY` | `sk_live_…` 🔒 | no authentication |
| `CLERK_WEBHOOK_SIGNING_SECRET` | from Step 3.2 🔒 | user updates/deletions never sync to our DB |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/login` | Clerk sends users to its hosted portal instead of your pages |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/register` | as above |
| `NEXT_PUBLIC_APP_URL` | `https://www.valgate.co` | email links point nowhere |
| `STORAGE_BUCKET` / `STORAGE_REGION` | production bucket | no photo or document uploads |
| `STORAGE_ACCESS_KEY_ID` / `STORAGE_SECRET_ACCESS_KEY` | production IAM 🔒 | as above — **confirm `s3:DeleteObject`** |
| `RESEND_API_KEY` | production key 🔒 | no outbound email |
| `RESEND_FROM_EMAIL` | address on a **verified** domain | email silently rejected |
| `OPENAI_API_KEY` | production key 🔒 | document scan + AI summaries fail at use |

### Silent failures — easy to miss

| Variable | Value | Consequence if missing |
|---|---|---|
| `CRON_SECRET` | `openssl rand -hex 32` 🔒 | cleanup cron 401s; drafts and S3 objects accumulate forever |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | production Upstash 🔒 | rate limiting degrades to per-instance memory — near useless on serverless |
| `RESEND_WEBHOOK_SECRET` | from Resend 🔒 | email bounces never recorded |

### Only if the MCP surface stays exposed (Step 2.4)

| Variable | Value | Notes |
|---|---|---|
| `MCP_ALLOW_ANY_OAUTH_CLIENT` | `true` 🔒 | **required** for Claude to connect. Claude registers dynamically, so its client id cannot be allowlisted ahead of time; in production the endpoint fails closed without this opt-in. Tradeoff: accepts any valid OAuth client in your Clerk instance. |

### Must be omitted or false in production

| Variable | Why |
|---|---|
| `DEMO_MODE` | bypasses authentication entirely and returns a fixed demo context. The code refuses it in production, but do not set it. |
| `DEMO_ALLOW_WRITES` | as above |
| `SITE_PASSWORD` | the preview-only gate; must not be set in production |
| `MCP_ALLOW_WRITES` / `MCP_CONFIRM_SECRET` | no longer read anywhere since `/api/mcp` was removed |

---

## Appendix B — Rollback plan

If the production smoke test fails badly:

1. **Vercel → Deployments → the previous working deployment → Promote to Production.**
   This reverts the *code* in under a minute.

2. **Migrations do not roll back with it.** If Step 3.5 applied a migration and you then
   revert the code, the database is now *ahead* of the code. This is usually harmless —
   extra columns do not break older queries — but a migration that *dropped* or *renamed*
   something will break the reverted code. Check what the pending migrations actually did
   before assuming a code revert is sufficient.

3. **Rotated credentials do not roll back either.** Once you rotate the database password
   in Step 3.1, the old string is dead. Any environment still holding it — a preview
   deployment, a local `.env.local` — breaks until updated.

Ordering these deliberately: rotate the password *before* the deploy (Step 3.1), so a
rollback never lands you on a dead credential.

---

## Appendix C — Decisions you need to make

These are yours, not mine. Each one changes the work.

| # | Decision | Recommendation |
|---|---|---|
| 1 | **Is production currently live with the pre-cut app, and are there real users on Pro features?** | Check Vercel and Neon before anything else. This determines whether Phase 3 is a launch or a migration. Blocking. |
| 2 | ~~**Does `/` serve marketing or the app?**~~ ✅ **DECIDED 2026-08-12** | **Marketing at `/`, app at `/app`.** Already implemented: `/app` is the permanent authenticated home and every post-auth redirect targets it. `/` serves the same page as a temporary alias until the marketing page replaces it in Step 2.1. Nothing further to decide; do not reopen without changing the redirect targets too. |
| 3 | **Keep, hide, or cut the MCP surface?** (Step 2.4) | Keep but hide. It works, costs nothing to run, and is not part of the consumer story. |
| 4 | **Who reviews the privacy policy and terms?** (Step 2.2) | Someone qualified. You are storing identifiable financial and property data and sending document contents to OpenAI. |
| 5 | **Does encryption-at-rest need to happen before launch?** | The branch is named `encryption` but contains none. Neon encrypts at rest by default and S3 can be configured to; application-level field encryption is a much larger project. If it was a launch requirement, say so — it is not in this plan and would add substantially to it. |

---

## Summary

| Phase | Work | Effort | Status |
|---|---|---|---|
| **1** | Fix `/launch`, remove dead links, restore type-check gate, smoke test | ~half a day | ✅ **DONE** — verified 2026-08-12 |
| **2** | Landing page, privacy + terms, E2E run, MCP decision | 1–2 days | ⬜ Next. Unblocked |
| **3** | Rotate password, Clerk prod, domain, env vars, migrate, deploy, smoke test | ~half a day + DNS wait | 🔴 **Blocked on Appendix C item 1** |
| **4** | Monitoring, lint cleanup, RLS, authz fix, housekeeping | ongoing | ⬜ Post-launch |

**Remaining: 2–3 days of focused work.** The critical path runs through the Clerk production
instance in Step 3.2, because of DNS — start that early and do other work while it propagates.

**The one open question is Appendix C item 1: is production currently live with the pre-cut
app?** Nobody has checked. If it is, Phase 3 is a feature removal on a live site rather than a
launch, and needs a comms plan before it runs. Everything else is unblocked.

### Known, deliberately not fixed

- `tests/authz/manager-act-on-behalf.db.test.ts` and `tests/authz/parity-registry.db.test.ts` fail
  with a 5s timeout. **Pre-existing** — verified by running them at `e299e466`, before any
  Phase 1 work. Not a regression; do not chase it as one.
- `lib/actions/ai-overlay-utils.ts` and `lib/data/derivations/ai-context.ts` still reference
  `/pro`. Nothing imports `ai-overlay-utils.ts` — orphaned by the MVP cut, not user-facing.
