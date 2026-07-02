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

**Goal:** full read coverage via **resources, not a pile of tools** (`02` §C design law).

**Steps:**
1. Build the `valgate://property/{id}` resource that returns a property with its children
   **nested** (tenants, leases, payments, documents, …) — one fetch replaces ~10 list-tools.
2. Register the derivation-backed resources: `valgate://portfolio/snapshot`,
   `valgate://property/{id}/ai-context`, `valgate://property/{id}/progress` (`02` §D).
3. Keep the **tool** list tiny — likely just `search_properties` (the entry point that hands
   the AI an id). Before adding any other read tool, ask "could this be a field on the
   property resource?" — if yes, it's a resource, not a tool.
4. Write `.describe()` on every input field; outcome-shaped one-line tool descriptions
   (use the **`mcp-builder`** skill). Mirror the `ActionResult` error rule: catch, log
   internally, return a generic string — never raw `err.message`.

**Files touched:** `mcp-server/*` only.
**Depends on:** Phase 1.
**Done when:** an AI client can answer "summarise this user's portfolio and flag gaps"
using only resources + the one search tool — and the total tool count fits on one screen.

---

## Phase 3 — Real auth seam (multi-tenant)

**Goal:** replace the demo `Ctx` with real per-user auth (`02` §B).

> **Transport coupling (2026-07-02):** Clerk's OAuth flow only works over the **HTTP
> transport**, not stdio — so full multi-tenant OAuth implies pulling Phase 5's transport
> forward. For a stdio server the interim pattern is a per-client token in the MCP client's
> config `env` block (no `.env` file), or staying on the demo `Ctx`.

**Steps:**
1. **Clerk first — do not hand-roll.** Valgate already uses Clerk, and Clerk ships MCP
   auth support: `@clerk/mcp-tools` (`generateClerkProtectedResourceMetadata` for the
   `/.well-known/oauth-protected-resource` handshake) + `clerkClient.authenticateRequest(req,
   { acceptsToken: 'oauth_token' })` for validation. Login/consent screens come free.
   **Dynamic client registration** (Clerk dashboard setting) lets Claude register its own
   OAuth client; ChatGPT can't — it needs a manually created OAuth application in the Clerk
   dashboard (known gotcha). Design a custom token store ONLY if Clerk can't express what
   we need. Run **`/cso`** on whichever design wins.
2. Build `ctxFromMcpAuth()` reusing `ourOrgId`/`ourUserId`/`normaliseRole`
   (`lib/services/identity-sync.ts`) — the Clerk OAuth token resolves to a real Clerk user,
   which plugs straight into the existing identity-sync mapping.
   - **Org selection (M2) — done.** A Clerk token names a *user*, not an org, but one user can
     belong to several orgs. Resolution is always deterministic: an explicit `requestedOrgId`
     (validated against the user's active memberships) wins; a single-org user uses their one org;
     a multi-org user with no explicit org falls back to a stable **primary** (most senior role,
     tie-broken by org id). The default is safe here because Phase 3 is **read-only** and a user
     only ever sees orgs they belong to. The `list_workspaces` tool surfaces all their orgs (+ which
     is current) so the default is never hidden. **Phase 4 writes must pass `requestedOrgId`
     explicitly** — a write must never fall back to a guessed org.
3. **Validate token audience (M1) — done, with a caveat proven by reading the SDK.** The
   assumption that Clerk covers this was **false**: neither `verifyClerkToken` nor Clerk's
   underlying OAuth verification checks that a token was issued for *this* resource. Clerk
   OAuth tokens are bound to the Clerk **instance**, not to a resource — verification returns
   `{ clientId, scopes, userId }` with **no `aud`/resource claim**. So any OAuth client in our
   instance could otherwise call `/mcp`. Because Clerk exposes the token's `clientId`, we bind
   explicitly with a **client-id allowlist**: `MCP_ALLOWED_OAUTH_CLIENT_IDS` (env, comma-sep).
   Set → only those clients are accepted (others 401); unset → accept any client in the instance
   (required for Dynamic Client Registration, which mints client ids we can't know ahead of time)
   and log a warning. Enforced in `app/mcp/route.ts` (`isOAuthClientAllowed`). **Still to prove
   with a live token** (blocked on Clerk dashboard config): mint a token for a *different* client
   and confirm `/mcp` 401s once the manual ChatGPT app's client id is the sole allowlist entry.
4. Swap `ctxFor()` to read the token from the MCP client's auth, fall back to demo only
   when `DEMO_MODE`.
5. Test tenant isolation: a token for ORG-A must never see ORG-B data (it can't, because
   org-scope lives in the services — but prove it with a test).

**Files touched:** `mcp-server/*`, the auth seam; a token store schema only in the
fallback case (**stop and ask before touching the DB schema**).
**Depends on:** Phase 2; a decision to go multi-tenant.
**Done when:** two different tokens see strictly their own org's data.

---

## Phase 4 — Writes (behind existing guards)

**Goal:** enable **outcome-oriented** write tools, safely — never a destructive tool
without an audit trail and a confirmation gate.

**Steps:**
1. Add write tools shaped by *user intent*, not one-per-table (`02` §C). Validate via the
   existing `New*Schema`/`*PatchSchema`.
2. Rely entirely on service-layer guards: `assertCanMutate` (demo), `requireMember`/
   `requireAdmin` (role). The tool adds **no** new authz.
3. **Audit every write** — route mutations through the existing `lib/services/activities.ts`
   so each AI-driven create/update/delete is recorded (who/what/when). Pre-launch gate: no
   destructive tool ships without this (`02` §G rule 6).
4. **Destructive ops need a confirmation gate** — `delete_property` is admin-only, requires a
   prior `preview_property_delete` (cascade blast-radius via `countPropertyCascade`,
   `properties.ts:144`), and is audited (`02` §G rule 7).
5. Run **`/review`** and **`/cso`** on the full diff.

**Files touched:** `mcp-server/*` only.
**Depends on:** Phase 3 (you want real identity + audit before allowing writes).
**Done when:** an AI client creates/updates a record under a real token, the write lands in
the activity log, the same op is refused for a viewer role and in `DEMO_MODE`, and a delete
requires a preview first.

---

## Phase 5 — HTTP transport + rate limiting (only if remote is real)

**Goal:** serve the MCP over HTTP for remote/multi-user clients.

**Steps:**
1. Swap stdio for the SDK's Streamable HTTP transport (transport change, not a rewrite —
   the tools are unchanged). Stateless pattern: one server per request,
   `sessionIdGenerator: undefined, enableJsonResponse: true`, close in `finally`.
   Never put the auth token in the URL (URLs get logged) — it rides in the
   `Authorization` header via the Phase 3 Clerk OAuth flow.
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
