# 02 — Ideal Valgate MCP Design

> What the server should expose and how it should be shaped. Every design choice gives
> two options, the tradeoff, and a recommendation with one-line reasoning.
>
> Guiding principle (from CLAUDE.md + ponytail): **tools are thin wrappers over existing
> `lib/services/*` functions.** New logic in the MCP layer is a smell. If a tool needs
> logic the service doesn't have, add it to the service, not the tool.

---

## A. Transport — how the AI client connects

**Option 1 — stdio** (the server is a local subprocess the client spawns).
- Pros: simplest; no network, no ports, no public auth; works with Claude Desktop today.
- Cons: single user, local only; can't serve a remote/multi-user product.

**Option 2 — Streamable HTTP** (the server runs as a web service clients call over HTTP).
- Pros: multi-user, remote, fits a hosted product; one server, many clients.
- Cons: needs real auth, TLS, rate limiting, deployment — much more surface area.

➡️ **Recommendation: start stdio, design for HTTP.** Reasoning: stdio gets a working,
useful server in front of us in days with zero infra; we keep the auth seam (W1) abstract
so swapping to HTTP later is a transport change, not a rewrite. Build v1 stdio.

---

## B. Auth — how an AI client becomes a Valgate `Ctx`

This is gap **W1/M2** from the readiness doc — the one genuinely new piece. The MCP
server must turn an incoming caller into `Ctx = { userId, orgId, orgRole }`.

**Option 1 — Reuse demo `Ctx` for a local spike.**
- Evidence it exists: `lib/auth/ctx.ts:12` — `DEMO_CTX = { userId: "USR-0001",
  orgId: "ORG-0001", orgRole: "owner" }`.
- Pros: zero new auth code; unblocks the entire build immediately; safe because
  `DEMO_MODE` makes writes refuse (`_mapping.ts:17`).
- Cons: single hardcoded tenant; not real auth; read-only unless `DEMO_ALLOW_WRITES`.

**Option 2 — Static per-workspace API token → `Ctx`.**
- New `ctxFromMcpAuth(token)` that looks the token up, maps to an org + user + role
  using existing `ourOrgId`/`ourUserId`/`normaliseRole` (`lib/services/identity-sync.ts`).
- Pros: real multi-tenant auth; non-interactive (works headless); minimal new concepts.
- Cons: must build a token table + issuance UI; token storage/rotation to design.
- **Must validate token audience** (added 2026-06-23): the MCP spec classifies a server as
  an OAuth **Resource Server** — it must **reject any token not issued for *this* server**
  (prevents "token passthrough" abuse). For our static tokens that means: scope each token
  to the MCP server, and refuse tokens minted for anything else. Bake this into the design,
  don't bolt it on. Confirm with `/cso` at Phase 3.

