# Neon RLS (Row-Level Security) — Implementation Plan

> Go-live **item 5** (defense-in-depth). Parked, to be executed **after Clerk is live (item 1)
> and after the first deploy** — RLS is the only item that cannot be tested in DEMO_MODE
> (no Clerk JWT exists there). This doc is the ready-to-execute plan; nothing here is built yet.

---

## 0. Why this exists (one paragraph)

Every org's data lives in one shared database. Org A must never read or write Org B's rows.
**Today that is already enforced in application code** — every service query is scoped
`WHERE org_id = ctx.orgId` (e.g. `lib/services/properties.ts:16`). RLS adds a **second, database-level
lock**: even if a query ever forgot its `org_id` filter, Postgres itself would refuse to return
another org's rows. It protects against our own future mistakes. It is **not** a prerequisite for a
secure launch — it is hardening.

### What makes our case non-standard (read this before touching anything)

Standard Neon+Clerk RLS tutorials assume your rows store the **Clerk** user id (`user_…`).
**Ours don't.** Our tables store **internal** ids (`ORG-0001`, `USR-0001`). The `organizations`
table maps Clerk's `clerk_org_id` (`org_…`) ↔ our `id` (`ORG-0001`); `users` maps
`clerk_user_id` ↔ `id`. The Clerk JWT carries Clerk ids. So policies **cannot** be the textbook
`org_id = auth.user_id()`. They must translate the JWT's Clerk org id into our internal org id.
We solve this with **one helper function** (Phase 2) so every policy stays a clean one-liner.

### How enforcement actually works (the architecture)

| Connection | Role | RLS? | Used for |
|---|---|---|---|
| `DATABASE_URL` (today's only one) | `neondb_owner` | **bypassed** (owners are above RLS) | migrations, identity sync, counters, webhooks |
| `DATABASE_AUTHENTICATED_URL` (new) | `authenticated` (no BYPASSRLS) | **enforced** | the live per-request domain reads/writes |

Adding policies changes nothing until traffic is routed through the **authenticated** connection
with the user's Clerk token attached. That routing (Phase 4–5) is the real work; everything before
it is safe and invisible to the running app because the owner connection ignores RLS.

### Sources (Context7 / Neon docs, fetched 2026-06-18)
- RLS query execution (self-verify + `set_config`, Pool driver): https://neon.com/docs/guides/rls-query-execution
- Drizzle `crudPolicy` / `authenticatedRole` / `authUid`: https://neon.com/docs/data-api/get-started
- Authenticated role + grants: https://neon.com/docs/data-api/access-control
- Clerk as JWT provider / JWKS endpoint: https://neon.com/docs/auth/guides/plugins/jwt
- `$withAuth` deprecation note: https://neon.com/docs/changelog/2024-12-20

---

## Design decisions (locked before coding)

1. **Mapping via helper function.** Create `auth.current_org_id()` — a `SECURITY DEFINER` SQL
   function that reads the Clerk `org_id` claim and returns our internal `ORG-….` Every domain
   policy becomes `org_id = auth.current_org_id()`. One indexed lookup, evaluated once per query.
2. **Scope by active org, exactly like `requireCtx`.** We trust the JWT's `org_id` claim (the
   user's *active* Clerk org), mirroring how the app already derives `ctx.orgId`. Same boundary,
   now enforced twice.
3. **Owner keeps infrastructure writes.** Identity sync (`identity-sync.ts`), counter allocation
   (`counters`), and webhooks stay on the **owner** connection. Only **domain** CRUD moves to the
   authenticated connection. This avoids granting the `authenticated` role power over plumbing
   tables and sidesteps RLS-recursion on identity tables.
4. **Self-verify the JWT** with `jose` against Clerk's JWKS, then `set_config('request.jwt.claims', …)`
   inside a transaction — required because we use the `neon-serverless` **Pool** driver
   (`lib/db/client.ts:3`) and `$withAuth` is deprecated.
5. **Fail closed.** A missing/invalid token or a transaction error must **deny**, never fall back to
   the owner connection. (Mirrors the existing `allowed()` fail-closed posture in `lib/ratelimit.ts:43`.)

---

## Phase 0 — Prerequisites & claim verification

**Goal:** confirm the ground is ready; lock the exact JWT claim names. No code yet.

**Blocked until:** item 1 (Clerk) is live and you can sign in with a real account in a non-prod env
with `DEMO_MODE=false`.

**Steps**
1. Stand up a test environment (local or a Vercel preview) with `DEMO_MODE=false` and real Clerk
   keys, signed into a real org.
2. Capture a real session token and decode it (jwt.io or `console.log(await (await auth()).getToken())`).
   **Confirm these claims exist:** `sub` (Clerk user id), `org_id` (active Clerk org), `org_role`.
   - If `org_id` is absent, enable it via Clerk → **Sessions → Customize session token**, adding
     `{"org_id": "{{org.id}}"}` (or switch to a named JWT template and use it in Phase 4).
3. Note Clerk's **JWKS URL** and **issuer** (Clerk dashboard → API Keys → Show JWT public key /
   `https://<your-clerk-frontend-api>/.well-known/jwks.json`). Issuer = that URL's origin.

