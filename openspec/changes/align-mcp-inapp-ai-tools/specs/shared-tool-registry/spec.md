## ADDED Requirements

### Requirement: Write/delete tool logic is defined exactly once
The bodies of every Valgate write and destructive-delete tool (`search_properties`, `create_property`, `update_property`, `delete_property`, `record_maintenance`, `create_lease`, `update_lease`, `delete_lease`, `create_tenant`, `update_tenant`, `delete_tenant`, `record_payment`, `update_payment`, `delete_payment`) SHALL be defined exactly once, in `mcp-server/tool-defs.ts` (`VALGATE_TOOLS`). Neither the MCP server nor the in-app AI chat SHALL contain a separate re-implementation of any of these bodies' logic (the service calls, validation, and outcome shaping).

#### Scenario: A tool's business logic lives in one file
- **WHEN** a developer greps the codebase for the implementation of any of the 14 shared tools' create/update/delete logic
- **THEN** exactly one function body is found (in `mcp-server/tool-defs.ts`), not one per transport

### Requirement: Both transport adapters build from the shared registry
`mcp-server/register.ts` (including `writes.ts` and `writes-rental.ts`) and `lib/actions/ai-tools.ts` SHALL each build their tool surfaces by looking up entries in `VALGATE_TOOLS` and wrapping them for their own transport (MCP `server.registerTool` / Vercel AI SDK `tool()`). Adapter-specific concerns — Ctx resolution (OAuth vs session), the `orgId` argument, the confirm-flag vs proposed-action delete gate, and response shaping — SHALL live only in the adapter, never duplicated into the shared body.

#### Scenario: MCP tool delegates to the shared body
- **WHEN** the MCP server handles a call to `create_property`, `update_lease`, or any other shared tool
- **THEN** after resolving its own Ctx and `orgId`, it invokes the matching `VALGATE_TOOLS` entry's `run`/`preview`/`commit` function rather than calling the underlying `lib/services/*` function directly

#### Scenario: In-app AI tool delegates to the shared body
- **WHEN** the in-app AI chat handles a call to any of the 14 shared tools
- **THEN** it invokes the matching `VALGATE_TOOLS` entry via `toolFor(name)`, as already implemented

### Requirement: Transport-specific behavior differences are additive, not forked logic
Where a transport needs behavior the other doesn't (MCP's `"via MCP"` audit-summary suffix, MCP's `confirm: true`/`false` two-call delete gate, MCP's explicit `orgId` argument, MCP's `list_workspaces` and `preview_property_delete` convenience tools, the in-app AI's `proposedAction`/human-approval delete gate), that difference SHALL be expressed by the adapter wrapping or extending the shared body's result — never by copying and modifying the shared body's logic into the adapter.

#### Scenario: MCP audit summary carries its transport suffix
- **WHEN** the MCP server successfully completes a write via a shared tool body
- **THEN** the audit row's summary is the shared body's summary text with `" via MCP"` appended by the MCP adapter, not a separately written summary string

#### Scenario: MCP-only tools stay MCP-only without a shared-registry entry
- **WHEN** a caller invokes `list_workspaces` or `preview_property_delete`
- **THEN** the MCP server serves them without requiring a corresponding entry or accommodation in `VALGATE_TOOLS`, since the in-app AI has no equivalent need for them

### Requirement: No orphaned tool registries
The codebase SHALL NOT contain a tool registry file with no importer. Superseded registries SHALL be deleted, not left in place.

#### Scenario: Every tool-definition file is reachable from a live entry point
- **WHEN** a developer traces imports from `app/mcp/route.ts` and `mcp-server/index.ts` (the two live MCP front doors) and from `lib/actions/ai-tools.ts` (the in-app front door)
- **THEN** every file under `mcp-server/` that defines tool bodies is reached by at least one of those traces
