# @t3-oss/env-nextjs — Valgate guide

> Role: the typed, validated boundary for every environment variable — one schema, imported as `{ env }`, so a missing/malformed var fails the build instead of crashing at runtime.
> Version pinned: `@t3-oss/env-nextjs` (latest) + `zod` · Last verified: 2026-06-11 against env.t3.gg/docs.
> Decisions: D1 (`DATABASE_URL`), D9 (`DEMO_MODE`, production-refused). Ties to [C1](./_conventions.md#c1) — server vars must not reach the client bundle.
> Build phases: B0 (install + `lib/env.ts`), B5 (`DEMO_MODE`), B7 (storage creds), B9 (Upstash tokens).
> Official docs: https://env.t3.gg/docs/nextjs · core: https://env.t3.gg/docs/core

---

## §0 — Cheat-sheet

```ts
// EVERYWHERE you need a config value (client or server):
import { env } from "@/lib/env";

const url = env.DATABASE_URL;             // ✅ typed, validated, server-only
env.CLERK_SECRET_KEY;                     // ✅ in a server module
env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;    // ✅ safe in client code (NEXT_PUBLIC_ prefix)

// NEVER:
process.env.DATABASE_URL                  // ❌ unvalidated, untyped, bypasses the boundary
```

```bash
npm i @t3-oss/env-nextjs zod              # B0 — not yet installed (see §2)
SKIP_ENV_VALIDATION=1 next build          # Docker/CI image build with no secrets present (§5)
```

The five facts that matter most: **(1)** there is exactly **one** schema — `lib/env.ts` — and you import `{ env }` from it, never `process.env` ([C1](./_conventions.md#c1)). **(2)** A var in the **`server`** block referenced from client code is a **build error** — that's the feature, not a bug (§5). **(3)** Client-readable vars **must** be in the `client` block **and** named `NEXT_PUBLIC_*`. **(4)** `runtimeEnv` must list **every** key or it won't type-check (§5). **(5)** New secret? Add it to `server`, map it in `runtimeEnv`, add it to `.env.local` — three edits, one place.

## §1 — Why it's in our stack

Raw `process.env` is `string | undefined` with zero validation: a typo'd or missing `DATABASE_URL` surfaces as an opaque crash deep in the first DB call, in production, not at build. `@t3-oss/env-nextjs` (D1, B0) parses all env at module-load against a Zod schema, so the app **refuses to build/boot** if config is wrong, and gives every var a real type at the call site. The decisive second job is the **server/client split**: it makes leaking a secret into the browser bundle a *compile error* rather than a code-review hope — which is exactly the machine-checked half of [C1](./_conventions.md#c1). We rejected hand-rolled `assertEnv()` helpers (no type inference, no client boundary) and bare `process.env` (the status quo we're replacing).

## §2 — Setup in our stack

`@t3-oss/env-nextjs` is in the CLAUDE.md stack table but **not yet installed** — B0 installs it:

```bash
npm i @t3-oss/env-nextjs zod
```

**`lib/env.ts`** — the single schema. The `server` block grows as phases land (DB at B0, `DEMO_MODE` at B5, storage at B7, Upstash at B9); the `client` block holds the `NEXT_PUBLIC_*` vars:

```ts
// lib/env.ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  // ── server-only: never sent to the browser (C1) ──────────────────────────
  server: {
    DATABASE_URL: z.string().url(),                         // D1 — Neon Pool conn string
    DEMO_MODE: z                                            // D9 — read-only demo bypass
      .enum(["true", "false"])
      .optional()
      .transform((v) => v === "true"),
    CLERK_SECRET_KEY: z.string().min(1),                    // Clerk server auth()
    // storage (B7) — S3-or-R2 presigned uploads
    STORAGE_ACCESS_KEY_ID: z.string().min(1),
    STORAGE_SECRET_ACCESS_KEY: z.string().min(1),
    STORAGE_BUCKET: z.string().min(1),
    STORAGE_ENDPOINT: z.string().url().optional(),          // set for R2; omit for AWS S3
    STORAGE_REGION: z.string().default("auto"),
    // rate limiting (B9)
    UPSTASH_REDIS_REST_URL: z.string().url(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  },

  // ── client: shipped to the browser — MUST be NEXT_PUBLIC_* ────────────────
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  },

  // ── runtimeEnv: map EVERY key above to process.env (see §5) ───────────────
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DEMO_MODE: process.env.DEMO_MODE,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    STORAGE_ACCESS_KEY_ID: process.env.STORAGE_ACCESS_KEY_ID,
    STORAGE_SECRET_ACCESS_KEY: process.env.STORAGE_SECRET_ACCESS_KEY,
    STORAGE_BUCKET: process.env.STORAGE_BUCKET,
    STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT,
    STORAGE_REGION: process.env.STORAGE_REGION,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  },

  emptyStringAsUndefined: true,   // treat `FOO=` as unset, not "" (§5)
});
```

**`.env.local`** (gitignored) holds the real values. Add a key here the moment you add it to the schema — the build fails loudly otherwise, which is the point. Then consumers import it: `lib/db/client.ts` does `import { env } from "@/lib/env"` and reads `env.DATABASE_URL` ([`drizzle.md`](./drizzle.md) §2) — it never touches `process.env`.

## §3 — Mental model (minimal)

Three ideas; the rest follow the §7 links.

1. **One schema, two blocks.** `server` vars exist only in Node; `client` vars are inlined into the browser bundle by Next at build, so they must be `NEXT_PUBLIC_*` and must contain nothing secret.
2. **`env` is just a validated object.** `createEnv` parses `runtimeEnv` against the Zod schemas once, at module load, and returns a frozen typed object. You consume `env.X` exactly like a constant — the validation already happened.
3. **`runtimeEnv` is a manual wiring table, not magic.** Next.js can't statically see dynamic `process.env` access, so you spell out every var → `process.env.VAR`. Miss one and it won't compile.

## §4 — How we use it in Valgate

### The non-negotiable: import `{ env }`, never `process.env`

This is the machine-checked half of [C1](./_conventions.md#c1). Reading `process.env.DATABASE_URL` directly skips validation **and** the server/client boundary — both of which exist to stop secrets reaching the browser. Anywhere config is needed:

```ts
// lib/db/client.ts  (server-only — C1)
import { env } from "@/lib/env";
const pool = new Pool({ connectionString: env.DATABASE_URL });   // ✅
```

```ts
// lib/data/auth-shim.ts  — D9 demo bypass, refused in production
import { env } from "@/lib/env";

if (env.DEMO_MODE && process.env.NODE_ENV === "production") {
  throw new Error("DEMO_MODE is refused in production");   // D9 guard
}
// (NODE_ENV is the one process.env read we keep — Next owns it, not our schema.)
```

```tsx
// a client component — only the NEXT_PUBLIC_ var is reachable here
import { env } from "@/lib/env";
<ClerkProvider publishableKey={env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY} />   // ✅
```

### Where each var lives

| Var | Block | Phase | Consumer |
|-----|-------|-------|----------|
| `DATABASE_URL` | server | B0 | [`drizzle.md`](./drizzle.md) client |
| `DEMO_MODE` | server | B5 | `auth-shim` (D9, read-only, prod-refused) |
| `CLERK_SECRET_KEY` | server | B5 | [`clerk.md`](./clerk.md) server `auth()` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | client | B5 | `<ClerkProvider>` |
| `STORAGE_*` | server | B7 | [`storage-s3-r2.md`](./storage-s3-r2.md) presign |
| `UPSTASH_REDIS_REST_*` | server | B9 | [`upstash-ratelimit.md`](./upstash-ratelimit.md) |

Rule of thumb: **if it's a secret, it goes in `server`.** Only put a var in `client` when the browser genuinely needs it *and* it is safe to publish — Clerk's publishable key is the one current case.

## §5 — Gotchas & version traps

- **🔴 Server var referenced from client code = build error — this is the feature.** If a Client Component imports anything that reads `env.CLERK_SECRET_KEY`, the build fails with a "server-side environment variable on the client" error. That's the library doing C1's job for you. The fix is never to relax the schema — it's to move the read to a server module (or, if the value is genuinely public, rename it `NEXT_PUBLIC_*` and put it in `client`).
- **`runtimeEnv` boilerplate is mandatory and exhaustive.** Every key in `server`/`client` must appear in `runtimeEnv` mapped to its `process.env.*`. Forget one and TypeScript errors at the `createEnv` call. (Don't reach for `experimental__runtimeEnv` to shorten it — it only covers server vars and we keep the explicit table for clarity.)
- **`skipValidation` for Docker/CI builds.** A `next build` inside a container that has **no** secrets present would fail validation. Gate it: `skipValidation: !!process.env.SKIP_ENV_VALIDATION` in `createEnv`, and pass `SKIP_ENV_VALIDATION=1` only in those image-build steps — never at runtime, where you *want* the boot-time check.
- **`emptyStringAsUndefined: true`.** A `.env` line like `STORAGE_ENDPOINT=` yields `""`, which passes a bare `z.string()` and silently means "endpoint is empty string." This option turns `""` into `undefined`, so `.optional()` / `.default()` behave as intended. We set it on.
- **`DEMO_MODE` is a string from the shell.** Env values are always strings — `DEMO_MODE=false` is the string `"false"`, which is truthy. We `.enum([...]).transform(v => v === "true")` so `env.DEMO_MODE` is a real boolean. Never test `if (env.DEMO_MODE === "true")` after the transform.
- **`NODE_ENV` stays on `process.env`.** Next.js manages it; don't add it to the schema. It's the one sanctioned `process.env` read (used in the D9 production guard above).

## §6 — Reusable patterns

**Add a new env var** (the repeatable recipe):
1. Add the field to `server` (secret) or `client` (`NEXT_PUBLIC_*`, publishable) in `lib/env.ts`, with a Zod validator (`z.string().url()`, `.min(1)`, etc.).
2. Add the matching line to `runtimeEnv` (`VAR: process.env.VAR`) — or it won't compile.
3. Add the real value to `.env.local` (and your deploy provider's env settings).
4. Consume it via `import { env } from "@/lib/env"`.

**A var with a safe default** (no `.env.local` entry needed):

```ts
STORAGE_REGION: z.string().default("auto"),   // R2 uses "auto"; AWS overrides via .env
```

**A coerced numeric var** (env is always a string):

```ts
SOME_LIMIT: z.coerce.number().int().positive().default(100),
```

**A var that's optional in dev but required in prod** — validate it conditionally with a `superRefine`, or keep it `.optional()` and assert at its single consumer; prefer the latter for one-off vars.

## §7 — Going deeper

- Next.js adapter (full `createEnv` option list) — https://env.t3.gg/docs/nextjs
- Core concepts (`runtimeEnv` vs `runtimeEnvStrict`, `skipValidation`, `emptyStringAsUndefined`) — https://env.t3.gg/docs/core
- `shared` block (vars that aren't strictly server or client, e.g. `NODE_ENV`) — https://env.t3.gg/docs/customization
- Using a non-Zod validator (any Standard Schema validator) — https://env.t3.gg/docs/customization
- Next.js env var loading order & `.env*` files — https://nextjs.org/docs/app/guides/environment-variables
- The Zod validators themselves live in [`zod.md`](./zod.md); the server/client boundary rule in [`_conventions.md` C1](./_conventions.md#c1).
