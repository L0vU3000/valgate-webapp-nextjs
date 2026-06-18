# Drizzle ORM — Valgate guide

> Role: the type-safe layer between our TypeScript and NeonDB Postgres — schema, queries, transactions.
> Version pinned: `drizzle-orm` ^0.36 · Last verified: 2026-06-11 against orm.drizzle.team/docs.
> Decisions: D1 (driver mode), D2 (flat-first schema), D5–D8 (tightening, money, dates, ids), D14 (org-scoping).
> Build phases: B0 (client), B1 (schema), B3 (read services), B4 (write services), B6 (verification).
> Official docs: https://orm.drizzle.team/docs/overview · Neon connect: https://orm.drizzle.team/docs/connect-neon

---

## §0 — Cheat-sheet

```ts
// import the client (server-only — C1)
import { db } from "@/lib/db/client";
import { tenants } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// SELECT (org-scoped — C3)
const rows = await db.select().from(tenants).where(eq(tenants.orgId, ctx.orgId));

// INSERT … RETURNING
const [row] = await db.insert(tenants).values({ id, orgId: ctx.orgId, … }).returning();

// UPDATE … RETURNING (check ownership in the WHERE — C3)
const [row] = await db.update(tenants)
  .set({ rent }).where(and(eq(tenants.id, id), eq(tenants.orgId, ctx.orgId))).returning();

// DELETE
await db.delete(tenants).where(and(eq(tenants.id, id), eq(tenants.orgId, ctx.orgId)));

// TRANSACTION (needs the Pool driver — see §5)
await db.transaction(async (tx) => { … });
```

```bash
npx drizzle-kit generate   # make a migration from schema changes  (see drizzle-kit.md)
npx drizzle-kit migrate    # apply migrations
npm run db:ping            # SELECT now() — proves the connection
```

