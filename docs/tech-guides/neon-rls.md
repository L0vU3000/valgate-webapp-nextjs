# Neon RLS — Valgate guide

> Role: **database-level** enforcement of org/tenant isolation — a second wall *behind* our application-level org scoping ([C3](./_conventions.md#c3)).
> Version pinned: `drizzle-orm/neon` helpers + `pg_session_jwt` · Neon RLS (formerly "Neon Authorize"). Last verified: 2026-06-11 against neon.com/docs.
> Decisions: D14 (multi-tenant), C3. ⚠️ **Adoption is a PENDING decision — candidate D17, not yet locked. See §1.**
> Build phases: candidate for a hardening pass after Clerk-orgs auth lands (B5/B6) or at B9.
> Official docs: https://neon.com/docs/guides/row-level-security · [RLS+Drizzle](https://neon.com/docs/guides/rls-drizzle) · [auth-clerk](https://neon.com/docs/guides/auth-clerk)

---

## §0 — Cheat-sheet

```ts
// Org-scoped RLS policy declared on the table (drizzle-orm/neon)
import { crudPolicy, authenticatedRole } from "drizzle-orm/neon";
import { sql } from "drizzle-orm";

export const properties = pgTable("properties", {
  /* …columns… */ orgId: text("org_id").notNull(),
}, (t) => [
  crudPolicy({
    role: authenticatedRole,
    read:   sql`(select auth.session()->>'org_id') = ${t.orgId}`,   // org claim, not user_id
    modify: sql`(select auth.session()->>'org_id') = ${t.orgId}`,
  }),
]);
```

```ts
// Two connections, by purpose:
//  1) PRIVILEGED (owner role, bypasses RLS) — our existing Pool client. Migrations, seed, trusted services.
import { db } from "@/lib/db/client";                              // DATABASE_URL — see drizzle.md
//  2) AUTHENTICATED (authenticatedRole, RLS-enforced) — carries the Clerk JWT.
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
const authedDb = drizzle(neon(env.DATABASE_AUTHENTICATED_URL, { authToken: () => getClerkToken() }));
```

In Postgres policies: **`auth.user_id()`** = the JWT `sub` (Clerk user id); **`auth.session()->>'org_id'`** = a custom claim you must add to Clerk's JWT template. RLS is **default-deny** once enabled — no policy = no access for `authenticatedRole`.

The five facts that matter most: **(1)** RLS is **defense-in-depth, not a replacement** for [C3](./_conventions.md#c3). **(2)** we scope on **`org_id`** (the active-org claim), not `user_id` — tenancy is org-level (D14). **(3)** Clerk's default token only carries `user_id`; **you must add `org_id`** via a JWT template. **(4)** migrations & seed run on the **privileged** role and bypass RLS. **(5)** the authenticated client uses the **http** driver + `authToken`; our transactional paths stay on the **Pool** (D1) — see §5.

## §1 — Why it's in our stack (status: candidate)

Our tenancy isolation today is **application-level**: every service filters `org_id` and checks membership before mutating ([C2](./_conventions.md#c2)/[C3](./_conventions.md#c3)). That is the primary, testable, transport-portable mechanism, and it survives the Option A→B promotion unchanged.

RLS adds a **second wall inside Postgres**: even if a query forgets its `where(org_id)`, the database refuses to return another org's rows. It directly mitigates the single scariest failure mode named in [`clerk-organizations.md`](./clerk-organizations.md) §5 — *"forgetting org scoping = cross-tenant leak."*

**But it is not free**, and it is **not in the locked plan (D1–D16).** It introduces a second connection role, a Clerk JWT template, default-deny policies, and a driver consideration (§5). So treat this guide as the *design* for a deliberate hardening step — **adopt it as defense-in-depth, keep C3 as primary** — and get the decision recorded (candidate **D17**) before building. We do **not** rip out C3 in favour of RLS; we layer them.

## §2 — Setup in our stack

1. **Enable Neon RLS** for the project and **add Clerk as the auth provider** (Neon validates Clerk's JWTs via its JWKS URL). This provisions the built-in `authenticated` / `anonymous` Postgres roles and the `pg_session_jwt` extension.
2. **Add `org_id` to Clerk's JWT** — in Clerk → Configure → **JWT Templates**, use the Neon template and add the active org as a custom claim (`org_id`). The default token carries only `user_id`; org-scoped policies need `org_id`.
3. **Two connection strings** in `lib/env.ts` (see [`env-nextjs.md`](./env-nextjs.md)): `DATABASE_URL` (privileged owner — already there) and `DATABASE_AUTHENTICATED_URL` (the `authenticated` role).
4. `npm i drizzle-orm` already gives the `drizzle-orm/neon` policy helpers (`crudPolicy`, `authenticatedRole`, `anonymousRole`, `authUid`, `pgPolicy`).

## §3 — Mental model (minimal)

1. **RLS is per-connection-role.** Postgres decides row visibility from the role the connection uses and the policies on the table. Our **privileged owner** role (the Pool client) **bypasses** RLS; the **`authenticatedRole`** connection is **subject** to it.
2. **The JWT is the context.** `pg_session_jwt` exposes the validated Clerk token to policies: `auth.user_id()` (the `sub`) and `auth.session()` (the full claims, incl. our custom `org_id`).
3. **Default-deny.** `ENABLE ROW LEVEL SECURITY` with no matching policy means `authenticatedRole` sees nothing. You grant access by writing policies.
4. **Policies *check*, app code *sets*.** RLS verifies `org_id` matches the caller's claim; it does not populate `org_id`. Our services still set `org_id = ctx.orgId` on insert ([C3](./_conventions.md#c3)).

## §4 — How we use it in Valgate

### The position: RLS backstops C3, it doesn't replace it

Services keep doing explicit `where(eq(table.orgId, ctx.orgId))` and role checks ([C3](./_conventions.md#c3)) — that stays the tested, primary path. RLS is the database-enforced safety net underneath. Two reasons we don't invert this: the app-level filter is what the goal-tests ([C9](./_conventions.md#c9)) assert, and it's what becomes the API handler under Option B with zero rework.

### Org-scoped policy (the Valgate pattern)

The Neon examples scope to `auth.user_id()`. We scope to the **active org**, because a property belongs to an org and any member may see it (D14):

```ts
// lib/db/schema/property.ts  — RLS layered onto the existing table
import { crudPolicy, authenticatedRole } from "drizzle-orm/neon";
import { sql } from "drizzle-orm";

export const properties = pgTable("properties", {
  id:    text("id").primaryKey(),                 // PROP-0042 (C8)
  orgId: text("org_id").notNull(),                // the tenancy key (C3/D14)
  userId:text("user_id").notNull(),               // "created by"
  /* …rest of the columns (see drizzle.md / schema.sql)… */
}, (t) => [
  index("ix_properties_org").on(t.orgId),
  crudPolicy({
    role: authenticatedRole,
    read:   sql`(select auth.session()->>'org_id') = ${t.orgId}`,
    modify: sql`(select auth.session()->>'org_id') = ${t.orgId}`,
  }),
]);
```

`drizzle-kit generate` emits the `CREATE POLICY` / `ALTER TABLE … ENABLE ROW LEVEL SECURITY` SQL alongside the table (see [`drizzle-kit.md`](./drizzle-kit.md)).

### Which connection runs what

| Path | Connection | RLS |
|------|-----------|-----|
| Migrations, seed (`scripts/`), `nextId` counter, trusted internal jobs | **privileged** Pool (`DATABASE_URL`) — our existing `lib/db/client.ts` | bypassed |
| RLS-enforced read paths (the backstop in action) | **authenticated** http client (`DATABASE_AUTHENTICATED_URL` + Clerk `authToken`) | enforced |

Seed and migrations *must* run privileged or RLS will block/mis-scope them.

## §5 — Gotchas & version traps

- **🔴 RLS is NOT a substitute for [C3](./_conventions.md#c3).** Keep the explicit `org_id` filters. RLS is the net, not the rope. Removing app-level scoping would break the goal-tests and the Option-B promotion.
- **🔴 `org_id` is not in Clerk's default token.** You must add it as a custom claim in a Clerk JWT template; otherwise `auth.session()->>'org_id'` is null and every authenticated query returns nothing (default-deny).
- **Driver tension with D1.** Neon's authenticated client uses the **`neon-http`** driver with `authToken` — and `neon-http` *throws on `db.transaction()`*. Our transactional writes (counters, B6 verification) therefore stay on the **privileged Pool** with explicit `org_id` filtering; RLS-enforced usage is for read paths. Don't try to route transactions through the authenticated http client.
- **Active-org switching.** The `org_id` claim reflects Clerk's *active* org. A user in many orgs sees only the active one through RLS — matches our app-level behaviour, but be deliberate about it.
- **Default-deny surprises.** Once `ENABLE ROW LEVEL SECURITY` is on, a table with no policy is invisible to `authenticatedRole` — easy to mistake for "data missing."
- **We set `org_id`, the policy checks it.** Don't copy Neon's `.default(sql\`(auth.user_id())\`)` pattern — our ids come from `nextId` ([C8](./_conventions.md#c8)) and `org_id` comes from `ctx.orgId` ([C3](./_conventions.md#c3)).

## §6 — Reusable patterns

**Org-scoped `crudPolicy`** — the snippet in §4, repeated per org-scoped table.

**Read-only / signal tables** (e.g. reference data any member may read but not write):

```ts
crudPolicy({ role: authenticatedRole,
  read:   sql`(select auth.session()->>'org_id') = ${t.orgId}`,
  modify: sql`false` });        // never writable via the authenticated role
```

**Authenticated client with the Clerk token** (read backstop):

```ts
import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

export async function authedDb() {
  const { getToken } = await auth();
  return drizzle(neon(env.DATABASE_AUTHENTICATED_URL, { authToken: () => getToken() }));
}
```

**Privileged client** = the existing `lib/db/client.ts` Pool (migrations, seed, transactional services) — unchanged.

## §7 — Going deeper

- Neon RLS overview — https://neon.com/docs/guides/row-level-security
- RLS with Drizzle (`crudPolicy`, `authUid`, roles) — https://neon.com/docs/guides/rls-drizzle
- RLS tutorial (end-to-end) — https://neon.com/docs/guides/rls-tutorial
- Clerk as Neon auth provider — https://neon.com/docs/guides/auth-clerk
- Drizzle RLS reference — https://orm.drizzle.team/docs/rls
- The tenancy model these policies enforce — [`clerk-organizations.md`](./clerk-organizations.md); driver background — [`neon.md`](./neon.md).
