# 01 — Infrastructure Readiness Assessment

> Question: **Is Valgate's current data infrastructure ready to power an MCP server,
> and if not, what do we build *on top of* it (not a rewrite)?**
>
> Verdict up front: **~80% ready.** The hard part (a clean, reusable, permission-aware
> data layer) already exists. The missing 20% is a thin auth/transport seam that is
> *additive* — we build alongside the existing code, we do not change it.

Every claim below cites a real file. Items are marked **READY**, **NEEDS WORK**, or
**MISSING**. Anything I could not verify is marked `[unverified]`.

---

## The reuse target: `lib/services/*` (35 modules)

This is the layer an MCP server would call. The architecture is, in order:

```
Website:  Component → Server Action (app/actions/*.ts) → Service (lib/services/*) → Drizzle → Neon
MCP:      AI client → MCP tool         (NEW, thin)      → Service (lib/services/*) → Drizzle → Neon
                                                          ^^^^^^^^^^^^^^^^^^^^^^^^^ reused unchanged
```

The MCP server replaces only the *left half* of that chain.

---

## READY — what we can reuse as-is

### R1 — Services are transport-pure (the key enabler) — **READY**
- Evidence: `lib/services/_mapping.ts:8-9` — `// C2: every service takes this explicit
  context first — never ambient auth().` and `export type Ctx = { userId, orgId, orgRole }`.
- Evidence: `lib/services/properties.ts:22` — `listProperties(ctx: Ctx)`, `lib/services/tenants.ts`
  exposes `createTenant(ctx, input)` (called at `app/actions/tenants.ts:21`).
- Why it's ready: services depend on `Ctx`, `db`, and Drizzle schema — **none** of which
  are tied to Next.js or Clerk. A separate Node process can import and call them.

### R2 — Org-scoping is enforced inside every service — **READY**
- Evidence: `lib/services/properties.ts:24` (`where(eq(properties.orgId, ctx.orgId))`),
  `:32`, and the cascade-count queries `:168-200` all filter by `ctx.orgId` (rule C3).
- Evidence: `lib/services/_crud.ts:57,65` — generic `scopedUpdate`/`scopedDelete` filter
  `and(eq(table.orgId, ctx.orgId), eq(table.id, id))`.
- Why it's ready: an MCP tool **cannot** accidentally cross tenants, because the
  isolation lives below the tool, in the service. This is the IDOR protection from
  CLAUDE.md, and the MCP server inherits it for free.

### R3 — Role-based write protection — **READY**
- Evidence: `lib/services/_crud.ts:11-17` (`requireMember`, `requireAdmin`),
  `_mapping.ts:11-12` (`roleAtLeast`). `scopedDelete` requires admin (`_crud.ts:62`).
- Why it's ready: the MCP server passes the caller's role in `Ctx`; the service decides
  what they may do. We don't re-implement authz in the tool layer.

### R4 — Input validation via Zod, already defined — **READY**
- Evidence: `app/actions/tenants.ts:7,16` — `NewTenantSchema`, `TenantPatchSchema` from
  `lib/data/types/tenant`; `lib/services/properties.ts:20,40` — `PropertySchema.parse(...)`.
- Why it's ready: the MCP TypeScript SDK defines tool inputs **with Zod** (see
  `03-resources-and-skills.md`). We can feed the *same* `New*Schema` objects straight
  into tool definitions — one source of truth for validation.

### R5 — Demo-mode read-only guard — **READY**
- Evidence: `lib/services/_mapping.ts:17-19` (`assertCanMutate`) called inside
  `_crud.ts:27,50,63`; env flags at `lib/env.ts:16,20`.
- Why it's ready: if we point an MCP server at the demo DB with `DEMO_MODE=true`, all
  write tools are automatically refused at the service layer. Safe demo by default.

### R6 — Stable, generic CRUD primitives — **READY**
- Evidence: `lib/services/_crud.ts` — `scopedInsert`/`scopedUpdate`/`scopedDelete`,
  atomic id allocation via `nextId()` (`_mapping.ts:28-35`, prefixed ids like `PROP-0001`).
- Why it's ready: most "create/update/delete X" MCP tools map 1:1 onto existing service
  functions; little new logic required.

### R7 — Read derivations for richer resources — **READY (bonus)**
- Evidence (paths surfaced by graphify): `lib/data/derivations/ai-context.ts`,
  `portfolio-snapshot.ts`, `progress.ts`.
- Why it's ready: these compute AI-friendly summaries already. They are ideal **MCP
  resources** (read-only context) with near-zero new code. `ai-context.ts` in particular
  signals the team already thinks about feeding AI structured context. `[unverified]`:
  exact function signatures not yet read — confirm in execution Phase 1.

---

## NEEDS WORK — exists, but needs an MCP-shaped addition

