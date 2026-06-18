# Next.js 15 — Valgate guide

> Role: the **edge** of the backend — the only layer that touches Clerk `auth()`, request bodies, cookies, and the cache. It resolves a `Ctx`, then hands off to `lib/services/`.
> Version pinned: `next` 15 (App Router) · Last verified: 2026-06-11 against nextjs.org/docs.
> Decisions: D3 (logic in Server Actions + `lib/services/`), D13 (fresh standalone repo — Option A, no frontend pages yet).
> Build phases: B0 (app skeleton), B4 (write actions), B5 (Clerk auth at the edge), B6 (verification action).
> Official docs: https://nextjs.org/docs · Server Actions · [Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route) · [Server Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) · [revalidateTag](https://nextjs.org/docs/app/api-reference/functions/revalidateTag)

---

## §0 — Cheat-sheet

```ts
// A Server Action — the edge. (B4)  "use server" + Zod input → Ctx → service → revalidate
"use server";
import { revalidateTag } from "next/cache";
import { requireCtx } from "@/lib/auth/ctx";          // resolves Clerk auth() → Ctx
import { createTenant } from "@/lib/services/tenants"; // pure service — no transport inside (C2)
import { NewTenantSchema } from "@/lib/data/types/tenant";

export async function createTenantAction(input: unknown) {
  const data = NewTenantSchema.parse(input);           // validate at the edge — C4
  const ctx  = await requireCtx();                      // { userId, orgId, orgRole } — C2
  try {
    const tenant = await createTenant(ctx, data);       // hand off to the service
    revalidateTag(`tenants:${ctx.orgId}`, "max");        // bust the org-scoped cache
    return { ok: true as const, tenant };
  } catch (e) {
    console.error("createTenantAction", e);              // log real error server-side — C5
    return { ok: false as const, error: "Could not create tenant" }; // generic outward
  }
}
```

```ts
// A Server Component reading through a service (no "use server" — it renders on the server)
import { listTenants } from "@/lib/services/tenants";
import { requireCtx } from "@/lib/auth/ctx";
export default async function Page() {
  const ctx = await requireCtx();
  const tenants = await listTenants(ctx, propertyId);   // direct call, no fetch
  return <TenantTable tenants={tenants} />;
}
```

