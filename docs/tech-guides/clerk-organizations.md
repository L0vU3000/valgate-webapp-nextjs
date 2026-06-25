# Clerk Organizations — Valgate guide

> Role: the multi-tenancy model the whole backend depends on — org = workspace, every row is org-scoped, Clerk is the source of truth for identity.
> Version pinned: `@clerk/nextjs` ^6 · Last verified: 2026-06-11 against clerk.com/docs.
> Decisions: D14 (multi-tenant via Clerk Organizations — reverses D10), D9+ (auth resolves `userId`+`orgId`+`orgRole`), D8 (TEXT ids), D12 (`convex/` is reference, not built).
> Build phases: B1 (org tables + scoping), B5 (Clerk-orgs auth + webhook sync), B6 (`pillar_verifications` gains `org_id`).
> Official docs: [Organizations overview](https://clerk.com/docs/guides/organizations/overview) · [Multi-tenant architecture](https://clerk.com/docs/guides/how-clerk-works/multi-tenant-architecture) · [Syncing via webhooks](https://clerk.com/docs/guides/development/webhooks/syncing)

This doc is the **multi-tenancy contract**. `auth()`, middleware, and the `<OrganizationSwitcher/>` basics live in [`clerk.md`](./clerk.md) — read that first; this doc is only the *org* layer on top.

---

## §0 — Cheat-sheet

```ts
// At the edge (Server Action / Route Handler) — resolve the active org into Ctx.
import { auth } from "@clerk/nextjs/server";
import { requireCtx } from "@/lib/auth/ctx";

const { userId, orgId, orgRole } = await auth();   // orgId is ALWAYS set — see §4
const ctx = await requireCtx();                     // → { userId, orgId, orgRole } | throws

// Reads: filter by the active org (C3). There is no "all orgs" read.
const rows = await db.select().from(properties).where(eq(properties.orgId, ctx.orgId));

// Mutations: check role at the edge, then scope ownership IN the WHERE (C3).
requireRole(ctx, "admin");                          // throws if orgRole insufficient
const [row] = await db.update(properties)
  .set(patch).where(and(eq(properties.id, id), eq(properties.orgId, ctx.orgId))).returning();
```

The five facts that matter most:
1. **Org = workspace.** Many users per org; one user in many orgs. The row's owner is the **org**, not the user ([C3](./_conventions.md#c3)).
2. **No null-org path.** A personal workspace is just an org auto-created on signup. `ctx.orgId` is never null — so no branch for it (§4).
3. **Clerk owns identity; Postgres mirrors it.** `organizations` / `users` / `organization_memberships` are **read-mirrors** kept current by webhooks (§4). Never write identity from a service.
4. **Every read filters `org_id`; every mutation checks membership + role *before* the row** ([C3](./_conventions.md#c3)).
5. **Roles are `owner | admin | member`.** Role checks live at the **edge**, scoping lives in the **service** WHERE (§5).

## §1 — Why it's in our stack

The v1 plan (D10) was single-tenant: every row keyed to one `user_id`. D14 **reverses that** — Valgate is multi-tenant from day one so a workspace (an investor, a fund, a family office) can have several members sharing one property portfolio. We use **Clerk Organizations** rather than rolling our own orgs/invites/roles because Clerk already ships the org model, membership lifecycle, invitations, and role claims, and the auth core ([`clerk.md`](./clerk.md)) is already Clerk. We rejected building a bespoke tenancy layer (re-implementing invites + role tokens is exactly the speculative complexity we'd want to avoid) and per-user-only scoping (can't share a portfolio). Clerk stays the **source of truth for identity**; Postgres only mirrors what it needs to `JOIN` against. *(D14.)*

## §2 — Setup in our stack

Organizations are a dashboard toggle plus the same `@clerk/nextjs` package the auth core uses — no extra install.

```bash
# Already installed for the auth core (see clerk.md). No new package.
# In the Clerk Dashboard: Organizations → Enable Organizations.
# Dashboard → Organizations settings: enable "Personal accounts" OFF
#   so every user is always inside an org (the no-null-org rule, §4).
```

Two env vars beyond the auth-core set (validated through [`env-nextjs.md`](./env-nextjs.md), never `process.env` directly):

```
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...   # verifies the sync webhook (§4)
```

Session token: org claims (`orgId`, `orgRole`) ride in the Clerk session automatically once Organizations is enabled — `auth()` returns them with no config. The `<OrganizationSwitcher/>` that changes the active org is a frontend concern (out of this repo under Option A); the backend only ever reads the **already-active** org from the session.

## §3 — Mental model (minimal)

Four ideas; everything generic, follow §7.

1. **Active organization.** A session has exactly one *active* org at a time (per browser tab). `auth()` reflects only that active org's `orgId` + `orgRole`. The backend never picks the org — it trusts the session's active org. *(Switching is a frontend action; see §5.)*
2. **Membership is the access grant.** A user sees an org's data **iff** they have an `organization_memberships` row for it. Role (`owner|admin|member`) decides what they may *do*. Clerk enforces this in the token; we re-check it in the mirror for joins and defense-in-depth.
3. **Clerk → Postgres is one-way.** Identity flows Clerk → webhook → our mirror tables. We never write `organizations`/`users`/`organization_memberships` from a service or action — only the webhook handler upserts them.
4. **"Personal" is just an org.** Clerk can model personal accounts separately; we turn that off and **normalise to always-an-org** so there is one code path. Signup auto-creates a personal org; `orgId` is therefore always present.

## §4 — How we use it in Valgate

### The mirror tables (Clerk is source of truth)

Three tables in `lib/db/schema/identity.ts`, ported in the same flat style as every other table (TEXT id via [C8](./_conventions.md#c8), the Clerk id mirrored alongside). They are **read-mirrors**: only the webhook handler writes them.

```ts
// lib/db/schema/identity.ts
import { pgTable, text, timestamp, pgEnum, index, uniqueIndex } from "drizzle-orm/pg-core";

export const orgRole = pgEnum("org_role", ["owner", "admin", "member"]);
export const membershipStatus = pgEnum("membership_status", ["active", "invited", "removed"]);

export const organizations = pgTable("organizations", {
  id:          text("id").primaryKey(),                          // ORG-0001 — our id (C8)
  clerkOrgId:  text("clerk_org_id").notNull(),                   // "org_..." — Clerk's id
  name:        text("name").notNull(),
  slug:        text("slug"),                                     // FE .optional() → C6
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),  // D7
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("uq_org_clerk").on(t.clerkOrgId),   // one row per Clerk org — webhook upsert key
]);

export const users = pgTable("users", {
  id:           text("id").primaryKey(),                         // USR-0001 (C8)
  clerkUserId:  text("clerk_user_id").notNull(),                 // "user_..."
  primaryEmail: text("primary_email").notNull(),
  displayName:  text("display_name"),                            // FE .optional() → C6
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("uq_user_clerk").on(t.clerkUserId),
]);

export const organizationMemberships = pgTable("organization_memberships", {
  id:        text("id").primaryKey(),                            // MEM-0001 (C8)
  orgId:     text("org_id").notNull().references(() => organizations.id),
  userId:    text("user_id").notNull().references(() => users.id),
  role:      orgRole("role").notNull(),                          // owner|admin|member
  status:    membershipStatus("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("uq_membership").on(t.orgId, t.userId),   // ONE membership per user per org
  index("ix_membership_user").on(t.userId),             // "which orgs is this user in"
]);
```

Note: `organizations.id` / `users.id` are **our** prefixed ids ([C8](./_conventions.md#c8)); the `clerk_org_id` / `clerk_user_id` columns are how the webhook finds the row to upsert. Domain tables reference **our** `organizations.id` via `org_id` (see `tenants` in [`drizzle.md`](./drizzle.md) §4).

### Resolving `auth()` → `Ctx` at the edge

The edge converts Clerk's session into the `Ctx` every service takes ([C2](./_conventions.md#c2)). Because we disabled personal accounts (§2), `orgId` is guaranteed — no null branch.

```ts
// lib/auth/ctx.ts
import "server-only";                                  // C1
import { auth } from "@clerk/nextjs/server";

export type Ctx = { userId: string; orgId: string; orgRole: "owner" | "admin" | "member" };

export async function requireCtx(): Promise<Ctx> {
  const { userId, orgId, orgRole } = await auth();     // Clerk session claims
  if (!userId || !orgId) throw new Error("unauthenticated");   // never leak which — C5
  return { userId, orgId, orgRole: orgRole as Ctx["orgRole"] };
}

const RANK = { member: 0, admin: 1, owner: 2 } as const;
export function requireRole(ctx: Ctx, min: keyof typeof RANK): void {
  if (RANK[ctx.orgRole] < RANK[min]) throw new Error("forbidden");   // role check at the edge
}
```

> `orgId` here is Clerk's `org_...` value from the session. The mirror's `organizations.clerk_org_id` maps it to our `ORG-` id. Resolve once at the edge (a tiny cached lookup) and pass **our** `orgId` into services, or filter domain rows by the Clerk org id directly if you store it — pick one and keep it consistent. In Valgate we store **our** `org_id` on domain rows and resolve the Clerk id → our id once per request.

### Org-scoped access — a real example on `properties` ([C3](./_conventions.md#c3))

Every read filters `org_id`; every mutation checks role at the edge then scopes ownership in the WHERE. The row's `user_id` is **"created by,"** not the access key.

```ts
// lib/services/properties.ts
import "server-only";                                  // C1
import { db } from "@/lib/db/client";
import { properties } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { Ctx } from "@/lib/auth/ctx";

// READ — scoped to the active org. A member of another org gets zero rows, never an error.
export async function listProperties(ctx: Ctx): Promise<Property[]> {
  const rows = await db.select().from(properties)
    .where(eq(properties.orgId, ctx.orgId));           // C3 — the ONLY scope key
  return rows.map(rowToProperty);
}

// MUTATION — role checked at the edge (see action below); org scoped in the WHERE.
export async function updateProperty(ctx: Ctx, id: string, patch: PropertyPatch): Promise<Property> {
  const [row] = await db.update(properties).set(patch)
    .where(and(eq(properties.id, id), eq(properties.orgId, ctx.orgId)))  // C3 — ownership in WHERE
    .returning();
  if (!row) throw new Error("not found");              // wrong-org id == not found — no leak (C5)
  return rowToProperty(row);
}
```

```ts
// app/.../actions.ts — the edge resolves auth + role, then calls the pure service.
"use server";
import { requireCtx, requireRole } from "@/lib/auth/ctx";
import { updateProperty } from "@/lib/services/properties";

export async function updatePropertyAction(id: string, patch: PropertyPatch) {
  const ctx = await requireCtx();
  requireRole(ctx, "admin");                           // role at the edge — C3, §5
  return updateProperty(ctx, id, patch);               // service is transport-pure — C2
}
```

The same shape applies to `pillar_verifications`, which gains an `org_id` under D14 (master-plan §6) so verification reads/writes are org-scoped exactly like `properties`.

### Keeping the mirror in sync — Clerk webhooks

Clerk emits an event whenever org/membership/user identity changes; a single Route Handler verifies it and upserts/deletes the matching mirror row. This is the **only** writer of the identity tables.

```ts
// app/api/webhooks/clerk/route.ts
import { verifyWebhook } from "@clerk/nextjs/webhooks";   // verifies the svix signature
import type { NextRequest } from "next/server";
import { upsertOrg, upsertUser, upsertMembership, removeMembership } from "@/lib/services/identity-sync";

export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req);                       // throws on bad signature → 400
  } catch {
    return new Response("bad signature", { status: 400 });
  }

  switch (evt.type) {
    case "organization.created":
    case "organization.updated":
      await upsertOrg(evt.data); break;                   // upsert by clerk_org_id (idempotent)
    case "user.created":
    case "user.updated":
      await upsertUser(evt.data); break;
    case "organizationMembership.created":
    case "organizationMembership.updated":
      await upsertMembership(evt.data); break;            // upsert by (org_id, user_id)
    case "organizationMembership.deleted":
      await removeMembership(evt.data); break;            // or set status = "removed"
    // organization.deleted → mark org inactive; never hard-delete tenant data blindly.
  }
  return new Response("ok", { status: 200 });             // 2xx or Clerk retries
}
```

Each `upsert*` uses Drizzle's `onConflictDoUpdate` keyed on the unique Clerk id, so a re-delivered event is a no-op (§5 idempotency). The handler is the **one** place identity tables are written — services only ever read them.

### Seed: the demo portfolio belongs to a demo org

The seed creates a demo org with the demo user as `owner`, then assigns every demo property to it — so the demo renders through the exact same org-scoped path as production.

```ts
// scripts/seed/identity.ts
const org  = { id: "ORG-0001", clerkOrgId: "org_demo",  name: "Demo Portfolio", slug: "demo" };
const user = { id: "USR-0001", clerkUserId: "user_demo", primaryEmail: "demo@valgate.app", displayName: "Demo Owner" };
await db.insert(organizations).values(org);
await db.insert(users).values(user);
await db.insert(organizationMemberships)
  .values({ id: "MEM-0001", orgId: org.id, userId: user.id, role: "owner", status: "active" });
// every seeded property/tenant/verification gets orgId: "ORG-0001", userId: "USR-0001".
```

## §5 — Gotchas & version traps

- **🔴 Forgetting the org filter = a cross-tenant leak.** A `select().from(properties)` with **no** `where(eq(properties.orgId, ctx.orgId))` returns *every org's* rows. This is the single highest-severity bug in the codebase — it silently shows tenant B's portfolio to tenant A. Every read filters `org_id`; every mutation scopes ownership in the WHERE ([C3](./_conventions.md#c3)). There is **no** legitimate "all orgs" read in app code.
- **Active-org switching is the session's job, not the service's.** A user in three orgs has three contexts; the *active* one is whatever the session token says. The backend never chooses or overrides it — it reads the active `orgId` from `auth()` and trusts it. Background jobs that lack a session token must be passed an explicit `Ctx`; they can't `auth()`.
- **Webhook idempotency is mandatory.** Clerk retries on any non-2xx and may deliver the same event twice. Every `upsert*` must be keyed on the unique Clerk id (`onConflictDoUpdate`), and deletes must tolerate "already gone." Return **2xx even when the row was a no-op** — only return 4xx for a genuinely bad/unverifiable payload, or Clerk will retry forever.
- **Role checks at the edge; scoping in the service.** Keep `requireRole()` in the action/handler (it's a transport-level authorization gate), and keep `eq(orgId, ctx.orgId)` in the service WHERE (it's a data-scope invariant). Don't move role checks into services (they'd need ambient role context, violating [C2](./_conventions.md#c2)); don't move org scoping into the edge (a service called from anywhere must self-scope).
- **No null-org branch — keep it that way.** Because personal accounts are disabled (§2), `orgId` is always set. Do **not** add `if (!orgId)` data paths "just in case" — they create an untested single-tenant fork. If `auth()` ever returns no `orgId`, that's an unauthenticated/misconfigured request: throw, don't branch.
- **Clerk id vs our id.** `auth()` gives `org_...` / `user_...` (Clerk's). Domain `org_id`/`user_id` columns hold **our** `ORG-`/`USR-` ids. Resolve Clerk id → our id once at the edge; never store Clerk ids on domain rows or you'll mix the two id schemes.
- **`role` is a fixed enum.** Clerk supports custom roles, but Valgate pins `owner|admin|member` (the `org_role` pgEnum). A webhook delivering an unknown role should map to `member` or be rejected — never insert a role outside the enum or the membership upsert throws.

## §6 — Reusable patterns

**Idempotent org upsert** (the webhook's core move):

```ts
// lib/services/identity-sync.ts
export async function upsertOrg(d: { id: string; name: string; slug?: string }) {
  await db.insert(organizations)
    .values({ id: await nextId("ORG"), clerkOrgId: d.id, name: d.name, slug: d.slug })
    .onConflictDoUpdate({                               // re-delivery → harmless update (§5)
      target: organizations.clerkOrgId,
      set: { name: d.name, slug: d.slug, updatedAt: new Date() },
    });
}
```

**Membership upsert keyed on `(org_id, user_id)`** — resolve Clerk ids → our ids first, then conflict on the unique pair:

```ts
export async function upsertMembership(d: { organization: { id: string }; public_user_data: { user_id: string }; role: string }) {
  const orgId  = await ourOrgId(d.organization.id);          // clerk_org_id → ORG-…
  const userId = await ourUserId(d.public_user_data.user_id);
  await db.insert(organizationMemberships)
    .values({ id: await nextId("MEM"), orgId, userId, role: normaliseRole(d.role), status: "active" })
    .onConflictDoUpdate({ target: [organizationMemberships.orgId, organizationMemberships.userId],
                          set: { role: normaliseRole(d.role), status: "active" } });
}
```

**An org-scoped read** (the pattern every list service follows):

```ts
db.select().from(<table>).where(eq(<table>.orgId, ctx.orgId));   // + extra filters via and(...)
```

**An org-scoped mutation with role gate** (edge + service split):

```ts
// edge:    const ctx = await requireCtx(); requireRole(ctx, "admin"); return svc(ctx, …);
// service: db.update(<table>).set(patch).where(and(eq(<table>.id, id), eq(<table>.orgId, ctx.orgId)))
```

**Add `org_id` to a new domain table** — TEXT `org_id` referencing `organizations.id`, `.notNull()`, plus `index("ix_<t>_org").on(t.orgId)` (the scope key is always indexed — see [`drizzle.md`](./drizzle.md) §4).

## §7 — Going deeper

- Organizations overview & roles — https://clerk.com/docs/guides/organizations/overview
- Multi-tenant architecture (active org, shared user pool) — https://clerk.com/docs/guides/how-clerk-works/multi-tenant-architecture
- Roles & permissions (custom roles, `has()`) — https://clerk.com/docs/guides/organizations/roles-and-permissions
- Verifying authorization (`has`, `protect`) — https://clerk.com/docs/guides/secure/authorization-checks
- Syncing Clerk data via webhooks (`verifyWebhook`, payloads) — https://clerk.com/docs/guides/development/webhooks/syncing
- Webhook event catalog (exact `organization.*` / `organizationMembership.*` names) — Clerk Dashboard → Webhooks → Event Catalog
- `<OrganizationSwitcher/>` / `useOrganization()` (frontend, out of this repo) — https://clerk.com/docs/reference/components/organization/organization-switcher
- Auth core (`auth()`, middleware, session) — [`clerk.md`](./clerk.md)
- Drizzle table/query idioms reused here — [`drizzle.md`](./drizzle.md); cross-cutting scoping rule — [C3](./_conventions.md#c3).
