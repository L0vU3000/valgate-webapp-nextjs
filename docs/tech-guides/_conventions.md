# Cross-cutting conventions

Rules that apply across **every** technology in the stack. Stated once here; each tech guide links to the relevant rule (e.g. "see [C3](./_conventions.md#c3)") instead of restating it.

These are derived from the locked decisions (`01-master-implementation-plan.md` §8, `02-plan-updates-2026-06-11.md`). When a rule and a decision disagree, the decision doc wins and this file should be corrected.

---

## C1 — `server-only` everywhere the DB or secrets are touched

Any module that imports the Drizzle client, a secret, or Clerk's server `auth()` starts with:

```ts
import "server-only";
```

This makes the build **fail** if the module is ever pulled into a client bundle. The driver, connection string, and service layer must never reach the browser. *(Verified at each phase boundary with `next build` — no client chunk contains the driver.)*

## C2 — No ambient context inside services ⭐

> Services are **pure of transport**. No `cookies()`, no `headers()`, no Clerk `auth()`, no request object ever reaches inside `lib/services/`.

Every service function takes an explicit context as its first argument and validated input as the rest:

```ts
type Ctx = { userId: string; orgId: string; orgRole: "owner" | "admin" | "member" };

export async function listTenants(ctx: Ctx, propertyId: string): Promise<Tenant[]> { … }
```

The **edge** (a Server Action or Route Handler) resolves `auth()` → `Ctx`, then calls the service. This is the single rule that makes the whole **Option A → Option B** path cheap: the day Pro needs its own deployment, each service function becomes an API handler with the body unchanged — only the edge that builds `Ctx` changes. It is also the IDOR safeguard (see C3). *(D2-fork decision; extends master-plan §8 rule 1 from `userId` to full `Ctx`.)*

## C3 — Org-scoped access, not user-equality (D14)

The v1 plan filtered by `user_id` equality. Under multi-tenancy that is **replaced**:

- **Every read** filters by the caller's active `org_id`: `where(eq(table.orgId, ctx.orgId))`.
- **Every mutation** first verifies the target row belongs to `ctx.orgId` **and** that `ctx.orgRole` is sufficient — *before* touching it.
- `user_id` is kept on rows as **"created by,"** not as the access key.

A property belongs to an *org*; any member sees it per role. Clerk is the source of truth for membership; we mirror `organizations` / `users` / `organization_memberships` into Postgres for joins. *(D14.)*

## C4 — Inputs validated at the edge, outputs may be re-parsed

Zod-validate every input in the action/handler **before** it reaches a service. Services may re-parse their *outputs* against the canonical type (cheap drift alarm). The canonical Zod types are **owned by this repo** (copied from the frontend under the revised D4) and live in `lib/data/types/`. *(D4-revised, master-plan §8 rule 3.)*

## C5 — Errors: log internally, return generic outward

Never send `err.message` to the client. Catch, log the real error server-side, return a generic string ("Could not load tenants"). Grep-audited at B9. *(Master-plan §8 rule 4.)*

## C6 — `null` → `undefined` at the DB boundary

Postgres returns `null` for empty columns; the Zod types use `.optional()` (= `undefined`). `Schema.parse({ email: null })` therefore **fails** even when the shape is otherwise right. A shared `stripNulls(row)` helper in `lib/services/_mapping.ts` converts every `null` → `undefined` **before** parse. This hits all 25 mappers — it is not optional. *(Review MED-5.)*

## C7 — DB↔FE type conversions happen in the service mapper

The DB stores tighter types than the FE consumes. The `rowToX` mapper is the **single** conversion point:

- `numeric(14,2)` → `Number(...)` (plain dollars). *(D6.)*
- `timestamptz` → `.getTime()` (ms-epoch number). *(D7.)*

The FE Zod types are never changed — all shape conversion lives in the service layer. *(D4.)*

## C8 — IDs: TEXT primary keys + atomic counter (D8)

IDs keep their prefix scheme (`PROP-0042`, `TEN-0007`, `VRF-0001`) — preserves every seed reference and URL. Generation is a **single atomic statement**, race-free without an explicit transaction:

```sql
UPDATE id_counters SET next = next + 1 WHERE collection = $1 RETURNING next
```

Exposed as `nextId(collection)`. No UUIDs. *(D8.)*

## C9 — One goal-test per implementation unit (D16)

Nothing is "done" until a runnable test encodes its one-sentence goal and is green. Phase accept-gates = "test-ledger green." See `03-testing-process.md`. *(D16.)*

---

### Quick reference

| Rule | One-liner |
|------|-----------|
| C1 | `import "server-only"` on anything touching DB/secrets |
| C2 | Services take `Ctx`; no ambient auth/request inside them |
| C3 | Filter by `org_id`; check membership+role before mutating |
| C4 | Validate inputs at the edge; re-parse outputs if cheap |
| C5 | Log internally, return generic errors outward |
| C6 | `stripNulls()` before every Zod parse |
| C7 | Convert numeric→number, timestamptz→ms in the mapper |
| C8 | TEXT prefixed ids via atomic `nextId()` counter |
| C9 | A green goal-test or it isn't done |