The five facts that matter most: **(1)** we use the **WebSocket Pool** driver, not http (§5). **(2)** schema is **flat from `schema.sql`** (D2). **(3)** every query is **org-scoped** ([C3](./_conventions.md#c3)). **(4)** the **mapper** converts DB→FE types ([C7](./_conventions.md#c7)). **(5)** IDs come from **`nextId()`**, not the DB ([C8](./_conventions.md#c8)).

## §1 — Why it's in our stack

Neon is raw Postgres; something has to turn TypeScript into SQL with types. We chose **Drizzle** (D1): it reads like SQL (near-zero learning curve for a beginner who knows SQL), is type-safe straight from a schema you can read, has **zero codegen step**, and ships a first-class Neon serverless driver. We rejected **Prisma** (heavier, codegen "magic" — worse for learning), **Kysely** (fine, but less batteries-included for migrations), and **raw SQL** (hand-maintained types). The decisive factor: this plan needs real transactions (D8 counters, B2 seed, B6 atomic verification writes), and Drizzle gives them cleanly on the right driver (§5).

## §2 — Setup in our stack

```bash
npm i drizzle-orm @neondatabase/serverless ws
npm i -D drizzle-kit
```

`DATABASE_URL` is validated through `@t3-oss/env-nextjs` — see [`env-nextjs.md`](./env-nextjs.md), never read `process.env` directly.

**`lib/db/client.ts`** — the one connection (server-only, Pool driver per D1):

```ts
import "server-only";                       // C1
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";   // ← Pool driver, NOT neon-http
import ws from "ws";
import { neonConfig } from "@neondatabase/serverless";
import * as schema from "./schema";
import { env } from "@/lib/env";

neonConfig.webSocketConstructor = ws;       // Node has no global WebSocket
const pool = new Pool({ connectionString: env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
```

**`drizzle.config.ts`** (project root) — points Drizzle Kit at the schema and Neon; details in [`drizzle-kit.md`](./drizzle-kit.md).

**`lib/db/schema/`** — one file per domain (`property.ts`, `rental.ts`, `safety.ts`, `ownership.ts`, `estate.ts`, `documents.ts`, `people.ts`, `notifications.ts`, `verification.ts`), re-exported from `lib/db/schema/index.ts`. Mirrors the source DDL grouping in `reference/schema/schema.sql`.

## §3 — Mental model (minimal)

Four ideas; everything else, follow the links in §7.

1. **The schema object is the source of truth.** `pgTable(...)` definitions generate both the TypeScript types *and* the SQL migrations. You edit the schema, then `drizzle-kit generate` writes the SQL.
2. **`$inferSelect` / `$inferInsert`** give you the row's read/write TypeScript types for free — `typeof tenants.$inferSelect`.
3. **Queries are builders.** `db.select().from(t).where(...)` returns a promise of rows. Operators (`eq`, `and`, `inArray`, …) are imported from `drizzle-orm`.
4. **Two query styles:** the **SQL-like** core API (what we use for services — explicit, predictable) and the **relational** query API (`db.query.tenants.findMany`). We default to the core API; reach for relational only when a nested fetch is genuinely cleaner.

## §4 — How we use it in Valgate

### Defining a table (flat, from `schema.sql`, with our deltas)

We port `reference/schema/schema.sql` table-by-table into Drizzle, applying the D5–D8 + D14 tightenings. Real example — `tenants`:

```ts
// lib/db/schema/rental.ts
import { pgTable, text, numeric, timestamp, pgEnum, index, uniqueIndex } from "drizzle-orm/pg-core";
import { properties } from "./property";
import { organizations } from "./identity";

export const tenantStatus = pgEnum("tenant_status", ["Paid", "Overdue", "Pending"]);

export const tenants = pgTable("tenants", {
  id:         text("id").primaryKey(),                               // TEN-0007 — C8, NOT a serial
  orgId:      text("org_id").notNull().references(() => organizations.id),  // C3 / D14
  userId:     text("user_id").notNull(),                             // "created by" — C3
  propertyId: text("property_id").notNull().references(() => properties.id),
  name:       text("name").notNull(),
  unit:       text("unit").notNull(),
  rent:       numeric("rent", { precision: 14, scale: 2 }).notNull(),  // D6 — money is numeric, never float
  status:     tenantStatus("status").notNull(),
  email:      text("email"),                                         // FE type is .optional() → C6
  phone:      text("phone"),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),  // D7
}, (t) => [
  index("ix_tenants_org").on(t.orgId),         // every table indexes its scope key — C3
  index("ix_tenants_property").on(t.propertyId),
]);
```

Notes that recur on every table: **TEXT id** (not `serial`) for D8; **`org_id` + index** for C3/D14; **`numeric`** for money (D6); **`timestamp({ withTimezone: true })`** for dates (D7); columns the FE marks `.optional()` are nullable here and handled by `stripNulls` (C6).

The composite-unique idiom (used on `pillar_verifications` — one row per property+pillar):

```ts
}, (t) => [
  uniqueIndex("uq_property_pillar").on(t.propertyId, t.pillar),
  index("ix_pv_org").on(t.orgId),
]);
```

### The service layer (the only place Drizzle is called)

One file per entity in `lib/services/`. Pages and actions never touch `db` directly — they call services. Every function follows this template ([C2](./_conventions.md#c2) context, [C3](./_conventions.md#c3) scoping, [C6](./_conventions.md#c6)/[C7](./_conventions.md#c7) mapping):

```ts
// lib/services/tenants.ts
import "server-only";                                   // C1
import { db } from "@/lib/db/client";
import { tenants } from "@/lib/db/schema";
import { TenantSchema, type Tenant } from "@/lib/data/types/tenant";  // canonical FE type — D4
import { stripNulls } from "./_mapping";
import { nextId } from "./_ids";
import { eq, and } from "drizzle-orm";
import type { Ctx } from "@/lib/auth/ctx";

// The single DB→FE conversion point — C7.
function rowToTenant(row: typeof tenants.$inferSelect): Tenant {
  return TenantSchema.parse(stripNulls({
    ...row,
    rent: Number(row.rent),                 // numeric → number   (D6 / C7)
    createdAt: row.createdAt.getTime(),     // timestamptz → ms   (D7 / C7)
  }));
}

export async function listTenants(ctx: Ctx, propertyId: string): Promise<Tenant[]> {
  const rows = await db.select().from(tenants)
    .where(and(eq(tenants.orgId, ctx.orgId), eq(tenants.propertyId, propertyId)));  // C3
  return rows.map(rowToTenant);
}

export async function createTenant(ctx: Ctx, input: NewTenantInput): Promise<Tenant> {
  const id = await nextId("TEN");                       // C8 — id from the counter, not the DB
  const [row] = await db.insert(tenants)
    .values({ id, orgId: ctx.orgId, userId: ctx.userId, ...input }).returning();
  return rowToTenant(row);
}

export async function updateTenant(ctx: Ctx, id: string, patch: TenantPatch): Promise<Tenant> {
  const [row] = await db.update(tenants).set(patch)
    .where(and(eq(tenants.id, id), eq(tenants.orgId, ctx.orgId)))   // ownership IN the WHERE — C3
    .returning();
  if (!row) throw new Error("not found");                // never leak whether it existed — C5
  return rowToTenant(row);
}
```

The ~5 read + write functions per entity all look like this. Predictability is the point.

## §5 — Gotchas & version traps

- **🔴 Driver mode — the one that strands a beginner mid-build (D1).** The `neon-http` driver **throws on `db.transaction()`**. We need transactions (counters, seed, verification). So `client.ts` imports from **`drizzle-orm/neon-serverless`** with a `Pool`, *not* `drizzle-orm/neon-http`. If you copy a "Drizzle + Neon" snippet off the web and hit *"No transactions support in neon-http driver"*, this is why.
- **`ws` + `neonConfig.webSocketConstructor`.** Node has no global `WebSocket`. Without `neonConfig.webSocketConstructor = ws` the Pool driver fails to connect at runtime (not at build).
- **`numeric` comes back as a `string`.** Postgres `numeric` is returned by the driver as a JS *string* to preserve precision. The mapper's `Number(row.rent)` is mandatory — forget it and the FE gets `"1200.00"` instead of `1200`. ([C7](./_conventions.md#c7).)
- **`null` vs `.optional()`.** Drizzle returns `null` for empty nullable columns; the Zod types expect `undefined`. Parse fails without `stripNulls`. ([C6](./_conventions.md#c6).)
- **Don't use `serial`/`uuid` ids.** Our PKs are TEXT from `nextId()` (D8/[C8](./_conventions.md#c8)). A `serial` column would break every seed reference and URL.
- **Index callback returns an array.** Current syntax is `(t) => [ index(...).on(...) ]` (v0.31+). Older guides show an object `(t) => ({ ... })` — don't mix them.

## §6 — Reusable patterns

**Add a new entity** (the repeatable recipe):
1. Add the `pgTable` to the right `lib/db/schema/<domain>.ts` (TEXT id, `org_id` + index, tightened types).
2. `npx drizzle-kit generate` → review the SQL → `migrate` ([`drizzle-kit.md`](./drizzle-kit.md)).
3. Add `lib/services/<entity>.ts` from the §4 template (mapper + 5 functions).
4. Register the id prefix in the `id_counters` seed.
5. Write the goal-test ([C9](./_conventions.md#c9)).

**A transactional write** (B6 verification — all-or-nothing, needs the Pool driver):

```ts
await db.transaction(async (tx) => {
  const [v]  = await tx.insert(pillarVerifications).values({ id: await nextId("VRF"), orgId: ctx.orgId, … }).returning();
  await tx.insert(verificationEvidence).values(docIds.map((d) => ({ id: …, verificationId: v.id, documentId: d })));
  await tx.insert(verificationEvents).values({ id: …, verificationId: v.id, event: "submitted", actorId: ctx.userId });
});  // a bad doc id rolls back ALL of it
```

**The atomic id counter** ([C8](./_conventions.md#c8)) — single statement, race-free without a transaction:

```ts
export async function nextId(collection: string): Promise<string> {
  const [r] = await db.execute(
    sql`UPDATE id_counters SET next = next + 1 WHERE collection = ${collection} RETURNING next`
  );
  return `${collection}-${String(r.next).padStart(4, "0")}`;   // → "TEN-0007"
}
```

**`inArray` for batch reads** (e.g. tenants for many properties): `where(and(eq(tenants.orgId, ctx.orgId), inArray(tenants.propertyId, ids)))`.

## §7 — Going deeper

- SQL-select / operators reference — https://orm.drizzle.team/docs/select
- Insert / update / delete + `.returning()` — https://orm.drizzle.team/docs/insert
- Relational query API (`db.query…`) — https://orm.drizzle.team/docs/rqb
- Column types (full Postgres set) — https://orm.drizzle.team/docs/column-types/pg
- Indexes & constraints (extended API) — https://orm.drizzle.team/docs/indexes-constraints
- Transactions — https://orm.drizzle.team/docs/transactions
- Neon connection (http vs Pool) — https://orm.drizzle.team/docs/connect-neon
- Migrations live in [`drizzle-kit.md`](./drizzle-kit.md); the driver itself in [`neon.md`](./neon.md).