**Done when:** you have a decoded token proving `sub` + `org_id` are present, and the JWKS URL + issuer recorded.

**Risk/rollback:** none — read-only investigation.

---

## Phase 1 — Neon: enable RLS, create the `authenticated` role, grants, second URL

**Goal:** infrastructure only. The app keeps running on the owner connection throughout.

**Do this on the `dev` branch first**, prove it, then repeat on `production` in Phase 7.

**Steps**
1. Neon Console → your project → **Authorize / RLS** → add an auth provider → **Clerk** → paste the
   JWKS URL from Phase 0. This makes Neon create the `authenticated` role and the `auth.*` helper
   schema (`auth.user_id()`, `auth.session()`).
2. Verify/append grants so the role can do domain CRUD but nothing more (run in Neon SQL editor as owner):
   ```sql
   -- role exists from step 1; ensure no LOGIN-bypass and scope its powers
   GRANT USAGE ON SCHEMA public TO authenticated;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public
     GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
   -- lock down plumbing the authenticated role must NOT touch (owner-only):
   REVOKE ALL ON TABLE counters FROM authenticated;
   ```
   > We grant broadly then rely on **RLS policies** (Phase 3) to constrain *rows*. Tables with no
   > policy + RLS enabled = deny-all for `authenticated`, which is the safe default.
3. Get the **authenticated connection string** (Neon → Connect → role `authenticated`, **pooled**).
   This becomes `DATABASE_AUTHENTICATED_URL`. It already exists as an optional env var
   (`lib/env.ts:28`) — no schema change needed.

