# NeonDB — Valgate guide

> Role: our database host — serverless Postgres + the driver that connects to it. Neon is *just* Postgres hosting; the query layer is Drizzle ([`drizzle.md`](./drizzle.md)).
> Version pinned: `@neondatabase/serverless` ^1.0 (requires **Node 19+**) · Last verified: 2026-06-11 against neon.com/docs.
> Decisions: D1 (WebSocket `Pool` driver, not http), D8 (atomic counter), §12 (branch-per-phase rollback).
> Build phases: B0 (project + dev branch + `db:ping`), every phase (migrations land on a branch first).
> Official docs: https://neon.com/docs/serverless/serverless-driver · branching: https://neon.com/docs/introduction/branching

---

## §0 — Cheat-sheet

```bash
# one-time: install the Neon CLI (binary is `neon`, package is neonctl)
npm install -g neonctl
neon auth                                    # opens browser, stores token

# per-phase rollback workflow (§4) — branch, migrate, verify, promote
neon branches create --name phase-b1 --parent main   # copy-on-write clone of main
# point drizzle.config.ts at the branch's connection string → migrate → test
neon branches set-default phase-b1           # promote once the accept-gate is green
# disaster: roll a branch back in time (§5)
neon branches restore main main@2026-06-11T09:00:00Z
```

```bash
npm run db:ping            # SELECT now() — proves the connection works (B0)
```

```sql
-- enable pgcrypto once (in an early migration)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- UUID v4 at the DB level (Drizzle's uuid().defaultRandom() delegates here)
SELECT gen_random_uuid();
-- cryptographically strong random token (invite link, verification code, etc.)
SELECT encode(gen_random_bytes(32), 'hex');
```

The five facts that matter most: **(1)** Neon is **only Postgres hosting** — no runtime, no query layer (§3); we bring Drizzle. **(2)** We use the **WebSocket `Pool`** driver (`drizzle-orm/neon-serverless`), *not* `neon-http`, because http throws on transactions (§4, D1). **(3)** Node has no global `WebSocket` → set `neonConfig.webSocketConstructor = ws` (§4/§5). **(4)** `DATABASE_URL` is the **pooled** (`-pooler`) string (§4/§5). **(5)** **Branches are our rollback mechanism** — one branch per phase, migrate there first (§4, §12).

## §1 — Why it's in our stack

