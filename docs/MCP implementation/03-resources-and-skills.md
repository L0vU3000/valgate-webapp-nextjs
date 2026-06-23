# 03 — Resources, SDK & Skills We Need

> What we'll actually install and lean on to build the MCP server. Package names below
> were verified via the Context7 MCP docs tool (not guessed) on 2026-06-22.

---

## A. The SDK (the one real new dependency)

### Official MCP TypeScript SDK
- **Stable package: `@modelcontextprotocol/sdk`** (v1.x line — `v1.29.0` current per
  Context7). This is what you install for a production build today:
  ```bash
  npm install @modelcontextprotocol/sdk
  ```
  Imports look like `@modelcontextprotocol/sdk/server/mcp.js` and
  `@modelcontextprotocol/sdk/server/stdio.js`.
- **Heads-up — a v2 alpha exists:** Context7 also surfaced `@modelcontextprotocol/server`
  (the `2.0.0-alpha` line) with simpler imports (`@modelcontextprotocol/server`,
  `@modelcontextprotocol/server/stdio`). It is **alpha** — do not build on it for anything
  we intend to keep.
- ➡️ **Recommendation: pin the stable `@modelcontextprotocol/sdk` v1.x.** Reasoning:
  it's the supported line, has the most examples, and we want boring/stable for a first
  backend service. Re-evaluate v2 when it's GA.
- **Verify before installing:** run `npm view @modelcontextprotocol/sdk version` to confirm
  the latest stable, and re-query Context7 (`/modelcontextprotocol/typescript-sdk`) for the
  current quickstart. `[unverified]`: exact latest version at build time.

### Zod — already installed ✅
- Evidence: used throughout (`app/actions/tenants.ts:7`, `lib/services/properties.ts`,
  `lib/env.ts`). The MCP SDK defines tool `inputSchema` with Zod, so our existing
  `New*Schema` / `*PatchSchema` objects (`lib/data/types/*`) plug straight in. **No new
  validation dependency.**

### Drizzle + Neon client — already installed ✅
- Evidence: `lib/db/client.ts`, `lib/db/schema/*`. The MCP server imports these directly;
  nothing new to add. It does need `DATABASE_URL` in its own environment (server-only secret).

### What we do **not** need
- No new ORM, no new web framework (stdio v1 needs no HTTP server), no new validation lib,
  no new auth provider for the demo spike. Per ponytail: the only genuinely new dependency
  is the MCP SDK itself.

---

## B. Claude skills & subagents available in this environment

These are already installed and directly useful for building/operating the MCP server:

| Skill / subagent | Use it for |
|---|---|
| **graphify** (`graphify query/explain/path`) | Codebase questions while building — it oriented this whole assessment. Use before grepping. |
| **`/spec`** (gstack) | Turn each phase of `04-execution-plan.md` into a precise, executable spec before coding. Recommended entry point for Phase 1. |
| **`/plan-eng-review`**, **`/plan-ceo-review`** | Pressure-test this plan before committing engineering time. |
| **`/cso`** (Chief Security Officer) | Review the auth seam (W1/M2) and the public-HTTP step — auth + rate limiting are the risky parts. |
| **`/review`** (gstack) | Pre-landing review of the MCP server diff. |
| **`/investigate`** | Debug the `server-only`-in-Node question (W2) and any Ctx wiring issues. |
| **context7 MCP** (`resolve-library-id` + `query-docs`) | Pull live MCP SDK + Clerk + Drizzle docs during the build (already used here). |
| **planning-with-files** | If a phase balloons, track it with task_plan/findings/progress files. |

➡️ **Recommended skill flow:** `graphify` to confirm signatures → `/spec` to lock Phase 1
scope → build → `/cso` on the auth seam → `/review` before landing.

### B.1 — External MCP tooling: identified, DEFERRED (install when needed) ⏸️ 2026-06-23

Found via web search; all are `npx`-on-demand, so there's no benefit to installing early.
**Decision (owner): defer all three — install at the moment of use, not now.**

| Tool | What | Install when |
|---|---|---|
| **`mcp-builder`** (Anthropic official skill, `anthropics/skills` repo) | MCP tool-design methodology — pairs with `/spec` | Start of Phase 1 build. `npx skills add https://github.com/anthropics/skills --skill mcp-builder` — **verify repo/syntax first**, came from web search. |
| **MCP Inspector** (`@modelcontextprotocol/inspector`) | Browser UI to test tools/resources without an AI client | First time we test the spike: `npx @modelcontextprotocol/inspector node mcp-server/index.js` |
| **`@anthropic-ai/mcpb`** (`mcpb init`/`pack`) | Bundles server into a one-click Claude Desktop extension | Phase 5 (distribution) only |

> `[unverified]`: package/repo names from web search, not yet confirmed hands-on. Confirm
> (`npm view <pkg> version`, repo reachable) at install time.

---

## C. External docs & references to keep open

| Resource | Why | How to fetch |
|---|---|---|
| MCP TypeScript SDK README + quickstart | Tool/resource/transport API | Context7 `/modelcontextprotocol/typescript-sdk`; or GitHub `modelcontextprotocol/typescript-sdk` |
| MCP spec | Protocol concepts (tools/resources/prompts/transports) | Context7 `/modelcontextprotocol/modelcontextprotocol` |
| "MCP for beginners" (Microsoft) | Beginner-friendly walkthroughs, multi-language | Context7 `/microsoft/mcp-for-beginners` |
| Claude Desktop MCP config docs | How to register our stdio server as a client | claude.ai / Anthropic docs `[unverified link]` |
| Clerk machine-auth docs | Only if we pick Auth Option 3 later | Context7 `resolve-library-id "Clerk"` |

---

## D. Internal files the build will touch or reuse

Reuse (do **not** modify):
- `lib/services/*.ts` — the 35 service modules the tools wrap.
- `lib/services/_mapping.ts` — `Ctx` type, `assertCanMutate`, `nextId`, `toDomain`.
- `lib/services/_crud.ts` — scoped insert/update/delete primitives.
- `lib/services/identity-sync.ts` — `ourOrgId`/`ourUserId`/`normaliseRole` for the auth seam.
- `lib/data/types/*` — Zod schemas reused as tool input schemas.
- `lib/data/derivations/{ai-context,portfolio-snapshot,progress}.ts` — resource bodies.
- `lib/db/client.ts`, `lib/db/schema/*` — DB access.

New (additive only):
- `mcp-server/` (or chosen location) — server entry, transport wiring, tool/resource defs.
- A new `ctxFor()` / `ctxFromMcpAuth()` auth seam (sibling to `lib/auth/ctx.ts`,
  which stays Clerk-only).
- For Auth Option 2 later: a small token store + issuance path.

---

## E. Environment & secrets

- `DATABASE_URL` — required by the MCP process (server-only secret; never `NEXT_PUBLIC_`).
- `DEMO_MODE` / `DEMO_ALLOW_WRITES` — control read-only behaviour for the spike
  (`lib/env.ts:16,20`).
- A future MCP auth token secret (Auth Option 2). Store as an env var / secret manager
  entry; never embed in code or prompts.

> Reminder from project memory: the Neon prod string must be rotated before any hosted
> deploy. A local stdio spike should point at a **dev** Neon branch, never prod.
