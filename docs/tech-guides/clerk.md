# Clerk — Valgate guide

> Role: the auth core — the edge resolves identity, the `auth-shim` turns it into a `Ctx`, services stay transport-pure.
> Version pinned: `@clerk/nextjs` ^6 (latest v6) · Last verified: 2026-06-11 against clerk.com/docs.
> Decisions: D9 (Clerk via the shim; DEMO_MODE read-only + inert in prod), D9-EXTENDED (resolve `userId` + `orgId` + `role`).
> Build phases: B5 (real auth).
> Official docs: https://clerk.com/docs · Next.js quickstart: https://clerk.com/docs/quickstarts/nextjs

---

## §0 — Cheat-sheet

```ts
// At the EDGE only (Server Action / Route Handler) — never in a service. C2.
import { auth } from "@clerk/nextjs/server";
import { resolveCtx } from "@/lib/auth/shim";

// 1. Clerk gives identity; the shim turns it into our Ctx (and upserts the users row).
const ctx = await resolveCtx();        // { userId, orgId, orgRole } — or throws if signed out
// 2. Hand the Ctx to the pure service. The service never saw Clerk.
const tenants = await listTenants(ctx, propertyId);
```

```ts
// What Clerk's server helper actually returns (it is async — always await):
const { userId, orgId, orgRole } = await auth();   // @clerk/nextjs/server
```

