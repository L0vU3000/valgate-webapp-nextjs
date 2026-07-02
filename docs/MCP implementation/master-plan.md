# Valgate MCP Server — Master Plan

> **Interactive visual plan:** https://plan.agent-native.com/_agent-native/open?app=plan&view=plan&to=%2Fplans%2Fplan-03233ac648dc42ec&planId=plan-03233ac648dc42ec
> (id `plan-03233ac648dc42ec`) — this Markdown file is the durable on-disk mirror.

A Model Context Protocol (MCP) server that lets an AI client read and (later) operate Valgate's
data by reusing the existing `lib/services/*` layer **unchanged**, behind one new auth seam.
Shipped in 6 dependency-ordered phases. This is the roll-up of `00`–`04` in this folder.

---

## What an MCP looks like — in the repo & as output

**In the codebase** — a small folder next to the app:

```
valgate-webapp-nextjs/
├── app/              ← Next.js app (unchanged)
├── lib/services/     ← 35 services (unchanged — the MCP reuses these)
└── mcp-server/       ← NEW. The entire MCP server.
    ├── index.ts      ← ~30 lines: starts the server, registers tools
    ├── ctxFor.ts     ← ~5 lines: the auth seam (who's asking)
    ├── tools.ts      ← later: the handful of action tools
    └── resources.ts  ← later: readable data (valgate://property/{id})
```

Mental model: a *service* is `listProperties(ctx)`. A *tool* is a ~10-line wrapper that exposes it
to an AI. The MCP server is just a bag of those wrappers plus a `connect()` call — less code than
one app route.

**As output** — same data, three surfaces:

```jsonc
// (a) the raw tool result — typed JSON for programs + a text mirror for chat
{
  "content": [{ "type": "text", "text": "[ {\"id\":\"PROP-0001\", ...} ]" }],
  "structuredContent": { "data": [
    { "id": "PROP-0001", "address": "12 Oak Lane", "status": "active" },
    { "id": "PROP-0007", "address": "44 River Road", "status": "active" }
  ]}
}
```

- **(b) MCP Inspector** — a Postman-like UI (localhost:6274): click Run on `search_properties`, see real rows. The Phase 1 test surface; no AI needed.
- **(c) In a Claude chat** — the MCP is invisible plumbing; Claude answers *"44 River Road is missing its gas safety certificate…"* from live data instead of guessing.

Registered via a few lines in Claude Desktop's config (`command: npx`, `args: [tsx, --conditions=react-server, mcp-server/index.ts]`) — Claude launches `index.ts` as a subprocess and talks over stdio.

---

## The one fact that makes this easy

Valgate's 35 service modules are **transport-pure** (rule C2): every function takes an explicit
`ctx: Ctx` and never touches Clerk or the web request itself (`lib/services/_mapping.ts:9`). An MCP
server is just a different front door — it builds its own `Ctx` through one new `ctxFor()` seam and
calls the SAME services. Org-scoping, role checks, Zod validation, and demo read-only safety all
come for free.

---

## Readiness — ~80% ready

| Capability | Status | Evidence |
|---|---|---|
| Transport-pure data layer (reusable) | ✅ READY | `lib/services/_mapping.ts:9`, `properties.ts:22` |
| Tenant isolation / IDOR safety | ✅ READY | `WHERE orgId = ctx.orgId` everywhere (C3) |
| Role-based authorization | ✅ READY | `_crud.ts` requireMember/requireAdmin |
| Input validation (Zod, shareable) | ✅ READY | `lib/data/types/*` New*Schema |
| Demo read-only safety | ✅ READY | `_mapping.ts:17` assertCanMutate |
| AI-friendly read derivations | ✅ READY | `lib/data/derivations/ai-context.ts` |
| Build `Ctx` from a non-web caller | 🟡 MAIN GAP | `ctx.ts:14` is Clerk-only → need `ctxFor()` |
| `server-only` in a Node process | 🟡 VERIFY | likely solved by `tsx --conditions=react-server` (see Phase 1) |
| MCP server / tools / transport | 🔴 MISSING | the build (expected) |
| Machine auth / API tokens | 🔴 MISSING | blocks real multi-tenant (Phase 3) |
| Rate limiting | 🔴 MISSING | needed before public HTTP (Phase 5) |

