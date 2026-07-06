# Plan — Bring the MCP tool surface into the in-app AI assistant

**Author:** Opus (planning)  ·  **Executor:** Sonnet  ·  **Date:** 2026-07-06

## 1. The problem in one paragraph

We have **two parallel tool surfaces** that both wrap `lib/services/*`:

| | In-app AI (`lib/actions/ai-tools.ts`) | MCP server (`mcp-server/register.ts` + `writes.ts` + `writes-rental.ts`) |
|---|---|---|
| Model runtime | Vercel AI SDK `generateText`, `claude-sonnet-4-6` | `@modelcontextprotocol/sdk` `server.registerTool` |
| Ctx (identity) | **session** — each tool calls `requireCtx()` | **OAuth** — `getCtx(extra, opts)` seam → `ctxFromMcpAuth` |
| Writes | **propose only** — return a `proposedAction`, nothing mutates until a human clicks Approve | **execute for real** — 16 role-enforced, audited tools; deletes behind a confirm gate |
| Coverage | 5 reads + 7 `propose_*` | 2 reads + resources + 5 property writes + 9 rental writes |

The in-app AI can *read* and *suggest* but cannot actually create/update/delete anything. The MCP surface already does the real thing, safely. **Goal: let the in-app AI execute the real MCP write surface.**

The only genuine difference between the two is **how `Ctx` is resolved** (session vs OAuth) and **how a tool result is shaped** (plain object vs MCP `ToolResult`). Everything underneath — Zod input schemas (`lib/data/types/*`) and the service functions (`lib/services/*`) — is *already* shared. So this is a thin-adapter problem, not a rewrite.

> Note: `mcp-server/tools.ts` (`registerValgateTools` / `ToolDeps`) is **orphaned** — no route imports it. The live path is `app/mcp/route.ts → registerValgateMcp` only. Delete `tools.ts` as cleanup (separate, optional).

---

## 2. The two decisions (locked, with rationale)

### Decision 1 — Execute writes directly, or keep propose→approve?

**Locked: Hybrid.** Execute reads and **non-destructive writes** (create / update / record) directly, exactly like MCP. Route **destructive deletes** through a single human-confirm card.

Why (for a backend beginner):
- The **service layer already authorizes every mutation** — org-scope + role (`requireMember`, admin-only delete) + demo read-only (`assertCanMutate`). A direct write from the in-app AI hits the *same* guard rails as the MCP connector and the website itself. Executing directly adds **no new attack surface** — it just stops the AI from being able to *only suggest*.
- **Deletes are irreversible and cascade** (deleting a property destroys its leases, payments, documents…). MCP guards this with a "call again with `confirm: true`" step — but in a chat the *AI* decides to confirm, i.e. a robot approving its own destructive act. In our UI there is a **real human at the keyboard**, so we upgrade that gate to a real click. This is strictly *safer* than MCP and reuses the `ApprovalGate` card we already built.

Rejected alternatives:
- *Propose everything (keep current flow for all writes):* would mean writing a `propose_*` wrapper for all 16 tools — a **third** copy of the surface, the opposite of "one source of truth", and it makes the assistant feel sluggish (every "set the rent to X" needs a click). YAGNI.
- *Execute everything including deletes:* one malformed tool call could cascade-delete a property. The click costs nothing and removes that whole class of accident.

### Decision 2 — How to surface the delete confirm gate in the chat UI?

**Locked: reuse the existing `ApprovalGate` machinery, generalized.**

Today `approveProposedAction` is a hardcoded 7-way switch. Generalize it to *"re-invoke tool X with the confirm flag"*:
- A delete tool's **preview** (the service's `getX` + `countXCascade`) becomes the `proposedAction`: `{ toolName, args, consequence, cascade }`.
- The amber `ApprovalGate` card already renders `consequence` + a payload table — add one line: *"This will also permanently delete N leases, M payments."*
- Human clicks **Approve** → `approveProposedAction` runs the **same shared tool body** with confirm → deletes → audited. The existing success / reject / error states are reused as-is.

We **drop Undo** for the new direct-execute writes (it only worked via the `preImage` captured in a proposal). Rationale: keeping undo means capturing a pre-image on every execute — real added complexity for a feature the audit log + a follow-up "change it back" message already cover. Flagged as removable; easy to add back later per-tool if wanted.

---

## 3. Architecture — one definition, two adapters

