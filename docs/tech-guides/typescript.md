# TypeScript — Valgate guide

> Role: the single language for the whole backend — but in *this* repo it is mostly a delivery mechanism for **Zod-derived types** (D4), not a place to hand-author interfaces.
> Version pinned: TypeScript ^5.6 · Last verified: 2026-06-11 against typescriptlang.org/docs.
> Decisions: D4 (Zod-first typing). Conventions: C1 (`server-only`), C2 (`Ctx`), C4 (validate at the edge), C6/C7 (mapper boundary).
> Official docs: https://www.typescriptlang.org/docs/handbook/intro.html · tsconfig reference: https://www.typescriptlang.org/tsconfig/

---

## §0 — Cheat-sheet

```ts
// 1. Types are DERIVED, never hand-written (D4). One source: the Zod schema.
import { TenantSchema } from "@/lib/data/types/tenant";
export type Tenant = z.infer<typeof TenantSchema>;        // ✅ the only way we make a domain type

// 2. The service context — same shape everywhere (C2). Import it, don't redeclare it.
import type { Ctx } from "@/lib/auth/ctx";
//   Ctx = { userId: string; orgId: string; orgRole: "owner" | "admin" | "member" }

// 3. DB row types come from Drizzle, free, no hand-typing.
import { tenants } from "@/lib/db/schema";
type TenantRow = typeof tenants.$inferSelect;             // read shape (SELECT)
type NewTenantRow = typeof tenants.$inferInsert;          // write shape (INSERT)

// 4. Path alias: always "@/…" from repo root — never "../../../lib/…".
import { db } from "@/lib/db/client";

// 5. Server-only modules announce it (C1) — and that changes their typing surface (§4).
import "server-only";
```

