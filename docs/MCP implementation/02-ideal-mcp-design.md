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

### Tool catalogue (v1 candidates — all back onto existing services)

| Tool | Calls (existing) | Input | Read/Write |
|---|---|---|---|
| `list_properties` | `listProperties(ctx)` — `lib/services/properties.ts:22` | — | read |
| `get_property` | `getProperty(ctx, id)` — `properties.ts:30` | `{ id }` | read |
| `create_property` | `createProperty(ctx, input)` — `properties.ts:36` | `NewProperty` (Zod) | write |
| `update_property` | `updateProperty(ctx, id, patch)` — `properties.ts:55` | `{ id, patch }` | write |
| `delete_property` | `deleteProperty(ctx, id)` — `properties.ts:76` | `{ id }` | write (admin) |
| `property_delete_preview` | `countPropertyCascade(ctx, id)` — `properties.ts:144` | `{ id }` | read |
| `list_tenants` / `create_tenant` / … | `lib/services/tenants.ts` | `NewTenantSchema` | read/write |
| `list_documents` | `listDocuments(ctx, propertyId)` — `lib/services/documents.ts` | `{ propertyId }` | read |
| `list_maintenance_items` / `create_…` | `lib/services/maintenance-items.ts` | Zod | read/write |
| `list_leases` / `list_payments` | `lib/services/{leases,payments}.ts` | `{ propertyId }` | read |

> There are **35 services**; the table is a representative starter set, not the full
> list. Recommendation: ship **read tools for all entities** first (low risk), then add
> write tools entity-by-entity behind the existing role/demo guards.

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
| `valgate://property/{id}` | `getProperty` + child lists | full record for deep questions |
| `valgate://property/{id}/ai-context` | `lib/data/derivations/ai-context.ts` `[unverified sig]` | pre-shaped AI summary |
| `valgate://portfolio/snapshot` | `lib/data/derivations/portfolio-snapshot.ts` `[unverified sig]` | one-call overview |
| `valgate://property/{id}/progress` | `lib/data/derivations/progress.ts` `[unverified sig]` | pillar completeness |

➡️ **Recommendation: expose the three derivation-backed resources first.** Reasoning:
they already compute AI-ready summaries, so they're the cheapest high-value resources and
they keep the AI's context small (one resource vs many tool calls).

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

---

## H. The ideal, in one paragraph

A standalone `mcp-server/` process, stdio transport for v1, that builds a Valgate `Ctx`
through a single new `ctxFor()` seam (demo `Ctx` first, per-workspace token next), exposes
read tools for all 35 entities plus three derivation-backed resources, validates inputs
with the *same* Zod schemas the website uses, and inherits org-scoping, role checks, and
demo read-only safety **for free** by calling `lib/services/*` unchanged. Writes arrive in
v2 behind the existing guards. HTTP transport + real rate limiting arrive only when a
remote/multi-user use case is real.