We need real persistence to replace the demo file-system layer, and a Postgres that fits a serverless Next.js deployment (many short-lived, connection-per-request workloads). **Neon** gives us standard Postgres with a serverless driver that connects over HTTP/WebSocket instead of a long-lived TCP socket, autoscaling compute, and — the decider for *this* plan — **database branching**, which we lean on as our per-phase rollback strategy (D1, §12). We rejected a classic always-on Postgres (no branching, awkward connection model under serverless) and Convex (it's a whole runtime + query layer, which would replace Drizzle and our service layer — see §3). Neon stays in its lane: it hosts the bytes; everything else is ours.

## §2 — Setup in our stack

The driver and its WebSocket shim install alongside Drizzle (full client setup lives in [`drizzle.md` §2](./drizzle.md) — not duplicated here):

```bash
npm i @neondatabase/serverless ws        # driver + Node WebSocket shim
npm i -g neonctl                         # CLI for branches (binary: `neon`)
```

`DATABASE_URL` is validated through `@t3-oss/env-nextjs` — see [`env-nextjs.md`](./env-nextjs.md), never read `process.env` directly. It holds the **pooled** connection string (the `-pooler` host — §5).

**B0 setup (the one-time foundation):**
1. Create the Neon **project** (Console → New Project) — this gives you a root branch called `main`.
2. Create a **`dev` branch** off `main` (`neon branches create --name dev --parent main`) — you develop and migrate against `dev`, never `main` directly.
3. Copy `dev`'s **pooled** connection string into `.env.local` as `DATABASE_URL`.
4. Wire `lib/db/client.ts` (the Pool driver — [`drizzle.md` §2](./drizzle.md)) and add the `db:ping` script:

```ts
// scripts/db-ping.ts  — proves the connection before anything else is built
import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";

const [row] = await db.execute(sql`SELECT now()`);
console.log("Neon OK:", row.now);
```

**Accept (B0):** `npm run db:ping` prints the server time. If it hangs, you forgot `neonConfig.webSocketConstructor = ws` (§5).

## §3 — Mental model (minimal)

The one idea to hold: **Neon is plain Postgres that you reach over HTTP/WebSocket, and nothing more.** Unlike Convex (a query *runtime* with its own functions, reactivity, and access rules baked in), Neon has **no query layer, no app runtime, no auth, no business logic**. It stores rows and runs SQL. Everything above the SQL — schema, queries, transactions, types — is **Drizzle** ([`drizzle.md`](./drizzle.md)); access control is **our service layer** ([C2](./_conventions.md#c2)/[C3](./_conventions.md#c3)) and **Clerk** ([`clerk.md`](./clerk.md)). So when you read "Neon" in this codebase, picture a hosted Postgres endpoint plus two Neon-specific things we actually use: **the serverless driver** (how we connect — §4) and **branches** (how we roll back — §4/§12). That's the whole intersection.

## §4 — How we use it in Valgate

### The driver: WebSocket `Pool`, not HTTP (D1)

`@neondatabase/serverless` ships **two** ways to talk to Neon:

| | `neon()` — HTTP | `Pool` / `Client` — WebSocket |
|---|---|---|
| Drizzle import | `drizzle-orm/neon-http` | **`drizzle-orm/neon-serverless`** ← ours |
| Good for | single, one-shot queries | sessions + **interactive transactions** |
| `db.transaction()` | **throws** | works |

We need transactions in three places (D8 counters, B2 seed, B6 atomic verification writes), so we use the **WebSocket `Pool`** everywhere. The full `client.ts` is in [`drizzle.md` §2](./drizzle.md); the Neon-specific lines are:

```ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;     // Node < native-WS path — see §5
const pool = new Pool({ connectionString: env.DATABASE_URL });   // pooled (-pooler) host
```

`neonConfig.webSocketConstructor = ws` is **required in Node**: the driver opens a WebSocket, and Node has no global `WebSocket` constructor to hand it. `DATABASE_URL` is the **pooled** string (host ends in `-pooler`) — right for our connection-per-request serverless workload (§5).

### Branches as our per-phase rollback mechanism (§12)

A Neon **branch is a copy-on-write clone** of a branch's data *and* schema — instant, isolated, and zero performance impact on the parent (writes are stored as a delta). We use that as the spine of our rollback strategy: **a migration never touches `main` until its phase accept-gate is green.**

```bash
# 1. branch off the current good state
neon branches create --name phase-b6 --parent main

# 2. point drizzle-kit at the branch (its own connection string) and migrate there
#    — see drizzle-kit.md for the migrate command
# 3. run the phase's goal-tests (C9) against the branch

# 4a. green → promote the branch to default (or merge its migration forward to main)
neon branches set-default phase-b6
# 4b. red  → just delete the branch; main was never touched
neon branches delete phase-b6
```

The mapping to our plan (§12):
- **Schema rollback** = a bad migration lives only on its branch; `neon branches delete <branch>` and `main` is untouched.
- **Data rollback** = **point-in-time restore** on the production branch (§5) — no branch needed for "undo the last hour."
- The `dev` branch (B0) is the standing place you migrate and test *before* any of this; phase branches are cut from `main` at the gate.

### What stays *out* of Neon

No application logic, no access checks, no derived state lives in the database. Org-scoping ([C3](./_conventions.md#c3)), id generation ([C8](./_conventions.md#c8)), DB→FE mapping ([C7](./_conventions.md#c7)) and "Valgate Verified" derivation all live in the service layer — Neon just executes the SQL Drizzle sends.

### pgcrypto — UUIDs and secure tokens

`pgcrypto` is a first-class Postgres extension available on Neon. Enable it once in an early migration (e.g. B1):

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

Two functions we actually use:

| Function | Returns | Where |
|---|---|---|
| `gen_random_uuid()` | UUID v4 (`uuid`) | column defaults — `uuid('id').defaultRandom()` in Drizzle delegates to this at the DB level |
| `gen_random_bytes(n)` | `bytea` | secure random tokens (invite links, verification codes) — encode to hex: `encode(gen_random_bytes(32), 'hex')` |

**Don't use** `crypt()` / `gen_salt()` for user passwords — Clerk owns authentication. Don't use `pgp_sym_encrypt` for column-level encryption without a separate key-management plan; that's an architectural decision we haven't made.

`hmac()` and `digest()` are available if you ever need a keyed hash or a plain SHA-256 inside a query, but application-level hashing (in a service function) is preferred — it's testable and doesn't tie logic to the DB.

## §5 — Gotchas & version traps

- **🔴 Node has no `WebSocket` — set `neonConfig.webSocketConstructor = ws`.** The Pool driver opens a WebSocket; without this line it fails to connect **at runtime** (not at build), usually as a hang or `WebSocket is not defined`. This is the most common B0 wall. (Pairs with the D1 driver-mode trap in [`drizzle.md` §5](./drizzle.md).)
- **Node 19+ required.** `@neondatabase/serverless` ^1.0 (GA) needs **Node ≥ 19**. On older Node the driver won't load. Pin the runtime accordingly.
- **Pooled vs unpooled connection string.** The host with `-pooler` (e.g. `ep-cool-darkness-123456-pooler.us-east-2.aws.neon.tech`) routes through PgBouncer in **transaction mode** — correct for the app/serverless runtime (`DATABASE_URL`). The **direct** (no `-pooler`) host is for tools that need session features (some migration tools, `pg_dump`). If a migration tool errors on `SET`/`PREPARE`, you're on the pooled host — switch that tool to the direct string. PgBouncer transaction mode also disables session-level `LISTEN`/`NOTIFY` and SQL `PREPARE` — we don't use those.
- **Cold-start latency on serverless.** A scaled-to-zero Neon compute takes a moment to wake on the first query after idle; subsequent queries are warm. Don't mistake a one-off slow first request for a bug — it's measured in B8, and the pooled string keeps connection overhead low. Keep cache headers unchanged (master-plan §14 risk).
- **Migrate the branch, not `main`.** Running `drizzle-kit migrate` against the production branch's string defeats the §12 rollback model. Point it at the phase/`dev` branch's connection string first.

## §6 — Reusable patterns

**Cut a phase branch, migrate, verify, promote** (the §4 rollback loop, condensed):

```bash
neon branches create --name phase-bN --parent main   # copy-on-write clone
# set DATABASE_URL (or drizzle.config.ts) to phase-bN's connection string
npx drizzle-kit migrate                               # see drizzle-kit.md
npm test                                              # the phase's goal-tests (C9)
neon branches set-default phase-bN                    # green → promote
# (red) neon branches delete phase-bN                 # main never touched
```

**Point-in-time restore the production branch** (data-level "undo", §12) — restore `main` to an earlier moment using an RFC 3339 timestamp:

```bash
neon branches restore main main@2026-06-11T09:00:00Z
```

**Compare a branch's schema against `main` before promoting** (a cheap drift check):

```bash
neon branches schema-diff main phase-bN
```

**Generate a secure token** (invite link, verification code — 32 random bytes, hex-encoded):

```sql
SELECT encode(gen_random_bytes(32), 'hex') AS token;
```

Or in a Drizzle insert, use Postgres's built-in default:

```ts
// in the schema: the DB generates the token, no app-side crypto needed
inviteToken: text("invite_token").default(sql`encode(gen_random_bytes(32), 'hex')`),
```

**The connection itself** — `client.ts` (Pool + `ws` + `neonConfig`) is in [`drizzle.md` §2](./drizzle.md); don't re-create a second connection anywhere, import `db` from there.

## §7 — Going deeper

- Serverless driver (HTTP vs WebSocket, full API) — https://neon.com/docs/serverless/serverless-driver
- Branching concepts (copy-on-write, parent/default) — https://neon.com/docs/introduction/branching
- Manage branches (Console + workflow) — https://neon.com/docs/manage/branches
- Neon CLI — branches commands (`create`, `restore`, `schema-diff`, `set-default`) — https://neon.com/docs/reference/neon-cli
- Connection pooling (`-pooler` host, PgBouncer transaction mode) — https://neon.com/docs/connect/connection-pooling
- Point-in-time / instant restore + history window — https://neon.com/docs/introduction/branch-restore
- pgcrypto extension (functions, algorithms, key-management guidance) — https://neon.com/docs/extensions/pgcrypto
- The Drizzle client setup that uses this driver — [`drizzle.md` §2](./drizzle.md); migrations — [`drizzle-kit.md`](./drizzle-kit.md).