The five rules that matter most: **(1)** a domain type is **`z.infer<typeof Schema>`** — there are no hand-written `interface`s for data (D4). **(2)** `Ctx` is defined **once** and imported ([C2](./_conventions.md#c2)). **(3)** DB types come from **`$inferSelect`/`$inferInsert`**, never retyped. **(4)** imports use the **`@/`** alias. **(5)** **`any` is banned** — `unknown` + a Zod parse instead (§4).

## §1 — Why it's in our stack

TypeScript isn't a "decision" — Next.js, Drizzle, Clerk and Zod are all TS-native, so the language is a given. What *is* a decision is **how much typing we hand-write: almost none.** Under D4 the frontend's Zod schemas are the contract, copied into this repo and treated as the single source of truth for every data shape. TypeScript's job here is to *derive* from those schemas (`z.infer`) and from Drizzle (`$inferSelect`), so the type system and the runtime validators can never drift. The user preference recorded in the plan — **"long, simple, readable code"** — sets the tone: explicit over clever, no conditional-type gymnastics, no generic helper towers. If a junior reading the service top-to-bottom can't tell what a type is, the type is wrong.

## §2 — Setup in our stack (just the settings that bite)

The base config is whatever `create-next-app` emits; we only deviate where it matters. The flags that actually change how you write code here:

```jsonc
// tsconfig.json — the load-bearing lines
{
  "compilerOptions": {
    "strict": true,                       // bundles strictNullChecks, noImplicitAny, +7 more — non-negotiable
    "noUncheckedIndexedAccess": true,     // arr[i] is T | undefined — forces you to handle the empty case
    "verbatimModuleSyntax": true,         // `import "server-only"` is preserved, not tree-shaken away (C1 depends on this)
    "paths": { "@/*": ["./*"] },          // the @/ alias — see §0 rule 4
    "baseUrl": "."
  }
}
```

- **`strict: true`** turns on the whole strict family at once — most importantly `strictNullChecks` and `noImplicitAny`. The official list of what it bundles: https://www.typescriptlang.org/tsconfig/#strict. Do not enable strict flags individually; let the bundle carry them.
- **`noUncheckedIndexedAccess`** is the one beginners forget exists. With it, `rows[0]` is `Tenant | undefined`, which is *why* the service code writes `const [row] = …; if (!row) throw …`. Without it that guard looks pointless.
- **`verbatimModuleSyntax`** matters for [C1](./_conventions.md#c1): it stops the compiler from eliding the side-effect-only `import "server-only"` line.

`exactOptionalPropertyTypes` is **not** on — it interacts badly with the `null → undefined` boundary work that lives in the mapper ([C6](./_conventions.md#c6)); leave it off.

## §3 — Mental model (minimal)

One idea carries this whole doc: **types flow downhill from two generators, and you never write the middle.**

```
Zod schema (the D4 contract) ──z.infer──▶  domain type (Tenant, Property, …)
Drizzle pgTable (the DB shape) ──$inferSelect/$inferInsert──▶  row type (TenantRow)
                                            │
                            the service mapper is where these two meet (C6/C7)
```

You author the **schema** and the **table**; TypeScript derives everything else. The only types you write by hand are tiny *input* shapes for writes (e.g. `NewTenantInput`) — and even those are usually a Zod `.pick()`/`.omit()` away.

## §4 — How we use it in Valgate

### Zod-first typing — the one rule (D4)

A domain type is **always** `z.infer` of its schema. We do **not** keep a parallel `interface Tenant { … }` next to the schema — that is two sources of truth that silently diverge. Real example, verbatim from the contract:

```ts
// reference/frontend-data-layer/types/tenant.ts  (copied into lib/data/types/ under D4)
import { z } from "zod";
import { idSchema, propertyIdSchema } from "./_common";

export const TenantSchema = z.object({
  id: idSchema,
  propertyId: propertyIdSchema,
  name: z.string().min(1),
  unit: z.string().min(1),
  rent: z.number().nonnegative(),
  status: z.enum(["Paid", "Overdue", "Pending"]),
  email: z.string().optional(),
  phone: z.string().optional(),
});

export type Tenant = z.infer<typeof TenantSchema>;     // ← the type. Never a hand-written twin.
export type TenantStatus = Tenant["status"];           // derive sub-types by indexing, not re-listing the enum
```

Two derivations to copy from this:
- **Sub-types come from indexing** (`Tenant["status"]`), not a second `z.enum`. One list, one place.
- **Composed types use Zod composition**, then infer. `PropertySchema` is `PropertyCoreSchema.merge(...).merge(...)` and `type Property = z.infer<typeof PropertySchema>` — the four sub-schemas stay the source of truth (see `property.ts`).

> Zod-specific rules (v4 quirks, `.optional()` vs `null`, why we re-parse outputs) live in [`zod.md`](./zod.md) — this doc only covers the *TypeScript* side: `z.infer`.

### The `Ctx` type — defined once, imported everywhere ([C2](./_conventions.md#c2))

Every service function takes the same first argument. Its type is declared in exactly one place and imported — never re-spelled inline:

```ts
// lib/auth/ctx.ts
export type Ctx = {
  userId: string;                                  // Clerk user — "created by", not the access key (C3)
  orgId: string;                                   // active org — the scope key for every query (C3)
  orgRole: "owner" | "admin" | "member";           // checked before mutations (C3)
};
```

The edge (a Server Action / Route Handler) resolves Clerk `auth()` into a `Ctx` and passes it down; services stay transport-pure ([C2](./_conventions.md#c2)). In service signatures it's always `ctx: Ctx` first, validated input after — no `userId: string` loose params (that's the old pre-D14 shape from master-plan §8; D2-fork widened it to full `Ctx`).

### DB row types from Drizzle — `$inferSelect` / `$inferInsert`

The mapper needs the *DB* shape (tighter than the FE type: `numeric` is a string, dates are `Date`). Get it from the table, never hand-type it:

```ts
// lib/services/tenants.ts
import "server-only";                                      // C1
import { tenants } from "@/lib/db/schema";
import { TenantSchema, type Tenant } from "@/lib/data/types/tenant";
import type { Ctx } from "@/lib/auth/ctx";

// The DB→FE conversion point (C6/C7). Input type is $inferSelect; output type is the Zod-derived Tenant.
function rowToTenant(row: typeof tenants.$inferSelect): Tenant {
  return TenantSchema.parse(stripNulls({
    ...row,
    rent: Number(row.rent),               // DB string → number  (the types literally differ — C7)
    createdAt: row.createdAt.getTime(),   // Date → ms epoch     (C7)
  }));
}

export async function listTenants(ctx: Ctx, propertyId: string): Promise<Tenant[]> {
  const rows = await db.select().from(tenants)
    .where(and(eq(tenants.orgId, ctx.orgId), eq(tenants.propertyId, propertyId)));
  return rows.map(rowToTenant);
}
```

`typeof tenants.$inferSelect` *is* `{ id: string; rent: string; createdAt: Date; email: string | null; … }` — note it is **not** assignable to `Tenant` (different `rent`, different `createdAt`, `null` not `undefined`). That non-assignability is the point: the compiler forces every difference through the mapper. Use `$inferInsert` for the values you hand to `db.insert(...)`. Drizzle-side details of these types live in [`drizzle.md`](./drizzle.md).

### Banning `any` — use `unknown` + parse

`any` switches the type-checker off and is **not allowed** in service or edge code. The honest replacement is `unknown` narrowed by a Zod parse — which is exactly what we do at the edge anyway ([C4](./_conventions.md#c4)):

```ts
// edge (Server Action) — input arrives untyped, parse it into the type
export async function createTenantAction(raw: unknown) {       // unknown, never any
  const input = NewTenantSchema.parse(raw);                    // unknown → typed (C4)
  return createTenant(ctx, input);
}
```

If you reach for `any` to silence an error, the fix is almost always a Zod schema or a `$infer`, not a cast.

### Path alias `@/`

All cross-module imports use `@/` from repo root (`@/lib/db/client`, `@/lib/services/tenants`). Relative `../../..` chains are out — they break on file moves and obscure the layer a module lives in. Configured by `paths` in §2.

### `import "server-only"` — the typing implication

`server-only` is a runtime-and-build guard ([C1](./_conventions.md#c1)), but it has a typing consequence worth stating: a module that imports it **cannot** be imported by a Client Component, so its exported *types* are still freely importable (types are erased), but its exported *values* (the `db` client, a service function) are not. Practically: export `type Tenant` from a shared contract file with no `server-only`, but keep `db` and the services behind it. Keeping the type definitions (`lib/data/types/`) free of `server-only` is deliberate — the FE and edge import the types, only the backend imports the values.

## §5 — Gotchas & version traps

- **`noUncheckedIndexedAccess` is why `const [row] = …; if (!row)` exists.** `db.insert(...).returning()` is typed `Tenant[]`, so `row` is `Tenant | undefined`. The guard isn't defensive theatre — without it the compiler errors. Don't delete it.
- **`$inferSelect` ≠ the Zod type, on purpose.** New beginners try to `return row` directly and hit a type error on `rent`/`createdAt`/`null`. That error is the mapper telling you it has a job ([C6](./_conventions.md#c6)/[C7](./_conventions.md#c7)). Route it through `rowToX`, don't cast it away.
- **Don't hand-write an `interface` next to a Zod schema.** It compiles, it looks tidy, and it will silently rot the moment the schema changes. `z.infer` only (D4).
- **`verbatimModuleSyntax` + `import "server-only"`.** With older `isolatedModules`-style configs the compiler could drop a side-effect-only import. We rely on it surviving (C1) — keep `verbatimModuleSyntax: true`.
- **`exactOptionalPropertyTypes` is intentionally OFF.** Turning it on collides with the `null → undefined` mapper boundary (C6) and produces noise, not safety.
- **No `as` casts to paper over shape mismatches.** A cast moves the failure from compile-time to a 2am runtime Zod throw. Parse or map instead.

## §6 — Reusable patterns

**A new domain type** (keyed to "I need a `Foo` type"):
1. Write/copy the Zod schema in `lib/data/types/foo.ts`.
2. `export type Foo = z.infer<typeof FooSchema>;` — done. No interface.
3. Sub-types by indexing: `export type FooStatus = Foo["status"];`.

**A write-input type** (don't hand-list the fields):
```ts
// derive the insert shape from the canonical schema — omit server-set fields
export const NewTenantSchema = TenantSchema.omit({ id: true });   // id comes from nextId() (C8)
export type NewTenantInput = z.infer<typeof NewTenantSchema>;
```

**A service signature** (the fixed shape — [C2](./_conventions.md#c2)):
```ts
export async function fooAction(ctx: Ctx, id: string, patch: FooPatch): Promise<Foo> { … }
//                              ^Ctx first   ^typed input after   ^Zod-derived return
```

**Narrow `unknown` at the edge** (instead of `any`):
```ts
const input = SomeSchema.parse(raw);   // raw: unknown  →  input: T
```

## §7 — Going deeper

- Handbook (everything generic about the language) — https://www.typescriptlang.org/docs/handbook/intro.html
- tsconfig reference (every flag + what `strict` bundles) — https://www.typescriptlang.org/tsconfig/
- `strict` family breakdown — https://www.typescriptlang.org/tsconfig/#strict
- `noUncheckedIndexedAccess` — https://www.typescriptlang.org/tsconfig/#noUncheckedIndexedAccess
- Module resolution & `paths`/`baseUrl` — https://www.typescriptlang.org/docs/handbook/modules/reference.html
- Zod-side typing (`z.infer`, v4 traps) — [`zod.md`](./zod.md); Drizzle row types — [`drizzle.md`](./drizzle.md); the `server-only` boundary — [C1](./_conventions.md#c1).
