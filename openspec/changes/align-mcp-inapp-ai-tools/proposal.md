## Why

The Valgate write/delete tool logic (create/update/delete for properties, leases, tenants, payments, plus maintenance) is meant to live in exactly one place — `mcp-server/tool-defs.ts` (`VALGATE_TOOLS`) — with the MCP server and the in-app AI chat as two thin adapters over it. That was the locked design in `docs/plans/mcp-tools-in-app-ai.md`, and the in-app side (`lib/actions/ai-tools.ts`) already builds from it. The MCP server never made the switch: `mcp-server/register.ts`, `writes.ts`, and `writes-rental.ts` still carry their own separately hand-written copy of the same 14 tool bodies. Drift has already started — MCP's audit summaries append `"via MCP"` while `tool-defs.ts`'s do not — proving this is a live risk, not a hypothetical one. There is also an orphaned 359-line file, `mcp-server/tools.ts`, from an earlier superseded registry with zero importers.

Now is the right time to close this out: it's a scoped, already-designed, low-risk refactor, and every future tool change currently has to be remembered and hand-ported twice.

## What Changes

- Rewrite `mcp-server/register.ts`'s inline `search_properties` tool, and `mcp-server/writes.ts` (`create_property`, `update_property`, `delete_property`, `record_maintenance`) and `mcp-server/writes-rental.ts` (`create_lease`, `update_lease`, `delete_lease`, `create_tenant`, `update_tenant`, `delete_tenant`, `record_payment`, `update_payment`, `delete_payment`) to call the shared bodies in `mcp-server/tool-defs.ts` (`VALGATE_TOOLS`) instead of re-implementing them.
- Preserve every MCP-only behavior exactly: the explicit `orgId` argument, the `confirm: true`/`false` two-step delete gate, the `preview_property_delete` convenience tool, `list_workspaces`, and the `"via MCP"` audit-summary suffix. Output stays byte-for-byte compatible with today.
- Delete `mcp-server/tools.ts` (orphaned, no importers, superseded by `register.ts`).
- **BREAKING**: none. This is an internal refactor; no tool name, input schema, response shape, or externally-observable behavior changes for either the MCP connector or the in-app chat.

Out of scope (explicitly not touched by this change): the in-app AI's tool inventory, the Pro/Consumer permission split, the 5 page-shaped read tools, MCP's read-only resources (`valgate://property/{id}`, `.../progress`, `valgate://portfolio/snapshot`), and `list_workspaces`/`preview_property_delete` (these have no in-app counterpart by design and stay MCP-native).

## Capabilities

### New Capabilities
- `shared-tool-registry`: the requirement that Valgate's write/delete tool logic is defined exactly once (`mcp-server/tool-defs.ts`), and that both the MCP server and the in-app AI chat build their tool surfaces from that single definition rather than maintaining parallel implementations.

### Modified Capabilities
- None. `mcp-rental-write-tools`' existing requirements (authorization, audit, confirm-gated deletes, generic error messages) do not change — every scenario in `openspec/specs/mcp-rental-write-tools/spec.md` must continue to hold exactly as specified, and serves as the regression contract for this refactor. This change makes those requirements structurally guaranteed (single implementation) rather than incidentally true (two implementations kept in sync by hand).

## Impact

- **Code:** `mcp-server/register.ts`, `mcp-server/writes.ts`, `mcp-server/writes-rental.ts` (rewritten to consume `VALGATE_TOOLS`); `mcp-server/tool-defs.ts` (may need a small extension point so the MCP adapter can append `"via MCP"` to audit summaries without duplicating the summary text itself); `mcp-server/tools.ts` (deleted).
- **Not touched:** `lib/actions/ai-tools.ts`, `lib/actions/ai-overlay.actions.ts`, any UI component, `lib/services/*`, `lib/data/types/*`.
- **Verification surface:** the existing MCP e2e/connector check (tool list + a create/update/delete round-trip per entity) plus `npx tsc --noEmit`. No new user-facing surface to test — the bar is "identical behavior, one fewer copy of the logic."