### W1 — `Ctx` is built only from Clerk's web request — **NEEDS WORK** (the core gap)
- Evidence: `lib/auth/ctx.ts:14-51` `requireCtx()` calls Clerk's `auth()`/`currentUser()`
  (`:2,24,34`) and reads the Next.js request scope. Comment `:10` — `// C2: the ONLY
  caller of auth().`
- The problem: an MCP server is a **separate front door**. It will not have a Next.js
  request or a Clerk browser session. It needs its **own** way to turn an incoming AI
  client into a `Ctx`.
- What we build *on top* (not a rewrite): a new `ctxFromMcpAuth(token)` function that
  validates an API token / machine credential and returns the same `Ctx` shape. The
  existing `requireCtx()` is untouched; we add a sibling. The identity-sync helpers it
  uses (`ourUserId`, `ourOrgId`, `normaliseRole` from `lib/services/identity-sync.ts`)
  are reusable.
- Decision needed from you: **how does an AI client authenticate to Valgate?** Options
  in `02-ideal-mcp-design.md` §Auth.

### W2 — `import "server-only"` in every service — **NEEDS WORK (verify)**
- Evidence: `lib/services/_mapping.ts:1`, `properties.ts:1`, `_crud.ts:1` all begin with
  `import "server-only";`.
- The concern: the `server-only` npm package is designed to **throw if bundled into a
  client**. In a plain standalone Node MCP process there is *usually* no bundler, so it's
  typically a no-op — but this must be **verified by experiment**, because if the MCP
  server is built with a bundler it could trip. `[unverified]` until tested.
- What we build *on top*: if it trips, the fix is a tiny shim (alias `server-only` to an
  empty module in the MCP build), **not** editing 35 service files. Low risk, but flag it.

### W3 — Cache invalidation calls assume Next.js — **NEEDS WORK**
- Evidence: `app/actions/tenants.ts:5,21` — actions call `revalidateFeTag("tenants")`
  from `app/actions/_result.ts`. That uses Next's `revalidateTag`.
- The concern: those calls live in the **action** layer, not the service layer, so the
  MCP server simply won't call them — which is correct, an MCP write doesn't need to
  revalidate a Next cache. But if the website and MCP write concurrently, the website's
  cached view may be momentarily stale.
- What we build *on top*: nothing for v1 (accept eventual consistency). Note it as a
  known limitation. `// ponytail: stale-cache after MCP write — revisit only if it bites.`

---

## MISSING — does not exist yet (all expected for a greenfield MCP)

### M1 — No MCP server, transport, or tool definitions — **MISSING**
- Evidence: no `@modelcontextprotocol/*` dependency `[unverified — confirm via package.json
  in execution Phase 1]`; no `mcp-server/` directory exists.
- This is the actual build work, scoped in `04-execution-plan.md`. Expected to be missing.

### M2 — No machine-to-machine auth / API tokens — **MISSING**
- Evidence: all auth flows go through Clerk's interactive session (`lib/auth/ctx.ts`).
  There is no non-interactive token system for a headless client.
- This is the dependency W1 hangs on. Decision + small build required.

### M3 — No rate limiting on a programmatic surface — **MISSING**
- Evidence: CLAUDE.md lists "Rate Limiting | decide later" as undecided.
- Why it matters more for MCP: an AI client can call tools in a loop. A human clicking
  buttons is self-rate-limiting; an agent is not. Needed before any *public* MCP surface,
  not for a local stdio dev server.

---

## Readiness scorecard

| Capability | Status |
|---|---|
| Reusable, transport-pure data layer | ✅ READY (R1) |
| Tenant isolation / IDOR safety | ✅ READY (R2) |
| Role-based authorization | ✅ READY (R3) |
| Input validation (Zod, shareable) | ✅ READY (R4) |
| Demo/read-only safety | ✅ READY (R5) |
| CRUD + id generation primitives | ✅ READY (R6) |
| AI-friendly read derivations | ✅ READY (R7) |
| `Ctx` from a non-web caller | 🟡 NEEDS WORK (W1) ← **main gap** |
| `server-only` in a Node process | 🟡 VERIFY (W2) |
| Cache coherence across front doors | 🟡 ACCEPT FOR v1 (W3) |
| MCP server / tools / transport | 🔴 MISSING (M1) — the build |
| Machine auth / API tokens | 🔴 MISSING (M2) — blocks W1 |
| Rate limiting | 🔴 MISSING (M3) — needed before public |

**Bottom line:** we are not building from scratch. We are building **one thin auth seam
(W1+M2) and a tool layer (M1)** on top of a backend that was, almost by accident,
already shaped for this. Recommended first concrete step is a *read-only, stdio,
single-tenant* spike to prove services call cleanly from a non-Next process — see
`04-execution-plan.md` Phase 1.
