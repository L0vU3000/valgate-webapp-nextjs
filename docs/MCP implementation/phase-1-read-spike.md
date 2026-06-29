# Valgate MCP — Phase 1: Read-Only Spike

> **Interactive visual plan:** https://plan.agent-native.com/_agent-native/open?app=plan&view=plan&to=%2Fplans%2Fplan-dacafe5002174282&planId=plan-dacafe5002174282
> (id `plan-dacafe5002174282`) — this Markdown file is the durable on-disk mirror.

**Goal:** prove a non-Next.js process can import `lib/services/*` and return real Neon data —
unchanged. **Scope:** ONE read tool (`search_properties`), demo `Ctx`, stdio transport, dev branch,
MCP Inspector to test. **Out of scope:** writes, real auth, resources, more tools, HTTP (Phases 2–5).

Phase 0 is locked: stdio · demo `Ctx` · read-only · standalone `mcp-server/` · `@modelcontextprotocol/sdk` v1.x.

---

## Call path

```
MCP Inspector ──stdio──▶ mcp-server/index.ts ──▶ search_properties tool ──▶ ctxFor() (demo Ctx)
                                                          │
                                                          └─▶ listProperties(ctx)  [REUSE properties.ts:22]
                                                                       └─▶ Neon dev branch (WHERE orgId=ORG-0001)
```

Only `index.ts` + `ctxFor.ts` are new; everything from `listProperties` rightward is reused unchanged.

---

## Build steps (in order)

1. **Verify facts** — `npm view @modelcontextprotocol/sdk version` (confirm v1.x + exact import path); confirm `package.json` has no MCP dep; re-read `listProperties` (`properties.ts:22`) and `DEMO_CTX` (`ctx.ts:12`).
2. **Install the SDK** — `npm install @modelcontextprotocol/sdk`. ⚠️ touches `package.json`. Stable v1.x, not the v2 alpha.
3. **`mcp-server/ctxFor.ts`** — returns demo `Ctx` `{ userId:'USR-0001', orgId:'ORG-0001', orgRole:'owner' }`, mirroring `ctx.ts:12`. Sibling to `requireCtx()`, not an edit.
4. **`mcp-server/index.ts`** — `new McpServer` + `StdioServerTransport` + `connect`. Imports `@/lib/services/properties` via the existing `@/*` alias.
5. **Register ONE tool: `search_properties`** — calls `listProperties(ctxFor())`; returns `structuredContent` + text mirror; try/catch logs internally, returns a generic string (never `err.message`).
6. **Run + answer the `server-only` question (W2)** — run via `tsx --conditions=react-server` (the project already runs server-only TS this way — see `db:ping`). If it still throws, add an empty-module alias — do NOT edit the 35 services. Record outcome in `01-infrastructure-readiness.md`.
7. **Test in MCP Inspector** — `npx @modelcontextprotocol/inspector npx tsx --conditions=react-server --env-file=.env.local mcp-server/index.ts` → call `search_properties` → see real ORG-0001 rows.
8. **(Optional) Claude Desktop** — register the same command as a stdio server and call the tool from a chat.

---

## Sketch — the only new code

```typescript
// mcp-server/ctxFor.ts
// The ONE new auth seam (readiness gap W1). Phase 1 returns a hardcoded demo identity;
// Phase 3 replaces the body with real token validation. Sibling of lib/auth/ctx.ts (Clerk-only).
import type { Ctx } from "@/lib/services/_mapping";

// Mirrors DEMO_CTX in lib/auth/ctx.ts:12. Safe because DEMO_MODE refuses writes at the service layer.
export function ctxFor(): Ctx {
  return { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };
}
```

```typescript
// mcp-server/index.ts
// Confirm SDK import paths at step 1 (v1.x). [unverified]
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { listProperties } from "@/lib/services/properties"; // REUSE: properties.ts:22
import { ctxFor } from "./ctxFor";

const server = new McpServer({ name: "valgate", version: "0.1.0" });

server.registerTool(
  "search_properties",
  {
    title: "Search properties",
    description: "Find the properties in this Valgate workspace. Returns each property's id, address, and key fields.",
    inputSchema: z.object({}),
  },
  async () => {
    try {
      const ctx = ctxFor();                  // the new auth seam
      const data = await listProperties(ctx); // existing service, unchanged
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        structuredContent: { data },
      };
    } catch (err) {
      console.error("search_properties failed", err); // never leak err.message
      return { content: [{ type: "text", text: "Could not load properties." }], isError: true };
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

```bash
# Test in MCP Inspector (no Claude Desktop needed).
npx @modelcontextprotocol/inspector \
  npx tsx --conditions=react-server --env-file=.env.local mcp-server/index.ts
# DATABASE_URL in .env.local must point at the DEV branch (br-solitary-lab-aoci2g33), never production.
```

---

## Files touched

| File | Change | Note |
|---|---|---|
| `mcp-server/index.ts` | NEW | Server entry + the one tool (~30 lines) |
| `mcp-server/ctxFor.ts` | NEW | The auth seam (W1); demo Ctx in Phase 1 |
| `package.json` | +1 dep | `@modelcontextprotocol/sdk` only — stop and ask before installing |
| `lib/services/properties.ts` | REUSE unchanged | `listProperties(ctx)` at :22 |
| `lib/services/_mapping.ts` | REUSE unchanged | `Ctx` type for `ctxFor()` |
| `lib/auth/ctx.ts` | REFERENCE only | `DEMO_CTX` copied; `requireCtx()` untouched |
| `docs/MCP implementation/01-infrastructure-readiness.md` | UPDATE after run | record the W2 outcome |

---

## Open verifications (resolved by doing)

| Question | Plan | Fallback |
|---|---|---|
| Exact SDK import path (v1.x) | Confirm via npm view + Context7 at step 1 | Adjust to the version's actual entry points |
| `server-only` in a non-Next process (W2) | Run via `tsx --conditions=react-server` (used by `db:ping`) | Alias `server-only` to an empty module in run config — never edit services |
| `DATABASE_URL` wired for the spike | Point `.env.local` at the dev branch | Neon `get_connection_string` for `br-solitary-lab-aoci2g33` (dev only) |

---

## Done when

MCP Inspector lists `search_properties`, calling it returns real ORG-0001 properties from the dev
Neon branch, and the `server-only` (W2) outcome is written into `01-infrastructure-readiness.md`.
At that point the foundation is proven — Phase 2 (resources) is repetition.
