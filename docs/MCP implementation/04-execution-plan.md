# 04 — Execution Plan (planning → shipped MCP)

> Phased framework. Each phase has a **goal**, **concrete steps**, **files touched**,
> **dependencies**, and a **done-when** check. Phase 1 is deliberately tiny and
> verifiable — prove the foundation before building breadth.
>
> Everything in this plan is *additive*. We do not modify `lib/services/*`. If a phase
> seems to require editing a service, stop and ask — that's a design smell.

---

## Phase 0 — Decisions (no code) ✅ LOCKED 2026-06-23

**Goal:** lock the open decisions so Phase 1 has no ambiguity.

**Decisions (confirmed by owner — "go with recommended, as v1"):**
1. **Transport for v1 → stdio.** Local subprocess, no hosting. (`02-ideal-mcp-design.md` §A)
2. **v1 auth → demo `Ctx`** (`ORG-0001` / `USR-0001` / owner, read-only via `DEMO_MODE`).
   Real per-workspace tokens deferred to Phase 3. (`02` §B, Option 1)
3. **v1 scope → read-only.** Read tools + resources first; writes in Phase 4 behind the
   existing `assertCanMutate` / role guards. (`02` §C)
4. **Code location → `mcp-server/`** standalone package, imports `lib/services/*` via `@/`. (`02` §F)
5. **SDK → `@modelcontextprotocol/sdk`** stable v1.x (not the v2 alpha). (`03` §A)

**Files touched:** none.
**Depends on:** nothing.
**Done when:** ✅ choices confirmed. Next: `/spec` on Phase 1, then build the spike.

---

## Phase 1 — Read-only spike (prove the foundation)

**Goal:** a working stdio MCP server that exposes **one read tool** backed by a real
service, returning real Neon data — proving a non-Next process can call `lib/services/*`.

**Steps:**
1. Verify facts first: `npm view @modelcontextprotocol/sdk version`; read the actual
   signatures of `lib/data/derivations/ai-context.ts` etc. (resolve the `[unverified]`
   notes); confirm `package.json` has no MCP dep yet.
2. `npm install @modelcontextprotocol/sdk` (stable v1.x).
3. Create `mcp-server/index.ts`: `new McpServer(...)`, `StdioServerTransport`, `connect`.
4. Add a `ctxFor()` seam returning the demo `Ctx` (`{ userId:"USR-0001", orgId:"ORG-0001",
   orgRole:"owner" }`, mirroring `lib/auth/ctx.ts:12`).
5. Register **one** tool: `list_properties` → `listProperties(ctx)`
   (`lib/services/properties.ts:22`). Return `structuredContent` + text.
6. **Resolve W2:** run the server. If `import "server-only"` throws in the Node process,
   add the empty-module alias shim (do **not** edit services). Record the outcome in
   `01-infrastructure-readiness.md`.
7. Connect it to Claude Desktop (or `mcp` inspector) and call the tool.

**Files touched:** new `mcp-server/` only; `package.json` (one dep); maybe a build-config
alias for `server-only`.
**Depends on:** Phase 0; a **dev** Neon branch reachable via `DATABASE_URL`.
**Done when:** an MCP client calls `list_properties` and gets real ORG-0001 properties
back, and the W2 (`server-only`) question is answered in writing.

> This phase is the whole risk-retirement. If it works, everything after is repetition.

---

## Phase 2 — Read breadth (all entities + resources)

**Goal:** read tools for the major entities + the three derivation-backed resources.

**Steps:**
1. Add `list_*` / `get_*` tools across services (properties, tenants, leases, payments,
   documents, maintenance-items, ownership-records, etc. — the 35 in `lib/services/`).
2. Add a small registration helper so each entity is a few lines, not copy-paste bloat
   (a thin loop over `{ name, service, schema }` — keep it readable, no clever metaprogramming).
3. Register resources: `valgate://portfolio/snapshot`, `valgate://property/{id}/ai-context`,
   `valgate://property/{id}/progress` (`02` §D).
4. Mirror the `ActionResult` error rule: catch, log internally, return a generic string —
   never raw `err.message`.

**Files touched:** `mcp-server/*` only.
**Depends on:** Phase 1.
**Done when:** an AI client can answer "summarise this user's portfolio and flag gaps"
using only resources + read tools, with no website involved.

---

## Phase 3 — Real auth seam (multi-tenant)

**Goal:** replace the demo `Ctx` with a real, headless, per-workspace token (`02` §B, Opt 2).

**Steps:**
1. Design a minimal token store (table + issuance). Run **`/cso`** on this design first.
2. Build `ctxFromMcpAuth(token)` reusing `ourOrgId`/`ourUserId`/`normaliseRole`
   (`lib/services/identity-sync.ts`).
3. Swap `ctxFor()` to read the token from the MCP client's auth, fall back to demo only
   when `DEMO_MODE`.
4. Test tenant isolation: a token for ORG-A must never see ORG-B data (it can't, because
   org-scope lives in the services — but prove it with a test).

**Files touched:** `mcp-server/*`, new token store (new schema file — **stop and ask
before touching the DB schema**), the auth seam.
**Depends on:** Phase 2; a decision to go multi-tenant.
**Done when:** two different tokens see strictly their own org's data.

---

## Phase 4 — Writes (behind existing guards)

**Goal:** enable create/update/delete tools, safely.

**Steps:**
1. Add `create_*`/`update_*`/`delete_*` tools wrapping the existing service mutations
   (validation via the existing `New*Schema`/`*PatchSchema`).
2. Rely entirely on service-layer guards: `assertCanMutate` (demo), `requireMember`/
   `requireAdmin` (role). The tool adds **no** new authz.
3. Keep deletes admin-only and surface the cascade preview (`countPropertyCascade`,
   `properties.ts:144`) as a separate read tool the AI must call first.
4. Run **`/review`** on the full diff.

**Files touched:** `mcp-server/*` only.
**Depends on:** Phase 3 (you want real identity before allowing writes).
**Done when:** an AI client creates/updates a record under a real token, and the same
operation is correctly refused for a viewer role and in `DEMO_MODE`.

---

## Phase 5 — HTTP transport + rate limiting (only if remote is real)

**Goal:** serve the MCP over HTTP for remote/multi-user clients.

**Steps:**
1. Swap stdio for the SDK's Streamable HTTP transport (transport change, not a rewrite —
   the tools are unchanged).
2. Add rate limiting (M3) — pick the project's "decide later" rate-limit lib now. Agents
   loop; this is mandatory before any public surface. Run **`/cso`** again.
3. TLS, deployment, secret rotation (rotate the Neon prod string before any prod deploy).

**Files touched:** `mcp-server/*`, deploy config.
**Depends on:** a real remote use case. **Do not build speculatively** (YAGNI) — stdio may
be enough for a long time.
**Done when:** a remote client authenticates over HTTP, is rate-limited, and sees only its
own org's data.

---

## Dependency graph

```
Phase 0 (decide)
   └─> Phase 1 (read spike)  ← retires all the technical risk
          └─> Phase 2 (read breadth + resources)
                 └─> Phase 3 (real auth)
                        └─> Phase 4 (writes)
                               └─> Phase 5 (HTTP + rate limit)  ← only if remote is real
```

## Suggested first action
Run **`/spec`** on Phase 1 to turn it into an executable spec, then build the spike. Phase 1
is small on purpose: one tool, one service, real data — if it returns ORG-0001's properties
through Claude Desktop, Valgate's MCP is real and the rest is repetition.