---

## Design law: fewer, outcome-oriented tools — not 35

The AI picks from the whole tool list on every call, under time pressure, with no follow-up. A long
list degrades selection (GitHub Copilot cut 40→13 tools and scored higher; Block went 30+→2). So we
do NOT wrap all 35 services as 35 tools. v1 may be a **single** tool (`search_properties`); all
reading is pushed into resources — chiefly `valgate://property/{id}` with its children nested.

---

## Phase roadmap

```
0 Decide ✅ ──▶ 1 Read spike ✅ ──▶ 2 Resources ✅ ──▶ 3 Auth 🔨 ──▶ 4 Writes ──▶ 5 HTTP
   (locked)     (retired risk)       (shipped)         (Clerk OAuth code-  (real id first)  (HTTP pulled
                                                        complete; pending                    forward in P3)
                                                        dashboard config)
```

| Phase | Goal | Auth | Writes | Done when |
|---|---|---|---|---|
| 0 · Decide ✅ | Lock v1 choices | — | — | Done — stdio, demo Ctx, read-only, `mcp-server/`, SDK v1.x |
| 1 · Read spike ✅ | Prove a non-Next process calls the services | demo Ctx | no | Done (2026-07-02) — `search_properties` returns 26 real ORG-0001 rows |
| 2 · Resources ✅ | Full read coverage via resources, tiny tool list | demo Ctx | no | Done (2026-07-02) — 1 tool + `property/{id}`, `property/{id}/progress`, `portfolio/snapshot` resources |
| 3 · Auth | Clerk OAuth via `@clerk/mcp-tools` (token store only as fallback); needs HTTP transport — stdio interim = env-token/demo | real token | no | two identities see strictly their own org |
| 4 · Writes | Outcome-shaped write tools, audited | real token | yes | write hits activity log; viewer/demo refused; delete needs preview |
| 5 · HTTP | Remote transport + rate limiting | real token | yes | remote client authed, rate-limited, org-isolated |

---

## File map — reuse first, add little

**Reused unchanged:** `lib/services/*.ts` (35 services), `_mapping.ts` (Ctx/guards), `_crud.ts`
(scoped CRUD), `identity-sync.ts` (Phase 3 auth), `activities.ts` (Phase 4 audit),
`lib/data/types/*` (Zod schemas as tool inputs), `lib/data/derivations/{ai-context,portfolio-snapshot,progress}.ts`
(resources). `lib/auth/ctx.ts` is referenced (DEMO_CTX reused) but never modified.

**New:** `mcp-server/index.ts` (server entry), `mcp-server/ctxFor.ts` (the one real gap — demo Ctx
in Phase 1, `ctxFromMcpAuth` in Phase 3).

---

## Security fixes (folded in from field research)

| Fix | What | Phase |
|---|---|---|
| Tool count discipline | Fewer outcome-oriented tools; reading via resources | 2 |
| Audit every write | Route MCP mutations through `lib/services/activities.ts` | 4 |
| Self-describing schemas | `.describe()` on every field (mcp-builder skill) | 2 |
| Token-audience validation | Reject any token not issued for this server (OAuth Resource Server) | 3 |
| Human-in-the-loop | `delete_property` admin-only + preview-first + audited | 4 |

Structural advantage: tools call typed Drizzle services with **no shell execution** — sidesteps the
biggest vulnerability category (command injection).

---

## Tooling — identified, deferred (install at point-of-use)

| Tool | What | Install when |
|---|---|---|
| `@modelcontextprotocol/sdk` (v1.x) | The MCP server SDK — the one real new dependency | Phase 1 |
| `mcp-builder` (Anthropic skill) | MCP tool-design methodology; pairs with `/spec` | Phase 1 (verify repo/syntax) |
| MCP Inspector | Browser UI to test tools/resources without an AI client | Phase 1 testing |
| `@anthropic-ai/mcpb` | One-click Claude Desktop bundle | Phase 5 (distribution) |

---

## Next step

Run **`/spec` on Phase 1** — produces the approve-first spec with no code/DB. Dev Neon branch is
identified: **`dev` / `br-solitary-lab-aoci2g33`** (never the `production` branch
`br-nameless-haze-ao2psydp`).