**Option 3 — Clerk machine tokens / OAuth.**
- Pros: reuses our existing identity provider; no new secret store.
- Cons: heaviest; depends on what Clerk's installed version supports `[unverified —
  Clerk uses the Future/signals API in this project]`; likely overkill for v1.

➡️ **Recommendation: Option 1 for the Phase-1 spike, Option 2 for the first real
version.** Reasoning: prove the plumbing with the demo `Ctx` (no auth rabbit-hole),
then add the smallest real auth that works headlessly — a per-workspace token. Defer
Clerk machine auth (Option 3) until a customer actually needs SSO-grade MCP access.

---

## C. Tools — the actions the AI can take

> ⚠️ **Design law (added 2026-06-23 from field research): fewer, outcome-oriented tools.**
> The AI picks from the *whole* tool list on every call, under time pressure, with no
> chance to ask a follow-up. A long list *degrades* selection. This is the #1 MCP
> anti-pattern. Evidence: GitHub Copilot cut 40 tools → 13 and scored *higher*; Block
> rebuilt its Linear server from 30+ tools to **2**. So we do **NOT** mechanically wrap
> all 35 services as 35 tools. We expose a small set of tools for *actions*, and push
> *reading* into **resources** (§D), which don't crowd the tool list.

Tools are thin wrappers. Each maps to a service function that already exists. Pattern:

```ts
// shape only — not final code
server.registerTool(
  "list_properties",
  { title: "List properties", description: "...", inputSchema: z.object({}) },
  async (_args, extra) => {
    const ctx = await ctxFor(extra);              // W1 seam
    const data = await listProperties(ctx);        // existing service, unchanged
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { data } };
  }
);
```

### Tool catalogue — small on purpose

**v1 (read-only)** — keep it to a *handful*. Most reading is served by resources (§D),
so v1 needs barely any tools:

| Tool | Calls (existing) | Input | Why a tool, not a resource |
|---|---|---|---|
| `search_properties` | `listProperties(ctx)` — `lib/services/properties.ts:22` | optional filter | the entry point — the AI needs a property id before it can read a resource |

That may genuinely be the **only** v1 tool: list properties → then pull everything else
via `valgate://property/{id}` resources. Resist adding `list_tenants`, `list_leases`,
`list_documents`, … as separate tools — those are *fields of a property*, so they belong
in the property resource, not the tool list.

**v2 (writes)** — add *outcome-oriented* tools, grouped by user intent, **not** one per
table. Each still wraps existing services and rides the existing role/demo guards:

| Tool | Wraps | Input | Notes |
|---|---|---|---|
| `create_property` | `createProperty` — `properties.ts:36` | `NewProperty` (Zod) | member+ |
| `update_property` | `updateProperty` — `properties.ts:55` | `{ id, patch }` | member+ |
| `delete_property` | `deleteProperty` — `properties.ts:76` | `{ id }` | **admin only + preview-first + audit** (§G) |
| `preview_property_delete` | `countPropertyCascade` — `properties.ts:144` | `{ id }` | blast-radius before any delete |
| `record_maintenance` | `lib/services/maintenance-items.ts` | Zod | example of an intent-shaped write |

> **Rule of thumb when adding a tool:** could this be a *field on an existing resource*
> instead? If yes, make it a resource. Could two tools be one outcome-shaped tool? Merge
> them. Target a tool list you can read in one screen — not 35 entries.

### Tool descriptions are the contract (not an afterthought)
The AI reads the **schema + description** to decide whether and how to call a tool — there
is no separate API doc. So:
- Write narrow input schemas (reuse `New*Schema`), and add **`.describe()` on every field**
  explaining valid values.
- Give each tool a one-sentence, outcome-shaped `description` ("Find a user's properties by
  name or address", not "lists properties").
- This is exactly what the deferred **`mcp-builder`** skill enforces — use it when authoring
  tools (`03-resources-and-skills.md` §B.1).

### Read-vs-write policy
**Option 1** — read + write from day one. **Option 2** — read-only v1, writes in v2.
➡️ **Recommendation: read-only v1.** Reasoning: 90% of the AI-assistant value is "answer
questions about my portfolio," writes carry the real risk, and `assertCanMutate` already
lets us flip writes on per-environment when ready. Less to get wrong on the first pass.

---

## D. Resources — read-only context the AI can pull

Resources differ from tools: they're addressable *data*, not *actions*. Ideal Valgate
resources reuse existing derivations (readiness R7):

| Resource URI (proposed) | Backed by | Why |
|---|---|---|
| `valgate://property/{id}` | `getProperty` + **nested child lists** (tenants, leases, payments, documents, …) | one fetch = the whole property; replaces ~10 would-be list-tools |
| `valgate://property/{id}/ai-context` | `lib/data/derivations/ai-context.ts` `[unverified sig]` | pre-shaped AI summary |
| `valgate://portfolio/snapshot` | `lib/data/derivations/portfolio-snapshot.ts` `[unverified sig]` | one-call overview |
| `valgate://property/{id}/progress` | `lib/data/derivations/progress.ts` `[unverified sig]` | pillar completeness |

➡️ **Recommendation: resources carry the reading load (see §C design law).** Reasoning:
they already compute AI-ready summaries, keep the AI's context small (one resource vs many
tool calls), and — critically — they keep the *tool list* short. The `valgate://property/{id}`
resource nesting its children is what lets v1 ship with essentially one tool.