The five facts that matter most: **(1)** `auth()` is **server-only and async**, lives in `@clerk/nextjs/server`, and needs `clerkMiddleware()` running (§2). **(2)** Only the **edge** calls it; services take a `Ctx` ([C2](./_conventions.md#c2)). **(3)** The **`auth-shim`** is the single seam that builds `Ctx` and **upserts a `users` row** on first login (§4). **(4)** **DEMO_MODE** returns `demo-user`, is **read-only**, and is **inert when `NODE_ENV=production`** (D9, §4). **(5)** Org/tenancy resolution (`orgId` + `role` + mirroring orgs to Postgres) lives in [`clerk-organizations.md`](./clerk-organizations.md) — **not here**.

## §1 — Why it's in our stack

The frontend ships a fake-auth seam: `getCurrentUserId()` returns the literal `"demo-user"` across 63+ call sites. We need real, multi-user identity without rewriting all of them. We chose **Clerk** (D9 — it was already in `package.json`): hosted sign-in/up, sessions, and first-class Next.js App Router support, so we don't build or store credentials. We rejected NextAuth/Auth.js (more wiring, we'd own the session store) and rolling our own (a beginner storing password hashes is a liability). The decisive factor: Clerk also ships **Organizations**, which D14 makes the backbone of multi-tenancy — one vendor for identity *and* tenancy. This doc is **auth core only**; the org model is [`clerk-organizations.md`](./clerk-organizations.md).

## §2 — Setup in our stack

```bash
npm i @clerk/nextjs
```

Clerk keys are validated through `@t3-oss/env-nextjs` — see [`env-nextjs.md`](./env-nextjs.md), never read `process.env` directly. Add `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and our `DEMO_MODE` flag to the env schema and `.env.local`.

**`middleware.ts`** (project root) — `clerkMiddleware()` must run for `auth()` to work at all:

```ts
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

The app is wrapped in `<ClerkProvider>` in `app/layout.tsx` (standard quickstart — see §7). Note: this backend repo (D13) is mostly `lib/` with no pages; the provider/middleware land when these modules merge into the frontend. The seam that matters here is the **shim**, not the UI.

## §3 — Mental model (minimal)

Three ideas; everything else, follow the links in §7.

1. **`auth()` is the only thing we call.** Server-side, async, from `@clerk/nextjs/server`. It reads the session that `clerkMiddleware()` attached to the request and returns `{ userId, orgId, orgRole, has, … }`. No request object, no cookies — Clerk reads them for you.
2. **Identity is resolved at the edge, then frozen into a `Ctx`.** A Server Action / Route Handler is the *only* layer allowed to touch `auth()`. It converts the Clerk result into our `Ctx` (`{ userId, orgId, orgRole }`) and passes that down. Services are pure of transport ([C2](./_conventions.md#c2)).
3. **Clerk is the source of truth; Postgres is a mirror.** The session lives in Clerk. We copy the user (and, in the org doc, the org/membership) into our DB **on first login** so SQL joins have something to join against. Clerk stays authoritative for identity.

## §4 — How we use it in Valgate

### The `auth-shim` seam — the single point of replacement

The frontend's `reference/frontend-data-layer/auth-shim.ts` is one tiny function:

```ts
export const DEMO_USER_ID = "demo-user";
export function getCurrentUserId(): string {
  return DEMO_USER_ID;
}
```

D9's leverage: **keep the seam, swap the internals.** All 63+ call sites keep calling the shim; only its body changes. In this backend the shim grows up into `resolveCtx()` — it resolves identity, applies the DEMO_MODE rules, and **upserts the `users` row** so the rest of the system can join on it:

```ts
// lib/auth/shim.ts
import "server-only";                              // C1 — touches Clerk's server auth()
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { env } from "@/lib/env";
import type { Ctx } from "./ctx";

const DEMO_CTX: Ctx = { userId: "demo-user", orgId: "demo-org", orgRole: "owner" };

// Edge-only. Returns the Ctx that every service consumes (C2). Org/role resolution
// (active org + mirroring) is detailed in clerk-organizations.md — not duplicated here.
export async function resolveCtx(): Promise<Ctx> {
  // DEMO_MODE: keeps the seed portfolio usable — but it is READ-ONLY (see assertCanMutate)
  // and REFUSED in production. The flag is inert when NODE_ENV=production. (D9)
  if (env.DEMO_MODE) {
    if (env.NODE_ENV === "production") {
      throw new Error("DEMO_MODE is not permitted in production");   // flag is inert in prod
    }
    return DEMO_CTX;
  }

  const { userId, orgId, orgRole } = await auth();   // Clerk — async, server-only
  if (!userId || !orgId) throw new Error("Not authenticated");

  // Upsert the users row on first login so domain rows can FK / join against it.
  await db.insert(users)
    .values({ id: userId, /* …profile skeleton… */ })
    .onConflictDoNothing({ target: users.id });

  return { userId, orgId, orgRole: orgRole as Ctx["orgRole"] };
}
```

`Ctx` itself is defined once in `lib/auth/ctx.ts` (the same shape services import — see [C2](./_conventions.md#c2)):

```ts
export type Ctx = { userId: string; orgId: string; orgRole: "owner" | "admin" | "member" };
```

### DEMO_MODE: the write-refusal guard

DEMO_MODE returning a context is half the rule. The other half — **mutations refuse under it** — is enforced at the edge, before any write service is called (a standing bypass with write access through 21 action files would be a security hole — Review MED-5):

```ts
// lib/auth/shim.ts (continued)
export function assertCanMutate(): void {
  if (env.DEMO_MODE) throw new Error("Demo is read-only");   // friendly refusal — generic outward (C5)
}
```

Every mutating action calls `assertCanMutate()` first. So the D9 contract is: **demo renders the seed portfolio (reads work), every mutation is refused, and the whole flag is inert in production.**

### The edge → service handoff

This is the only correct flow. The action resolves identity once and hands a `Ctx` down; the service never imports Clerk:

```ts
// app/actions/tenants.ts   (the EDGE)
"use server";
import { resolveCtx, assertCanMutate } from "@/lib/auth/shim";
import { createTenant } from "@/lib/services/tenants";
import { NewTenantSchema } from "@/lib/data/types/tenant";

export async function createTenantAction(raw: unknown) {
  assertCanMutate();                          // D9 — refuse writes under demo mode
  const ctx = await resolveCtx();             // Clerk → Ctx, here and ONLY here
  const input = NewTenantSchema.parse(raw);   // validate at the edge — C4
  return createTenant(ctx, input);            // service is transport-pure — C2
}
```

The service (`lib/services/tenants.ts`) takes `ctx` as its first arg and never knows Clerk exists. That is what makes the Option A → Option B path cheap ([C2](./_conventions.md#c2)).

## §5 — Gotchas & version traps

- **🔴 Never call `auth()` inside a service ([C2](./_conventions.md#c2)).** It is the single most tempting shortcut and it poisons the whole architecture: a service that calls `auth()` can no longer be unit-tested with a fixture `Ctx`, can't become an API handler unchanged, and hides who it's acting as. `auth()` lives **only** at the edge. Grep-audited at B5/B9.
- **🔴 DEMO_MODE write-bypass risk.** Returning `demo-user` is not enough — without `assertCanMutate()`, every visitor gets full write access through all 21 action files. The two guards are non-negotiable: **(a)** mutations refuse under demo mode, **(b)** the flag throws under `NODE_ENV=production`. Pick neither and demo mode is a production auth bypass (Review MED-5 / D9).
- **`auth()` is async — `await` it.** `const { userId } = auth()` (no await) returns a promise and `userId` is `undefined`. Always `await auth()`.
- **`auth()` is dead without `clerkMiddleware()`.** If the middleware isn't running for a route, `auth()` returns an empty session. This fails at *runtime*, not build — the §2 matcher must cover the route.
- **Server vs client import paths.** `auth()` is `@clerk/nextjs/server`; the React components/hooks are `@clerk/nextjs`. Importing the server helper into a client component breaks the build — which is also why the shim carries `import "server-only"` ([C1](./_conventions.md#c1)).
- **Leak generic errors, not Clerk's.** "Not authenticated" / "Demo is read-only" are fine; never forward a raw Clerk error object to the client ([C5](./_conventions.md#c5)).
- **`orgId` can be null in raw Clerk** (personal account, no active org). We normalise to "always an org" — see [`clerk-organizations.md`](./clerk-organizations.md); the shim treats a missing org as not-authenticated.

## §6 — Reusable patterns

**Resolve identity in an edge handler** (the only place `auth()` appears):

```ts
const ctx = await resolveCtx();          // → { userId, orgId, orgRole }; throws if signed out
```

**A mutating Server Action** (the full guard order):

```ts
"use server";
export async function doThingAction(raw: unknown) {
  assertCanMutate();                     // 1. D9 demo refusal
  const ctx = await resolveCtx();        // 2. identity → Ctx
  const input = ThingSchema.parse(raw);  // 3. validate at edge — C4
  return doThing(ctx, input);            // 4. pure service — C2
}
```

**Upsert-on-first-login** (idempotent; runs inside `resolveCtx`):

```ts
await db.insert(users).values({ id: userId, … }).onConflictDoNothing({ target: users.id });
```

**A test `Ctx`** (no Clerk needed — this is the payoff of C2): services are tested by passing a literal `{ userId, orgId, orgRole }`. See [C9](./_conventions.md#c9) / `vitest.md`.

## §7 — Going deeper

- Next.js App Router quickstart (full `ClerkProvider` + middleware) — https://clerk.com/docs/quickstarts/nextjs
- `clerkMiddleware()` — config, route protection, matcher — https://clerk.com/docs/references/nextjs/clerk-middleware
- The `auth()` helper — full return shape, `has()`, `protect()`, `redirectToSignIn()` — https://clerk.com/docs/references/nextjs/auth
- Reading user/session data server-side — https://clerk.com/docs/references/nextjs/read-session-data
- **Org/tenancy** — active org, role checks, mirroring orgs+memberships to Postgres — lives in [`clerk-organizations.md`](./clerk-organizations.md), not here.
- Cross-cutting auth rules: edge-resolves-`Ctx` ([C2](./_conventions.md#c2)), org-scoping ([C3](./_conventions.md#c3)), generic errors ([C5](./_conventions.md#c5)).