Create a **transport-neutral tool registry** that both surfaces build from. This is the "define the surface once" the task asks for.

```
lib/data/types/*        (Zod schemas — ALREADY shared)
lib/services/*          (DB access — ALREADY shared)
        │
        ▼
mcp-server/tool-defs.ts     ← NEW: the 16 tools as plain (ctx, args) => result
        │
        ├── mcp-server/register.ts     adapter A → MCP registerTool  (OAuth ctx, ToolResult shape)
        └── lib/actions/ai-tools.ts    adapter B → Vercel AI SDK tool (session ctx, plain object)
```

### The shared shape (`mcp-server/tool-defs.ts`)

Keep it minimal and explicit (matches the repo's readable-code preference). A tool body **never resolves ctx and never sees `orgId`/`confirm`** — those are adapter concerns.

```ts
// A tool body returns a discriminated result so BOTH adapters can map errors
// to their own shape without re-implementing the not-found logic.
type ToolOutcome<T> = { ok: true; data: T } | { ok: false; message: string };

type ReadOrWriteDef = {
  kind: "read" | "write";
  name: string;
  description: string;
  input: z.ZodObject<any>;                    // WITHOUT orgId (org comes from ctx)
  run: (ctx: Ctx, args: any) => Promise<ToolOutcome<unknown>>;
  audit?: (ctx: Ctx, args: any, data: any) => LogActivityInput;  // writes only
};

type DestructiveDef = {
  kind: "destructive";
  name: string;
  description: string;
  input: z.ZodObject<any>;
  preview: (ctx: Ctx, args: any) => Promise<ToolOutcome<{ consequence: string; cascade: unknown }>>;
  commit:  (ctx: Ctx, args: any) => Promise<ToolOutcome<unknown>>;
  audit?:  (ctx: Ctx, args: any, data: any) => LogActivityInput;
};

export type ValgateToolDef = ReadOrWriteDef | DestructiveDef;
export const VALGATE_TOOLS: ValgateToolDef[] = [ /* the 16, ported from writes.ts / writes-rental.ts */ ];
```

The bodies are a **faithful lift** of the current MCP handlers — same service calls, same Zod schemas, same audit rows. Only the ctx-resolution and result-wrapping are stripped out (they move to the adapters).

### Adapter A — MCP (`register.ts`)
For each def, `server.registerTool` with:
- input schema = `def.input` **plus** the `orgIdArg` (unchanged — MCP is multi-org and stateless).
- ctx via `resolveWriteCtx(getCtx, extra, args.orgId, …)` (writes) / `getCtx(extra)` (reads) — unchanged.
- `destructive`: keep the `confirm` two-step — `confirm !== true` → return `preview`; else `commit` + `audit`.
- wrap `ok`/`message` in `toolOk`/`toolError`. **Output stays byte-for-byte compatible with today**, so the live MCP surface and its e2e verification do not regress.

### Adapter B — in-app (`ai-tools.ts`)
For each def, build a Vercel AI SDK `tool({ description, inputSchema, execute })`:
- **No `orgId` arg** — `execute` calls `requireCtx()` (the session already carries the single active org).
- `read` / `write`: `run(ctx, args)` → return `data` (or `{ error: message }`) as a plain object for the model. On `write` success, call `logActivity` (reuse the `audit()` helper).
- `destructive`: `execute` calls `preview(ctx, args)` and returns a **`proposedAction`** `{ toolName, args, consequence, cascade }` — the model text confirms *"prepared a delete for your approval"*, and the amber `ApprovalGate` renders it. The human's **Approve** calls `approveProposedAction`, which runs `commit(ctx, args)` + `audit`.

---

## 4. In-app tool inventory after this change

Keep the 5 rich **page-shaped reads** (they're already wired and more useful than entity reads for Q&A):
`getDashboardOverview, getRentCollection, getWorkOrders, getComplianceOverview, getClientPortfolio`.

Add **`search_properties`** — writes need property **ids**, and the page reads don't expose them (rent/compliance reads already expose `leaseId`/`paymentId`/`riskId`).

Add the **real writes** (direct execute): `create_property, update_property, record_maintenance, create_lease, update_lease, create_tenant, update_tenant, record_payment, update_payment`.

Add the **gated deletes** (Approve card): `delete_property, delete_lease, delete_tenant, delete_payment`.

Remove the 7 `propose_*` tools and the `ACTION_AGENT_MAP` / Agent-Hub-board-card path they fed (that flow is superseded).

---

## 5. Gotchas for the executor

1. **`stopWhen: stepCountIs(5)`** in `ai-overlay.actions.ts` is tight for search→write chains (find the property, then update it). Bump to ~8–10.
2. **Audit parity.** Every in-app write must `logActivity` like MCP does. Move/export the `audit()` helper from `writes.ts` (or lift into `tool-defs.ts`) so both adapters share it.
3. **Result serialization differs.** MCP returns `{content, structuredContent, isError}`; a Vercel AI SDK tool returns a plain JS object that is JSON-serialized to the model. The in-app adapter must return `data` / `{error}` — **not** the MCP `ToolResult` shape.
4. **Single active org.** In-app AI acts only in the session's current workspace (no `orgId` arg). A manager acting on a client's portfolio must have that org active (existing org-switcher behavior). Document this; it's fine.
5. **`generateAssistantReply` proposedAction extraction** already scans tool results for a `proposedAction` key (lines 236–249) — the new destructive adapter output slots straight in. `approveProposedAction` is the piece that changes shape (generic tool-confirm instead of the 7-way switch).
6. **Demo/read-only + role errors** surface from the service as thrown errors. Bodies should catch service throws that mean "forbidden"/"not found" and return `{ ok: false, message }` so the model can explain it, rather than a generic 500. (Match the existing MCP `toolError` messages.)

---

## 6. Phasing (each phase independently shippable + verifiable)

**Phase 1 — Ship the goal (new code, MCP untouched → zero risk to the live surface).**
- Author `mcp-server/tool-defs.ts` by lifting the 16 bodies out of `writes.ts`/`writes-rental.ts` (faithful port).
- Rewrite `lib/actions/ai-tools.ts` to build the in-app tool set from `VALGATE_TOOLS` (adapter B): reads + direct writes + gated-delete `proposedAction`s + keep the 5 page reads.
- Generalize `approveProposedAction` in `ai-overlay.actions.ts` to run a `commit` by `toolName`; delete the propose-only tools + `ACTION_AGENT_MAP`.
- Extend `ApprovalGate` with a one-line cascade summary for deletes.
- Update `SYSTEM_PROMPT` Pro block: *"you can now execute these actions; deletes ask the user to confirm."*
- **Verify:** in-app AI creates/updates a property, lease, tenant, payment; a delete shows the Approve card and only deletes on click; each write lands an `activities` row. Run `npm run test` (authz suite) + `npx tsc --noEmit`.

**Phase 2 — DRY the MCP side (optional, behind the live e2e).**
- Refactor `register.ts`/`writes.ts`/`writes-rental.ts` to build from `VALGATE_TOOLS` (adapter A), keeping output byte-compatible.
- **Verify:** the MCP e2e / connector check still passes (tool list + a create/update/delete round-trip). After this, tool #17 is added **once** and both surfaces get it.

> If the MCP e2e is trusted, Phase 2 can ride in the same PR as Phase 1. If not, ship Phase 1 alone — it already meets the goal — and do Phase 2 when there's time to re-verify the connector.

---

## 7. Files touched

| File | Phase | Change |
|---|---|---|
| `mcp-server/tool-defs.ts` | 1 | **NEW** — the 16 tool bodies, transport-neutral |
| `lib/actions/ai-tools.ts` | 1 | Rebuild from `VALGATE_TOOLS`; add real writes + gated deletes; drop `propose_*` |
| `lib/actions/ai-overlay.actions.ts` | 1 | Generalize `approveProposedAction`; bump `stepCountIs`; system-prompt copy; drop `ACTION_AGENT_MAP` |
| `components/layout/ai-overlay/ApprovalGate.tsx` | 1 | Add cascade line for delete confirmations |
| `lib/data/types/ai-message.ts` | 1 | `AiProposedAction` → `{ toolName, args, consequence, cascade }` (generic) |
| `mcp-server/writes.ts` / `writes-rental.ts` / `register.ts` | 2 | Consume `VALGATE_TOOLS` (adapter A) |
| `mcp-server/tools.ts` | — | **Delete** (orphaned) — optional cleanup |

## 8. Explicitly out of scope
- Undo for direct-execute writes (removed; audit log covers it).
- Cross-org action from a single chat (in-app is single active org by design).
- Streaming tool progress in the chat (current step-trace UI is enough).