**Done when:** `psql "$DATABASE_AUTHENTICATED_URL" -c "select current_user"` returns `authenticated`,
and `select auth.user_id()` resolves (returns null with no token set — that's fine).

**Risk/rollback:** none to the app (owner connection untouched). To undo: drop the role / remove the provider.

---

## Phase 2 — The mapping helper function (custom SQL migration)

**Goal:** translate Clerk `org_id` → internal `ORG-….` Hand-written because Drizzle won't generate it.

Create a custom migration (`npx drizzle-kit generate --custom --name rls_auth_helpers`) containing:

```sql
-- Reads the Clerk org id from the verified JWT claims and returns our internal org id.
-- SECURITY DEFINER so it can read `organizations` even though that table has RLS (no recursion).
CREATE OR REPLACE FUNCTION auth.current_org_id() RETURNS text
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT o.id
    FROM organizations o
    WHERE o.clerk_org_id = (current_setting('request.jwt.claims', true)::json ->> 'org_id')
$$;

REVOKE ALL ON FUNCTION auth.current_org_id() FROM public;
GRANT EXECUTE ON FUNCTION auth.current_org_id() TO authenticated;
```

**Why `SECURITY DEFINER`:** the function runs with the owner's privileges, so its internal lookup on
`organizations` isn't itself filtered by RLS — preventing infinite recursion when an `organizations`
policy calls this function. `STABLE` lets Postgres evaluate it once per statement (an InitPlan), so
it's cheap. The lookup hits the existing unique index `uq_org_clerk` (`identity.ts:17`).

**Test (as authenticated, simulating a token):**
```sql
SELECT set_config('request.jwt.claims', '{"sub":"user_x","org_id":"org_REAL"}', true);
SELECT auth.current_org_id();  -- expect the matching ORG-…. id, or NULL if org_id unknown
```

**Risk/rollback:** isolated function; `DROP FUNCTION auth.current_org_id()` to revert.

---

## Phase 3 — Policies in the Drizzle schema (+ enable RLS)

**Goal:** declare the rules in code, generate the migration, apply to **dev** first. Owner still bypasses, so the app keeps working.

### 3a. The 27 domain tables — uniform policy

Every domain table has `org_id text NOT NULL` (verified: `db:assert` → "org_id NOT NULL on all domain
tables — 27/27"). Add the **same** policy to each, e.g. `lib/db/schema/property.ts`:

```ts
import { sql } from "drizzle-orm";
import { crudPolicy, authenticatedRole } from "drizzle-orm/neon";

export const properties = pgTable("properties", {
  /* …existing columns unchanged… */
}, (t) => [
  /* …existing indexes… */
  crudPolicy({
    role: authenticatedRole,
    read:   sql`${t.orgId} = auth.current_org_id()`,
    modify: sql`${t.orgId} = auth.current_org_id()`,  // covers INSERT/UPDATE/DELETE (USING + WITH CHECK)
  }),
]);
```

Repeat for all 27 domain tables across `property.ts`, `documents.ts`, `ownership.ts`, `people.ts`,
`rental.ts`, `safety.ts`, `estate.ts`, `verification.ts`, `notifications.ts`, `ai.ts`.
> ponytail: 27 identical policy blocks is fine — a shared `orgScopedPolicy(t.orgId)` helper is the
> only DRY worth adding; don't abstract further.

### 3b. The identity tables — bespoke **read-only** policies

These have no `org_id` column / different shapes, and are **written only by the owner connection**
(identity sync). The `authenticated` role needs **read** access for joins:

- `organizations`: `read: sql\`id = auth.current_org_id()\`` — no `modify` (owner-only writes).
- `organization_memberships`: `read: sql\`org_id = auth.current_org_id()\`` — no `modify`.
- `users`: read users who share your org —
  `read: sql\`id IN (SELECT user_id FROM organization_memberships WHERE org_id = auth.current_org_id())\``
  — no `modify`.

### 3c. Plumbing tables — deny-all for authenticated

`counters` (and any non-domain helper table): **enable RLS, add no policy** → automatic deny-all for
`authenticated`. Grants were revoked in Phase 1. These run on the owner connection only.

### 3d. Generate + apply
```sh
npm run db:generate                 # drizzle emits enableRLS + CREATE POLICY statements
# review the generated SQL by eye — confirm one policy per table + RLS enabled everywhere
DATABASE_URL="<dev-branch-url>" npm run db:migrate
```

**Test on dev (owner still works, authenticated now constrained):**
```sql
-- as authenticated with a fake org A token:
SELECT set_config('request.jwt.claims', '{"sub":"user_a","org_id":"org_A"}', true);
SELECT count(*) FROM properties;   -- expect ONLY org A's rows
SELECT set_config('request.jwt.claims', '{"sub":"user_b","org_id":"org_B"}', true);
SELECT count(*) FROM properties;   -- expect ONLY org B's rows; zero overlap
```

**Risk:** if a policy is wrong, the *authenticated* role sees wrong/zero rows — but the **app still
runs on owner**, so users are unaffected. Rollback: revert the migration (drop policies / disable RLS).

---

## Phase 4 — `authed-client.ts` (request-scoped authenticated db)

**Goal:** a helper that runs a callback against the authenticated connection with the current user's
Clerk JWT injected. New file `lib/db/authed-client.ts`:

```ts
import "server-only";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import { createRemoteJWKSet, jwtVerify } from "jose";
import ws from "ws";
import { env } from "@/lib/env";
import * as schema from "@/lib/db/schema";

neonConfig.webSocketConstructor = ws;

// One pool for the authenticated role, reused across requests.
const authedPool = new Pool({ connectionString: env.DATABASE_AUTHENTICATED_URL });
const authedDb = drizzle(authedPool, { schema });

const JWKS = createRemoteJWKSet(new URL(env.CLERK_JWKS_URL));   // add to lib/env.ts

// Verify the Clerk token, then run `fn` inside a tx with claims injected so RLS sees them.
export async function withAuthedDb<T>(token: string, fn: (tx: typeof authedDb) => Promise<T>): Promise<T> {
  const { payload } = await jwtVerify(token, JWKS, { issuer: env.CLERK_JWT_ISSUER });
  if (!payload.sub) throw new Error("unauthenticated");        // fail closed
  return authedDb.transaction(async (tx) => {
    await tx.execute(sql`select set_config('request.jwt.claims', ${JSON.stringify(payload)}, true)`);
    return fn(tx as typeof authedDb);
  });
}
```

Add to `lib/env.ts`: `CLERK_JWKS_URL` (z.string().url()) and `CLERK_JWT_ISSUER` (z.string().url()),
both optional until RLS is on. (`DATABASE_AUTHENTICATED_URL` already exists.)

**Get the token** in `requireCtx` / actions via Clerk: `const token = await (await auth()).getToken();`
Thread it into the call (see Phase 5).

**Test:** unit-call `withAuthedDb(realToken, (tx) => tx.select().from(properties))` in the test env;
expect only the caller's org rows. Invalid token → throws (fail closed).

**Risk:** isolated new file; nothing imports it yet.

---

## Phase 5 — Route the domain service layer through the authenticated db (the big rewire)

**Goal:** make live domain reads/writes use `withAuthedDb` instead of the owner `db`. **Incremental,
one domain at a time**, starting with `properties` as the proof.

**Approach (least-invasive):**
1. `requireCtx()` additionally returns the **token** (or stash it on `Ctx`). Counter allocation and
   identity sync continue to import the owner `db` directly — unchanged.
2. For the chosen domain, change its service functions to accept the authed `tx` (or call
   `withAuthedDb(token, …)` at the action boundary and pass `tx` down). Keep signatures explicit.
3. **Counter allocation stays on owner.** When creating a row, allocate the id via the existing
   owner-connection counter helper, then `INSERT` the row via the authed `tx` (RLS checks `org_id`
   on WITH CHECK). One create = one owner call (counter) + one authed tx (insert). Document this.
4. Prove org-isolation for `properties` (Phase 6 tests), then roll the same pattern to the other
   domains (`documents`, `ownership`, `people`, `rental`, `safety`, `estate`, `verification`,
   `notifications`, `ai`).

**Test after each domain:** the two-org matrix in Phase 6 for that domain's actions.

**Risk:** highest of all phases — this changes the live read/write path. Mitigations: behind
`DEMO_MODE=false` only; one domain at a time; each domain independently revertible (swap the import
back to owner `db`); fail-closed `withAuthedDb`.

---

## Phase 6 — Verification (prove it actually blocks cross-org)

**Goal:** demonstrate, with real tokens, that Org A cannot touch Org B.

**Matrix (run for each migrated domain):**
1. Seed two orgs (A, B) each with their own rows (via owner connection / sign-up two real Clerk orgs).
2. As **A**: `SELECT` → sees only A's rows; `SELECT` of a known B id → **0 rows**.
3. As **A**: `UPDATE`/`DELETE` a known B id → **0 rows affected** (RLS hides it, not an error).
4. As **A**: `INSERT` with `org_id` = B → **rejected** by WITH CHECK.
5. **No token / garbage token** → `withAuthedDb` throws; action returns generic error (fail closed).
6. Confirm the **owner** path (migrations, counters, identity sync) still works.

**Done when:** every cross-org attempt yields zero rows / rejection, and same-org operations behave
exactly as before. Capture results in `docs/migration/RLS-FINDINGS.md`.

---

## Phase 7 — Rollout to production

**Steps**
1. Repeat **Phase 1** on the `production` branch (enable Authorize, grants, get prod
   `DATABASE_AUTHENTICATED_URL`).
2. Apply the **Phase 2 + 3** migrations to production: `DATABASE_URL="<prod-url>" npm run db:migrate`.
   (Idempotent; safe.)
3. Set in **Vercel** env: `DATABASE_AUTHENTICATED_URL` (prod authenticated, **pooled**),
   `CLERK_JWKS_URL`, `CLERK_JWT_ISSUER`. Reuse the rotated prod `DATABASE_URL` (see
   STATUS item 6 ⚠️ password-rotation note).
4. Deploy to a **preview** first, run the Phase 6 matrix against it, then promote.
5. Monitor: watch for `unauthenticated` / transaction errors spiking (would indicate a token/claims
   misconfig). Rollback = unset `DATABASE_AUTHENTICATED_URL` routing (services fall back to owner `db`)
   — keep that toggle until you've soaked in prod.

---

## Effort & sequencing summary

| Phase | What | Risk | Testable in DEMO_MODE? |
|---|---|---|---|
| 0 | Verify Clerk claims | none | ❌ needs Clerk live |
| 1 | Neon role + grants + 2nd URL | none | partial (psql) |
| 2 | `auth.current_org_id()` fn | low | ✅ via fake `set_config` |
| 3 | Policies + enable RLS (dev) | low (owner bypasses) | ✅ via fake `set_config` |
| 4 | `authed-client.ts` | low | ❌ needs real token |
| 5 | Route services (per domain) | **high** | ❌ needs real token |
| 6 | Two-org verification | — | ❌ needs real tokens |
| 7 | Prod rollout | medium | n/a |

**Recommended order to actually run it:** finish item 1 (Clerk) → deploy → Phase 0 → 1 → 2 → 3
(prove on dev with fake claims) → 4 → 5 (properties first) → 6 → roll remaining domains → 7.

**Keep the owner-fallback toggle** (Phase 7 step 5) until prod has soaked — it's the escape hatch.