---

## E. Output shape — what tools return

**Option 1** — return `structuredContent` (typed JSON) + a text mirror.
**Option 2** — return text only.
➡️ **Recommendation: structured + text** (the SDK supports both; see `03`). Reasoning:
structured output lets a client program against the data; the text mirror keeps it
human-readable in a chat. Costs nothing extra.

---

## F. Where the code lives

**Option 1** — new top-level `mcp-server/` package in the same repo (monorepo-style).
**Option 2** — a route inside the Next.js app (`app/api/mcp/route.ts`).
➡️ **Recommendation: separate `mcp-server/` for stdio v1; consider an app route only if
we go HTTP-hosted.** Reasoning: stdio is a standalone process — keeping it out of the Next
app avoids dragging the whole framework into a CLI subprocess, and it imports
`lib/services/*` directly via the existing `@/` path alias. Re-evaluate at the HTTP step.

---

## G. Security must-haves (non-negotiable, from CLAUDE.md)

These are **not** simplified away — they're trust-boundary rules:
1. **Validate every tool input with Zod** before touching a service (reuse `New*Schema`).
2. **Never return `err.message`** to the client — mirror the `ActionResult` pattern
   (`app/actions/_result.ts`): log internally, return a generic string.
3. **Authorize, not just authenticate** — rely on the service-layer org-scope + role
   checks (R2/R3); never bypass them in a tool.
4. **Rate limit before any public HTTP surface** (M3) — an agent loops; a human doesn't.
5. **Secrets stay server-side** — `DATABASE_URL`, tokens; never `NEXT_PUBLIC_`.
6. **Audit every write** (added 2026-06-23) — never ship a destructive tool without an
   audit trail. Route MCP mutations through the existing **`lib/services/activities.ts`**
   so each AI-driven create/update/delete is recorded (who/what/when). Near-free: the
   service already exists. Enforced at Phase 4.
7. **Human-in-the-loop for destructive ops** (added 2026-06-23) — `delete_property` and any
   irreversible tool must require explicit confirmation. The MCP client (Claude Desktop)
   prompts before each tool call by default, but make it explicit: deletes require a
   prior `preview_property_delete` call, are admin-only, and are audited (rule 6).
8. **Validate token audience** (added 2026-06-23) — reject any token not issued for this
   server (see §B Option 2). Applies once real auth lands (Phase 3).
9. **Keep the tool list short** (added 2026-06-23) — a sprawling tool list is itself a
   failure mode (§C design law): the model mis-selects under pressure. Treat tool count as
   a budget, not a backlog.

---

## H. The ideal, in one paragraph

A standalone `mcp-server/` process, stdio transport for v1, that builds a Valgate `Ctx`
through a single new `ctxFor()` seam (demo `Ctx` first, per-workspace token next), exposes
a **deliberately small** tool set (v1 may be a single `search_properties` tool) and pushes
all the reading into a handful of **resources** — chiefly `valgate://property/{id}` with its
children nested — so the tool list stays short and the model selects well. Inputs validate
with the *same* Zod schemas the website uses (with `.describe()` on every field), and the
server inherits org-scoping, role checks, and demo read-only safety **for free** by calling
`lib/services/*` unchanged. Writes arrive in v2 as outcome-oriented tools, behind the
existing guards **plus an audit trail** (`activities` service) and human-confirmation on
destructive ops. HTTP transport, token-audience validation, and real rate limiting arrive
only when a remote/multi-user use case is real.
