# Vitest — Valgate guide

> Role: the test runner that makes "done" mean something — every implementation unit ships with one green goal-test.
> Version pinned: `vitest` latest (devDependency) · Last verified: 2026-06-11 against vitest.dev/guide.
> Decisions: D16 (goal-driven test per implementation), C9 (a green goal-test or it isn't done), D1 (Pool driver — why integration tests need a real branch).
> Build phases: B0 (install + `"test"` script), B4 (nextId concurrency, crud-smoke), B6 (verification state-machine tests).
> Official docs: https://vitest.dev/guide/ · config: https://vitest.dev/config/ · test API: https://vitest.dev/api/

---

## §0 — Cheat-sheet

```bash
npm i -D vitest                 # B0 — no test runner existed before this
npm test                        # → vitest run   (one-shot, what CI/accept-gates use)
npm run test:watch              # → vitest       (re-runs on save — the §1 loop)
npx vitest run tenants          # run one file by name fragment
npx vitest run -t "illegal"     # run tests whose name matches a pattern
```

```ts
import { describe, it, expect } from "vitest";

it("returns ms-epoch, not a Date", () => {
  expect(rowToTenant(row).createdAt).toBeTypeOf("number");
});

expect(() => transition("unverified", "approve")).toThrow();   // illegal transition throws
await expect(submit(ctx, bad)).rejects.toThrow();              // async rejection
```

The five facts that matter most: **(1)** `npm test` = `vitest run` (one-shot); watch mode is the dev loop. **(2)** Every unit gets **one `GOAL:` test** ([C9](./_conventions.md#c9) / D16) — green or it isn't done. **(3)** **Unit tests touch no DB** — mappers, the state machine, derivations are pure. **(4)** **Integration tests run against a disposable Neon branch**, never production (§5). **(5)** Files are co-located `*.test.ts` or under `lib/services/__tests__/`.

## §1 — Why it's in our stack

The repo had **no test runner at all** (eng-review finding: "no vitest/jest, no `test` script") — yet D16 makes a runnable test the definition of done for every unit, so B0 has to install one. We chose **Vitest**: it runs TypeScript and ESM with **zero config** (no Babel/ts-jest transform to wire up), shares Vite's resolver so our `@/` path alias and `server-only` imports resolve the same as in `next build`, and its `expect`/`describe`/`it` API is Jest-compatible so every snippet on the web still applies. We rejected **Jest** (ESM + TS setup friction on a fresh repo) and **node:test** (thinner assertions, weaker watch UX). It is a `devDependency` only — it never ships.

## §2 — Setup in our stack

```bash
npm i -D vitest
```

**`package.json`** — the two scripts B0 adds (the accept-gate one and the dev-loop one):

```jsonc
{
  "scripts": {
    "test": "vitest run",        // one-shot — phase accept-gates run this (§9 / ledger)
    "test:watch": "vitest"       // the §1 loop — re-runs the file you're editing
  }
}
```

**`vitest.config.ts`** (project root) — minimal; `globals` lets `describe/it/expect` be auto-imported, `alias` mirrors `tsconfig` so `@/lib/...` resolves in tests:

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    globals: true,                 // describe/it/expect without importing
    include: ["lib/**/*.test.ts", "scripts/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"], // loads .env.test for the integration branch (§5)
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
});
```

**File convention** — co-located next to the code, or under `__tests__/`:

```
lib/services/tenants.ts
lib/services/__tests__/tenants.test.ts      ← integration (read/write services)
lib/services/verification.ts
lib/services/verification.test.ts           ← unit (state machine — co-located)
tests/fixtures/                              ← copied demo seed JSON (integration inputs)
tests/LEDGER-B6.md                           ← the per-phase test ledger (03-testing-process §6)
```

## §3 — Mental model (minimal)

Three ideas; everything else, follow §7.

1. **`run` vs watch.** `vitest run` executes once and exits with a non-zero code on failure (what accept-gates and CI need). Bare `vitest` is the interactive watcher for the §1 loop. `npm test` is wired to `run`.
2. **One file = one or more `GOAL:` units.** A test file opens with the `GOAL:` comment from `03-testing-process.md` §2; each `it(...)` makes one clause of that goal executable. The goal names the **input**, the **expected shape/values**, and the **boundary** (org-scope, null handling, money/date conversion).
3. **Two altitudes, two costs.** **Unit** tests (mappers, state machine, derivations) are pure functions — no network, milliseconds, run constantly. **Integration** tests (read/write services, nextId, rollback) need a real Neon branch — slower, fewer. Keep the unit layer fast so the loop stays tight ([`03-testing-process.md`](../03-testing-process.md) §4 speed rule).

## §4 — How we use it in Valgate

### The D16 pattern — goal → test → green = done

Every implementation unit follows the same five-step loop ([`03-testing-process.md`](../03-testing-process.md) §1): **state the goal** (one falsifiable sentence) → **write the test** (red first when practical) → **implement** the smallest code that passes → **verify** (green + `tsc --noEmit` clean) → **record** (tick the phase ledger). Nothing is done until its `GOAL:` test is green — that is [C9](./_conventions.md#c9). The full 5-layer SaaS coverage model (which altitude tests what, and the tenant-isolation keystone re-run every phase) lives in [`03-testing-process.md`](../03-testing-process.md) — link out, don't restate.

**What each plan layer tests** (master-plan §11, restated as the D16 mapping):

| Implemented | Layer | The goal it proves |
|---|---|---|
| verification state transition | unit (pure) | every legal transition passes; every illegal one **throws** |
| row→type mapper (`rowToTenant`) | unit (pure) | `null`→`undefined` ([C6](./_conventions.md#c6)); `timestamptz`→ms-epoch; `numeric`→number ([C7](./_conventions.md#c7)) |
| read service fn | integration (Neon branch) | returns **only** the caller's org-scoped rows ([C3](./_conventions.md#c3)); shape parses |
| `nextId` generation | integration (concurrency) | 10 parallel creates → 10 unique sequential ids, zero collisions (B4) |
| verification write | integration (rollback) | 1 verification + N evidence + 1 event commit atomically; a bad doc id rolls back **all** (B6) |

### A real test — the verification state machine (B6)

The state machine ([master-plan §6.2](../01-master-implementation-plan.md)) is a pure function, so it needs **no DB** — the fastest, highest-value test in the suite. The goal: *illegal transitions throw; legal ones return the next status.*

```ts
// lib/services/verification.test.ts
// GOAL: the verification state machine accepts every LEGAL transition and THROWS
//       on every illegal one (e.g. unverified→verified with no submit).
import { describe, it, expect } from "vitest";
import { nextStatus } from "./verification";   // pure: (status, action) => status | throws

describe("verification state machine", () => {
  it("allows the legal happy path", () => {
    expect(nextStatus("unverified", "submit")).toBe("pending_review");
    expect(nextStatus("pending_review", "approve")).toBe("verified");
    expect(nextStatus("verified", "revoke")).toBe("revoked");
    expect(nextStatus("rejected", "resubmit")).toBe("pending_review");
  });

  it("THROWS on an illegal transition", () => {
    // skipping the submit step is the canonical illegal jump
    expect(() => nextStatus("unverified", "approve")).toThrow();
    expect(() => nextStatus("rejected", "revoke")).toThrow();   // can't revoke what was never verified
  });
});
```

Run it alone while iterating: `npx vitest run -t "state machine"`. When green, tick the unit in `tests/LEDGER-B6.md` ([`03-testing-process.md`](../03-testing-process.md) §6) — the phase accept-gate is met only when its ledger is 100% green.

### A pure mapper test (no DB)

The mapper is the single DB→FE conversion point ([C7](./_conventions.md#c7)); its goal is the three conversions plus null-stripping:

```ts
// lib/services/__tests__/tenants.test.ts (unit portion)
// GOAL: rowToTenant maps a DB row to TenantSchema — null→undefined, numeric→number, timestamptz→ms.
it("converts DB types to the FE shape", () => {
  const t = rowToTenant({ ...row, rent: "1200.00", createdAt: new Date(0), email: null });
  expect(t.rent).toBe(1200);            // numeric string → number (C7 / D6)
  expect(t.createdAt).toBe(0);          // Date → ms-epoch     (C7 / D7)
  expect(t.email).toBeUndefined();      // null → undefined    (C6) — Zod .optional() would reject null
});
```

## §5 — Gotchas & version traps

- **🔴 Real Neon branch vs mocks — pick by altitude.** Unit tests (mappers, state machine, derivations) are pure: **never** mock the DB, just call the function. Integration tests (read/write services, nextId, rollback) run against a **disposable Neon branch** created at suite start and dropped at teardown ([`03-testing-process.md`](../03-testing-process.md) §4) — **never the production branch**. Don't mock Drizzle to fake a service test; a mock can't catch the `numeric`-returns-string or `null` traps, which is the whole point of the integration layer.
- **`server-only` imports throw in tests.** Services start with `import "server-only"` ([C1](./_conventions.md#c1)), which throws outside a Next.js server bundle — including under Vitest. Options: (a) keep the **pure logic** (state machine, mappers) in modules that *don't* import the client, and unit-test those directly (preferred — it's why `nextStatus` is exported separately); (b) for integration tests that must load a service, stub the module: `vi.mock("server-only", () => ({}))` in `tests/setup.ts`.
- **Async transaction tests need `await expect(...).rejects`.** A rollback test asserts the transaction *threw* and left no rows. Use `await expect(fn()).rejects.toThrow()` — a bare `expect(fn()).toThrow()` does **not** await the promise and passes even when nothing throws.
- **`npm test` must be `vitest run`, not `vitest`.** Bare `vitest` enters watch mode and never exits — a phase accept-gate or CI step hangs forever. The `run` subcommand is mandatory for the `"test"` script (§2).
- **`globals: true` or import explicitly.** Without `globals` in the config, `describe/it/expect` are undefined unless imported from `"vitest"`. Pick one and stay consistent.

## §6 — Reusable patterns

**Add the goal-test for a new unit** (the repeatable recipe, paired with the drizzle.md "add a new entity" recipe step 5):
1. Open the test file with the `GOAL:` line — input, expected shape, boundary.
2. Write it **red first** when practical (assert the behavior before the code exists).
3. Implement the smallest code that goes green.
4. `tsc --noEmit` clean + run the file's group (`npx vitest run <name>`) so you didn't break a sibling.
5. Tick the unit in the phase ledger ([`03-testing-process.md`](../03-testing-process.md) §6).

**The nextId concurrency test** (B4 — proves the atomic counter is race-free under serverless, [C8](./_conventions.md#c8)):

```ts
// lib/services/__tests__/ids.test.ts  (integration — needs the Neon branch)
// GOAL: 10 parallel nextId("TEN") calls return 10 UNIQUE sequential ids, zero collisions.
it("generates unique ids under concurrency", async () => {
  const ids = await Promise.all(Array.from({ length: 10 }, () => nextId("TEN")));
  expect(new Set(ids).size).toBe(10);          // no duplicates
});
```

**The evidence-rollback test** (B6 — a bad doc id must roll back the whole transaction):

```ts
// GOAL: submitting a verification with one INVALID doc id commits NOTHING (atomic rollback).
it("rolls back the whole write on a bad doc id", async () => {
  await expect(
    submitVerification(ctx, propertyId, "financials", ["DOC-real", "DOC-nonexistent"]),
  ).rejects.toThrow();
  const rows = await listVerifications(ctx, propertyId);
  expect(rows).toHaveLength(0);                 // no partial verification/evidence/event rows
});
```

**Run a single file/test while iterating:** `npx vitest run verification` (by file) or `npx vitest run -t "illegal"` (by test name).

## §7 — Going deeper

- Getting started & CLI flags — https://vitest.dev/guide/
- Config reference (`include`, `setupFiles`, `alias`, `globals`) — https://vitest.dev/config/
- Test API (`describe`/`it`/`test`/`bench`) — https://vitest.dev/api/
- `expect` assertions (incl. `.rejects` / `.resolves`) — https://vitest.dev/api/expect.html
- Mocking (`vi.mock`, `vi.fn`) — https://vitest.dev/api/vi.html
- The Valgate testing process (5-layer model, GOAL convention, the per-phase ledger) — [`03-testing-process.md`](../03-testing-process.md)
- Why integration needs the Pool driver / a real branch — [`drizzle.md`](./drizzle.md) §5, [`neon.md`](./neon.md)
