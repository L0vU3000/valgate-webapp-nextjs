# Zod v4 — Valgate guide

> Role: runtime validation **and** the canonical type contract — the Zod schemas in `lib/data/types/` ARE the frontend contract; TS types derive from them via `z.infer`.
> Version pinned: `zod` ^4 · Last verified: 2026-06-11 against zod.dev (v4 API + v4 changelog).
> Decisions: D4-revised (Zod types are owned/copied into this repo). Conventions: [C4](./_conventions.md#c4) (validate at the edge), [C6](./_conventions.md#c6) (null vs `.optional()`), [C7](./_conventions.md#c7) (DB→FE conversion in the mapper).
> Build phases: B0.5 (types copied in), B2 (seed Zod-parses each record), B3/B4 (service mappers re-parse), B5 (action-edge input validation).
> Official docs: https://zod.dev · v4 changes: https://zod.dev/v4/changelog

---

## §0 — Cheat-sheet

```ts
// types live in lib/data/types/, derive TS from the schema (never hand-write the type)
import { TenantSchema, type Tenant } from "@/lib/data/types/tenant"; // type = z.infer<typeof TenantSchema>

// 1. validate INPUT at the action edge — C4
const input = NewTenantSchema.parse(formData);   // throws ZodError → caught at the edge
const r = NewTenantSchema.safeParse(formData);   // { success, data | error } — no throw

// 2. re-parse service OUTPUT as a drift alarm — C4
return TenantSchema.parse(stripNulls(mappedRow)); // stripNulls is MANDATORY — C6

// 3. v4 top-level format validators (NOT z.string().email())
z.email(); z.url(); z.uuid();

// 4. v4 error customization — ONE `error` param (no message/required_error/invalid_type_error)
z.string({ error: "Name is required" });
z.string().min(1, { error: "Too short" });
```

The five facts that matter most: **(1)** the schemas in `lib/data/types/` **are the contract** — own them, don't drift them (D4). **(2)** TS types come from **`z.infer`**, never hand-written. **(3)** validate **inputs at the edge**, re-parse **outputs in the mapper** ([C4](./_conventions.md#c4)). **(4)** **`stripNulls` before every parse** or `null` from Postgres throws against `.optional()` ([C6](./_conventions.md#c6)). **(5)** this is **v4** — the syntax differs from every v3 snippet you'll find online (§5).

## §1 — Why it's in our stack

The frontend already validated and typed its data with Zod, and under **D4** those exact types are the seam the backend must honor unchanged. The revised D4 (`02-plan-updates-2026-06-11.md`) moves them **into this repo** — they used to live in the frontend repo, but a fresh standalone backend (D13) can't import across repos, so the canonical schemas are **copied in and owned here** under `lib/data/types/`. Zod earns its place twice: it is the *type source* (every entity type is `z.infer` of a schema, so type and validator can never disagree) and the *runtime guard* (parse at the edge, re-parse outputs to catch DB↔FE drift the moment it appears). We didn't "choose" Zod over alternatives — it is inherited contract; the job is to match it exactly.

## §2 — Setup in our stack

```bash
npm i zod              # ^4 — also pulled in transitively by @t3-oss/env-nextjs and drizzle-zod if used
```

The canonical schemas are **copied verbatim** from the frontend into `lib/data/types/` (one file per entity: `tenant.ts`, `property.ts`, …, plus the shared `_common.ts`). Reference copies live in `reference/frontend-data-layer/types/` — that folder is the *import source* for the copy, not a runtime dependency. Do **not** edit the shapes to suit the DB; all DB→FE conversion happens in the service mapper ([C7](./_conventions.md#c7)), never by loosening a schema.

`_common.ts` holds the shared leaf schemas every entity reuses:

```ts
// lib/data/types/_common.ts
export const idSchema        = z.string().min(1);          // "TEN-0007"
export const userIdSchema    = z.string().min(1);
export const propertyIdSchema = z.string().min(1);
export const timestampSchema = z.number().int().nonnegative();  // ms-epoch — C7 converts timestamptz → this
```

## §3 — Mental model (minimal)

Three ideas; everything generic is in §7.

1. **Schema first, type second.** You write a `z.object({...})`; the TypeScript type is `z.infer<typeof Schema>`. Editing the schema edits the type. Never declare the type by hand — that reintroduces the drift Zod exists to kill.
2. **`.parse()` throws, `.safeParse()` doesn't.** `parse` throws a `ZodError`; `safeParse` returns `{ success, data?, error? }`. At the action edge we generally `parse` and let the edge's try/catch turn it into a generic message ([C5](./_conventions.md#c5)). In the seed (B2) we `safeParse` per record to report *which* row is dirty.
3. **`.optional()` means `undefined`, not `null`.** This is the single most expensive Zod fact in this codebase — Postgres speaks `null`, Zod `.optional()` speaks `undefined`, and they are not interchangeable (§5, [C6](./_conventions.md#c6)).

## §4 — How we use it in Valgate

### Where the types live and how the type is derived

```ts
// lib/data/types/tenant.ts  — owned here per revised D4, copied from the FE
import { z } from "zod";
import { idSchema, propertyIdSchema } from "./_common";

export const TenantSchema = z.object({
  id:         idSchema,
  propertyId: propertyIdSchema,
  name:       z.string().min(1),
  unit:       z.string().min(1),
  rent:       z.number().nonnegative(),                 // a NUMBER on the FE — the mapper does Number(row.rent), C7
  status:     z.enum(["Paid", "Overdue", "Pending"]),
  email:      z.string().optional(),                    // undefined when empty — NOT null, C6
  phone:      z.string().optional(),
});

export type Tenant       = z.infer<typeof TenantSchema>; // <- the type the whole app uses
export type TenantStatus = Tenant["status"];             // derive sub-types by indexing, never re-enum
```

Note what is *not* here: no `orgId`, no `userId`, no `createdAt`. The FE contract is the FE's shape; the DB carries extra columns (org-scoping, audit) that the mapper drops or converts ([C7](./_conventions.md#c7)). Keeping `TenantSchema` identical to the frontend's is the whole point of D4.

### Parse at the edge (inputs) — C4

Inputs are validated in the action/handler **before** a service is called. Define a dedicated *input* schema (the create/patch shape), not the full entity schema:

```ts
// lib/actions/tenants.actions.ts  (the edge)
"use server";
const NewTenantSchema = TenantSchema.pick({ propertyId: true, name: true, unit: true, rent: true, status: true })
  .extend({ email: z.string().optional(), phone: z.string().optional() });

export async function createTenantAction(form: unknown) {
  const ctx   = await resolveCtx();              // auth() → Ctx happens HERE, never in the service (C2)
  const input = NewTenantSchema.parse(form);     // throws ZodError on bad input → caught below
  return createTenant(ctx, input);               // service receives already-validated input
}
```

Use `.pick()` / `.extend()` to derive input schemas from the entity schema so they can't drift from it. For composed entities, `Property` is itself built by composition — `PropertySchema = PropertyCoreSchema.merge(PropertyLocationSchema).merge(...)` in the FE copy. (`.merge()` still works in v4 but is deprecated — prefer `.extend()` or `{ ...A.shape, ...B.shape }` if you ever re-author one; see §5.)

### Re-parse outputs in the mapper (drift alarm) — C4 + C6 + C7

The service mapper is the single DB→FE conversion point. It converts tightened DB types to FE types, strips nulls, then **re-parses** against the canonical schema — so any drift between the DB and the contract throws *here*, in a test, not in the browser:

```ts
// lib/services/tenants.ts
function rowToTenant(row: typeof tenants.$inferSelect): Tenant {
  return TenantSchema.parse(stripNulls({          // re-parse = the drift alarm (C4)
    ...row,
    rent:      Number(row.rent),                  // numeric → number   (D6 / C7)
    createdAt: row.createdAt.getTime(),           // timestamptz → ms   (D7 / C7) — dropped by .parse if not in schema
  }));
}
```

`stripNulls` lives in `lib/services/_mapping.ts` and runs on **all 25 mappers** — it is not optional ([C6](./_conventions.md#c6)). Without it, `row.email === null` from Postgres fails `email: z.string().optional()` and the mapper throws on a perfectly valid row.

The seed (B2) uses the same schemas in `safeParse` mode to catch dirty fixture data per record:

```ts
const r = TenantSchema.safeParse(record);
if (!r.success) console.error(`bad tenant ${record.id}:`, r.error.issues); // report, never loosen the schema
```

## §5 — Gotchas & version traps

- **🔴 This is Zod v4 — most snippets online are v3.** The syntax diverged. The three that bite first:
  - **Top-level format validators.** v4 uses `z.email()`, `z.url()`, `z.uuid()`. The v3 method form `z.string().email()` / `.url()` / `.uuid()` is **deprecated** in v4. (Our schemas mostly use bare `z.string().optional()` for email, so this bites most when you *add* stricter validation — write `z.email().optional()`, not `z.string().email().optional()`.)
  - **Error customization is one `error` param.** v3's `message`, `required_error`, `invalid_type_error`, and `errorMap` are **gone**, replaced by a single `error` (string or `(issue) => string`): `z.string({ error: "Required" })` and `z.string().min(1, { error: "Too short" })`. A v3 snippet with `{ required_error: ... }` silently does nothing useful in v4.
  - **`z.nativeEnum()` is deprecated** — use `z.enum([...])` (which is what every Valgate status field already does).
- **🔴 `null` vs `.optional()` — the one that breaks every mapper ([C6](./_conventions.md#c6)).** `.optional()` accepts **`undefined`**, not `null`. `TenantSchema.parse({ email: null, ... })` **throws** even though the row is valid, because Postgres returns `null` for empty columns. Fix: `stripNulls(row)` (null→undefined) **before** every `.parse`. If you need a field to genuinely accept null, that's `.nullable()` (allows null) or `.nullish()` (allows both) — but our contract uses `.optional()`, so we normalize at the boundary instead of changing the schema.
- **`z.infer` is the only type source.** Never write `type Tenant = { ... }` alongside the schema. Always `z.infer<typeof TenantSchema>`. Index for sub-types (`Tenant["status"]`) instead of re-declaring an enum.
- **`.default()` now applies inside `.optional()` in v4.** `z.string().default("x").optional()` parses `{}` to `{ a: "x" }` in v4 (it stayed `{}` in v3). Use `.prefault()` for the old behavior. We rarely use defaults (the DB owns them), but don't assume v3 behavior if you add one.
- **`numeric` arrives as a string, but the schema says `z.number()`.** That's a [C7](./_conventions.md#c7) mapper job (`Number(row.rent)`), not a schema change — never relax `rent` to `z.string()` to "make it parse." Note `PropertyFinance.purchasePrice` *is* `z.string().optional()` in the contract (FE displays it as text) — match the contract field-by-field, don't homogenize.

## §6 — Reusable patterns

**Derive an input schema from an entity schema** (so it can't drift):

```ts
const NewX   = XSchema.pick({ a: true, b: true });        // create payload
const XPatch = XSchema.partial().pick({ a: true, b: true }); // partial update
```

**The mapper boilerplate** (every entity, [C4](./_conventions.md#c4)/[C6](./_conventions.md#c6)/[C7](./_conventions.md#c7)):

```ts
function rowToX(row: typeof xs.$inferSelect): X {
  return XSchema.parse(stripNulls({
    ...row,
    /* numeric → Number(...), timestamptz → .getTime() */
  }));
}
```

**`stripNulls`** ([C6](./_conventions.md#c6)) — the one helper that makes every parse survive Postgres nulls:

```ts
// lib/services/_mapping.ts
export function stripNulls<T extends Record<string, unknown>>(row: T) {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k, v === null ? undefined : v]),
  ) as { [K in keyof T]: Exclude<T[K], null> | undefined };
}
```

**Validate-at-the-edge skeleton** ([C4](./_conventions.md#c4)/[C5](./_conventions.md#c5)):

```ts
export async function action(form: unknown) {
  const parsed = Schema.safeParse(form);
  if (!parsed.success) return { ok: false, error: "Invalid input" }; // generic outward — C5, never expose .issues
  return service(await resolveCtx(), parsed.data);
}
```

## §7 — Going deeper

- v3 → v4 migration / changelog (read before copying any web snippet) — https://zod.dev/v4/changelog
- Full API (every validator, `.refine`, `.transform`, `.pick`/`.extend`/`.partial`) — https://zod.dev/api
- Error customization & formatting (`error` param, `z.treeifyError`, `.flatten`) — https://zod.dev/error-customization
- Basics & `safeParse` vs `parse` — https://zod.dev/basics
- The schemas themselves are the spec: `lib/data/types/` (owned, D4) · reference copies in `reference/frontend-data-layer/types/`.
- Edge-vs-service boundary and `Ctx` live in [`nextjs.md`](./nextjs.md); the DB→FE conversions in [`drizzle.md`](./drizzle.md) §4 and [C7](./_conventions.md#c7).