The five facts that matter most: **(1)** the **action/handler is the only edge** — `auth()`, request bodies, and cookies live here and nowhere else ([C2](./_conventions.md#c2)). **(2)** validate input with Zod **before** calling a service ([C4](./_conventions.md#c4)). **(3)** resolve `Ctx` via `requireCtx()`, pass it as the service's first arg. **(4)** `revalidateTag` after a write — it only runs on the server. **(5)** catch → log real → return generic ([C5](./_conventions.md#c5)).

## §1 — Why it's in our stack

We need a server runtime that can hold the Drizzle client, run Clerk's server `auth()`, and expose typed write entry points — without a frontend yet (Option A, D13). Next.js gives all three in one toolchain: **Server Actions** are typed, in-process write functions (no REST scaffolding); **Route Handlers** are the same thing exposed over HTTP for the day Pro needs Option B; **Server Components** run our read services directly with no `fetch`. We chose it (D3) because the v1 plan already lived behind this exact seam, and Option A keeps the seam while dropping the pages — so when the backend merges into the frontend, the `lib/` modules move as-is. We rejected a bare Hono/Express service (Option B): more transport, CORS, and auth-forwarding for a backend beginner, for no v1 gain.

## §2 — Setup in our stack

```bash
npx create-next-app@latest --ts --app --no-tailwind   # App Router, TypeScript
npm i server-only                                       # the C1 guard package
```

This is a **backend** repo (Option A): there is `app/` for actions/handlers but **no product pages**. The tree we actually use:

```
app/
  layout.tsx              # minimal root layout (Clerk <ClerkProvider> wraps here — see clerk.md)
  actions/                # "use server" entry points, one file per domain (mirrors lib/services/)
    tenants.ts
    properties.ts
    verification.ts
  api/                    # Route Handlers — empty in Option A; the Option-B promotion point (§4)
lib/
  auth/ctx.ts             # requireCtx(): Clerk auth() → Ctx          (the ONLY auth() caller)
  services/<entity>.ts    # pure services — see drizzle.md §4 / C2
  data/types/             # canonical Zod types, owned by this repo   (D4 / C4)
```

`tsconfig.json` keeps the `@/*` path alias from `create-next-app`. Env is validated through `@t3-oss/env-nextjs` ([`env-nextjs.md`](./env-nextjs.md)) — never `process.env` directly. Clerk middleware lives in `middleware.ts` ([`clerk.md`](./clerk.md)).

## §3 — Mental model (minimal)

Four ideas; everything generic, follow §7.

1. **Server Components are the default.** Files under `app/` run on the server unless they start with `"use client"`. They can be `async` and call services directly — no API layer between a page and the DB.
2. **The `"use server"` directive marks an action.** A file (or a single function) tagged `"use server"` exports functions that are callable as RPC entry points. The args are validated, the body runs server-side only.
3. **Route Handlers (`app/api/**/route.ts`) are HTTP.** They export `GET`/`POST`/… taking a Web `Request`, returning a `Response`. Same role as an action, but reachable over the wire — our Option-B seam.
4. **The edge resolves transport; the service is pure.** Actions and handlers are where `auth()`, `cookies()`, `headers()`, and `request.json()` live. They build a `Ctx` and pass it down. Nothing transport-shaped crosses into `lib/services/` — this is [C2](./_conventions.md#c2), the rule that makes Option A→B cheap.

## §4 — How we use it in Valgate

The whole backend has **one seam**: *(edge) action or handler → resolve `Ctx` → call service → revalidate*. Everything in this section is that seam.

### `requireCtx()` — the single `auth()` boundary

`auth()` is called in **exactly one place**. Every action/handler imports the result; no service ever sees Clerk.

```ts
// lib/auth/ctx.ts
import "server-only";                                   // C1
import { auth } from "@clerk/nextjs/server";
import type { Ctx } from "./types";                     // { userId, orgId, orgRole }

export async function requireCtx(): Promise<Ctx> {
  const { userId, orgId, orgRole } = await auth();      // the ONLY auth() call in the repo — C2
  if (!userId || !orgId) throw new Error("unauthenticated");
  return { userId, orgId, orgRole: orgRole as Ctx["orgRole"] };
}
```

`Ctx` is the boundary object from [C2](./_conventions.md#c2). Org resolution + role checks belong to [`clerk-organizations.md`](./clerk-organizations.md); here, just note that `requireCtx()` is the membrane.

### The Server Action pattern (a write — B4)

One file per domain in `app/actions/`, mirroring `lib/services/`. Every action follows the same four steps — validate, resolve, call, revalidate — wrapped in the generic-error envelope. Real example, the `createTenant` service wrapped as an action:

```ts
// app/actions/tenants.ts
"use server";                                            // every export here is a server entry point

import { revalidateTag } from "next/cache";
import { requireCtx } from "@/lib/auth/ctx";
import { NewTenantSchema, TenantPatchSchema } from "@/lib/data/types/tenant";
import { createTenant, updateTenant } from "@/lib/services/tenants";

export async function createTenantAction(raw: unknown) {
  const input = NewTenantSchema.parse(raw);              // 1. validate at the edge — C4
  const ctx   = await requireCtx();                      // 2. resolve Ctx — C2
  try {
    const tenant = await createTenant(ctx, input);        // 3. call the pure service
    revalidateTag(`tenants:${ctx.orgId}`, "max");          // 4. bust the org-scoped cache tag
    return { ok: true as const, tenant };
  } catch (e) {
    console.error("createTenantAction", e);               // log the real error — C5
    return { ok: false as const, error: "Could not create tenant" };
  }
}

export async function updateTenantAction(id: string, raw: unknown) {
  const patch = TenantPatchSchema.parse(raw);
  const ctx   = await requireCtx();
  try {
    const tenant = await updateTenant(ctx, id, patch);     // ownership check lives in the service — C3
    revalidateTag(`tenants:${ctx.orgId}`, "max");
    return { ok: true as const, tenant };
  } catch (e) {
    console.error("updateTenantAction", e);
    return { ok: false as const, error: "Could not update tenant" };
  }
}
```

Note what is **not** here: no `db`, no `eq(...)`, no `auth()`-derived filtering. The action is transport + validation; the service ([`drizzle.md`](./drizzle.md) §4) is data + scoping. The cache tag is **org-scoped** (`tenants:${ctx.orgId}`) so one org's write never invalidates another's read — the same C3 reasoning as the query `WHERE`.

### Server Components calling read services (org-scoping — properties)

A Server Component is `async` and calls a read service straight. No action, no `fetch`. Reads don't `revalidateTag`; they're tagged so writes can bust them.

```ts
// app/properties/page.tsx  (illustrative — Option A has no real pages yet)
import { requireCtx } from "@/lib/auth/ctx";
import { listProperties } from "@/lib/services/properties";

export default async function Page() {
  const ctx        = await requireCtx();
  const properties = await listProperties(ctx);          // service filters WHERE org_id = ctx.orgId — C3
  return <PropertyList properties={properties} />;        // <PropertyList> may be "use client"
}
```

### The transactional write at the edge (pillar_verifications — B6)

The action stays thin even when the service does an atomic multi-table write. All the transaction logic lives in the service ([`drizzle.md`](./drizzle.md) §6); the action just validates, resolves, calls, and revalidates **both** affected tags:

```ts
// app/actions/verification.ts
"use server";
import { revalidateTag } from "next/cache";
import { requireCtx } from "@/lib/auth/ctx";
import { SubmitVerificationSchema } from "@/lib/data/types/verification";
import { submitVerification } from "@/lib/services/verification";

export async function submitVerificationAction(raw: unknown) {
  const input = SubmitVerificationSchema.parse(raw);     // { propertyId, pillar, docIds }
  const ctx   = await requireCtx();
  try {
    const verification = await submitVerification(ctx, input);  // tx: 1 verification + N evidence + 1 event
    revalidateTag(`verifications:${ctx.orgId}`, "max");
    revalidateTag(`properties:${ctx.orgId}`, "max");      // "Valgate Verified" is derived from these
    return { ok: true as const, verification };
  } catch (e) {
    console.error("submitVerificationAction", e);
    return { ok: false as const, error: "Could not submit verification" };
  }
}
```

### Route Handlers — the Option-B promotion point

In Option A (D13) `app/api/` is **empty** — we don't expose HTTP. It exists in this doc because it is the *named upgrade path*: the day Pro needs its own deployment (Option B), the **same service** becomes an API handler. The edge swaps `auth()`-from-session for `auth()`-from-forwarded-token; the service body is unchanged — that is C2 paying off.

```ts
// app/api/tenants/route.ts  — FUTURE (Option B). Not built in Option A.
import { revalidateTag } from "next/cache";
import { requireCtx } from "@/lib/auth/ctx";
import { NewTenantSchema } from "@/lib/data/types/tenant";
import { createTenant, listTenants } from "@/lib/services/tenants";

export async function GET(req: Request) {
  const ctx = await requireCtx();                        // same Ctx membrane — C2
  const propertyId = new URL(req.url).searchParams.get("propertyId")!;
  return Response.json(await listTenants(ctx, propertyId));   // same service as the page used
}

export async function POST(req: Request) {
  const input = NewTenantSchema.parse(await req.json()); // validate at the edge — C4
  const ctx   = await requireCtx();
  try {
    const tenant = await createTenant(ctx, input);         // ← identical service call to the action
    revalidateTag(`tenants:${ctx.orgId}`, "max");
    return Response.json(tenant, { status: 201 });
  } catch (e) {
    console.error("POST /api/tenants", e);
    return Response.json({ error: "Could not create tenant" }, { status: 500 }); // generic — C5
  }
}
```

Compare this `POST` body to `createTenantAction`: the middle three lines are identical. Only the envelope (RPC return vs `Response.json`) differs. That symmetry is the whole point of keeping services transport-pure.

## §5 — Gotchas & version traps

- **🔴 `"use server"` is not `server-only`.** `"use server"` marks a function as a callable *entry point* (RPC) — its args cross a trust boundary and **must** be validated (C4). `import "server-only"` (C1) is the opposite: it *forbids* a module from reaching the client. Services use `server-only`; actions use `"use server"`. Don't swap them.
- **Never call `auth()`/`cookies()`/`headers()` inside a service.** They only work in the request scope (action/handler/component) and would smuggle transport into `lib/services/` — breaking [C2](./_conventions.md#c2) and the Option-B path. Resolve once in `requireCtx()`, pass `Ctx` down.
- **`revalidateTag` is server-only and must run *after* the write.** It can't be called in a Client Component or during render. Call it in the action's success path. Our tags are **org-scoped** (`tenants:${ctx.orgId}`) — a global `"tenants"` tag would leak one org's invalidations into another's cache.
- **`revalidateTag` signature changed.** Modern Next takes `revalidateTag(tag, "max")` (stale-while-revalidate); the one-arg `revalidateTag(tag)` form is deprecated. Use the two-arg form. ([docs](https://nextjs.org/docs/app/api-reference/functions/revalidateTag).)
- **Action args are unknown until parsed.** A Server Action's arguments arrive from the network deserialized but **untrusted** — type them `unknown` (or `: unknown`) and run the Zod schema first. A typed parameter is a lie the compiler can't enforce across the RPC boundary.
- **Route-handler `params` is a `Promise` in 15.** `{ params }: { params: Promise<{ id: string }> }` — `await params`. Older snippets show a plain object; don't mix.
- **Don't return raw errors.** `return { error: e.message }` leaks internals. Catch, `console.error` the real one, return a fixed generic string ([C5](./_conventions.md#c5)). Grep-audited at B9.

## §6 — Reusable patterns

**The action envelope** (copy for every write entry point):

```ts
export async function <verb><Entity>Action(/* ids… */, raw: unknown) {
  const input = <Schema>.parse(raw);          // validate — C4
  const ctx   = await requireCtx();           // resolve Ctx — C2
  try {
    const result = await <service>(ctx, /* … */);   // call the pure service
    revalidateTag(`<entity>:${ctx.orgId}`, "max");   // bust org-scoped cache
    return { ok: true as const, result };
  } catch (e) {
    console.error("<verb><Entity>Action", e);        // log real — C5
    return { ok: false as const, error: "Could not <verb> <entity>" };  // generic out
  }
}
```

**Add a new write entry point** (the recipe, after the service exists per [`drizzle.md`](./drizzle.md) §6):
1. Add the function to `app/actions/<domain>.ts` under the file's `"use server"`.
2. Parse input with the canonical Zod schema from `lib/data/types/` (C4).
3. `await requireCtx()` → pass `ctx` first to the service (C2).
4. On success, `revalidateTag` every org-scoped tag the write affects.
5. Wrap in the catch→log→generic envelope (C5); write the goal-test ([C9](./_conventions.md#c9)).

**Reading in a Server Component** (no envelope — let render-time errors surface to the error boundary):

```ts
const ctx  = await requireCtx();
const rows = await list<Entity>(ctx /* , scopeId */);   // service is org-scoped — C3
```

**Promote a service to HTTP (Option B)** — wrap the *same* service call in a Route Handler; only the envelope changes:

```ts
export async function POST(req: Request) {
  const input = <Schema>.parse(await req.json());
  const ctx   = await requireCtx();
  const result = await <service>(ctx, input);          // ← unchanged from the action
  return Response.json(result, { status: 201 });
}
```

## §7 — Going deeper

- Server Actions & Mutations (full guide) — https://nextjs.org/docs/app/getting-started/updating-data
- `"use server"` directive reference — https://nextjs.org/docs/app/api-reference/directives/use-server
- Server & Client Components — https://nextjs.org/docs/app/getting-started/server-and-client-components
- Route Handlers (`route.ts`) — https://nextjs.org/docs/app/api-reference/file-conventions/route
- `revalidateTag` / `revalidatePath` — https://nextjs.org/docs/app/api-reference/functions/revalidateTag
- Caching & `use cache` / `cacheTag` — https://nextjs.org/docs/app/getting-started/caching
- `next/headers` (`cookies`, `headers`) — edge-only, never in services — https://nextjs.org/docs/app/api-reference/functions/cookies
- The `Ctx` membrane & org/role checks live in [`clerk.md`](./clerk.md) / [`clerk-organizations.md`](./clerk-organizations.md); the services it calls in [`drizzle.md`](./drizzle.md).
