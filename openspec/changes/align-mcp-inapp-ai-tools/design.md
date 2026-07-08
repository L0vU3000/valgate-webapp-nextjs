## Context

`mcp-server/tool-defs.ts` already exports `VALGATE_TOOLS: ValgateToolDef[]` — 14 transport-neutral bodies (`search_properties`, property/lease/tenant/payment create+update, `record_maintenance`, and the 4 gated deletes) shaped as:

```ts
type ReadOrWriteDef = { kind: "read" | "write"; name; description; input; run(ctx, args); audit?(ctx, args, data) }
type DestructiveDef  = { kind: "destructive"; name; description; input; preview(ctx, args); commit(ctx, args); audit?(ctx, args, data) }
```

`lib/actions/ai-tools.ts` already builds the in-app AI's Pro tool set from this registry (`toolFor(name)` → `buildReadOrWriteTool` / `buildDestructiveTool`). That half of `docs/plans/mcp-tools-in-app-ai.md` (Phase 1) is done and out of scope here.

`mcp-server/register.ts` + `writes.ts` + `writes-rental.ts` do **not** consume `VALGATE_TOOLS`. They hand-implement the same 14 tools a second time, plus `list_workspaces` and `preview_property_delete` (MCP-only, no equivalent in `VALGATE_TOOLS` by design). Confirmed divergence already exists: every MCP audit `summary` ends in `"via MCP"`; the shared registry's does not (the in-app adapter uses it verbatim). This is the concrete evidence that hand-keeping two copies in sync doesn't hold up over time.

## Goals / Non-Goals

**Goals:**
- `register.ts` / `writes.ts` / `writes-rental.ts` call into `VALGATE_TOOLS` for all 14 shared tool bodies — one implementation, two adapters, matching the in-app side.
- Zero behavior change on the MCP surface: same tool names, same input schemas (`orgId` + the shared `input`), same confirm-gate two-step delete flow, same `toolOk`/`toolError` response shape, same `"via MCP"` audit suffix, same error copy.
- Delete the orphaned `mcp-server/tools.ts`.

**Non-Goals:**
- No change to `list_workspaces` or `preview_property_delete` internals — they stay MCP-native (no in-app equivalent needed).
- No change to the in-app AI's tool inventory, Pro/Consumer split, page-shaped reads, or MCP's read-only resources.
- No change to `lib/services/*` or `lib/data/types/*` — this is purely which file calls the existing service functions.
- Not adding new tools or capabilities on either surface.

## Decisions

### Decision 1 — A small per-file adapter loop, not a generic "registerAll" helper

Each of `register.ts`, `writes.ts`, `writes-rental.ts` keeps its own `server.registerTool(name, {...}, handler)` calls (title strings, MCP-specific description tweaks like "Call with confirm: false first…" already live in `VALGATE_TOOLS[name].description` — reuse it as-is), but the **handler body** becomes a thin wrapper:

```ts
// read/write tools
async (args, extra) => {
  const resolved = await resolveWriteCtx(getCtx, extra, args.orgId, humanAction);
  if ("error" in resolved) return resolved.error;
  const def = VALGATE_TOOLS.find(d => d.name === "create_property")! as ReadOrWriteDef;
  const result = await def.run(resolved.ctx, args); // args minus orgId
  if (!result.ok) return toolError(result.message);
  if (def.audit) {
    const entry = def.audit(resolved.ctx, args, result.data);
    await audit(resolved.ctx, { ...entry, summary: `${entry.summary} via MCP` });
  }
  return toolOk(result.data);
}
```

Rejected alternative: a generic `registerDefAsTool(server, getCtx, def)` loop that auto-registers all 14 from an array. Rejected because the confirm-gate delete flow and the `orgId`/`preview_property_delete` wiring are MCP-specific enough (and low enough in count — 14 tools) that a generic loop would need its own escape hatches for property's extra `preview_property_delete` tool anyway. Explicit per-tool registration stays readable and matches the existing file structure; only the *body* changes, not the shape of the files.

### Decision 2 — `"via MCP"` suffix stays a call-site concatenation, `tool-defs.ts` is untouched

The adapter appends `" via MCP"` to the `summary` string returned by `def.audit(...)` before calling `audit()`, exactly as sketched above. No new field, parameter, or "source" concept is added to `ValgateToolDef` or `tool-defs.ts`. This keeps the shared registry transport-agnostic (it has no idea "MCP" exists) and keeps the diff to `tool-defs.ts` at zero.

Rejected alternative: add a `source: "mcp" | "app"` parameter to `audit()` builders. Rejected — it would touch `tool-defs.ts` (currently working, in-app-verified code) for a one-line string concatenation the calling adapter can already do.

### Decision 3 — Destructive tools: MCP's confirm-flag maps directly to `preview`/`commit`

```ts
async (args, extra) => {
  const resolved = await resolveWriteCtx(getCtx, extra, args.orgId, humanAction);
  if ("error" in resolved) return resolved.error;
  const def = VALGATE_TOOLS.find(d => d.name === "delete_lease")! as DestructiveDef;
  const preview = await def.preview(resolved.ctx, args);
  if (!preview.ok) return toolError(preview.message);
  if (args.confirm !== true) {
    return toolOk({ ...preview.data, confirmRequired: true, note: `Nothing was deleted. Re-call ${def.name} with confirm: true to proceed.` });
  }
  const result = await def.commit(resolved.ctx, args);
  if (!result.ok) return toolError(result.message);
  if (def.audit) {
    const entry = def.audit(resolved.ctx, args, result.data);
    await audit(resolved.ctx, { ...entry, summary: `${entry.summary} via MCP` });
  }
  return toolOk(result.data);
}
```

`preview_property_delete` becomes a one-line extra registration that just calls `VALGATE_TOOLS`'s `delete_property.preview(ctx, args)` and returns it via `toolOk` — no new logic, just a second entry point onto the same `preview`.

### Decision 4 — Verification is behavioral equivalence, not a rewrite of `mcp-rental-write-tools`' spec

The existing spec (`openspec/specs/mcp-rental-write-tools/spec.md`) scenarios are the regression contract: run them (or the equivalent live e2e/connector check) before and after, confirm identical outcomes. No spec text changes — this change makes those requirements true by construction (one code path) instead of by discipline (two hand-synced copies).

## Risks / Trade-offs

- **[Risk] A subtle behavioral difference between the two existing copies gets "fixed" silently during the port, changing MCP's live behavior unintentionally.** → Mitigation: port tool-by-tool, diffing old handler vs new against the same test payload before moving to the next; run the full `mcp-rental-write-tools` scenario set (or live connector check) after each file, not just at the end.
- **[Risk] `VALGATE_TOOLS`'s `input` schemas don't include `orgId`, but MCP's registered `inputSchema` must merge `{ orgId: orgIdArg, ...def.input.shape }`.** If `def.input` isn't a plain `z.object`, spreading `.shape` could misbehave for a tool whose input is itself just `z.object({})`. → Mitigation: `z.object({}).shape` is `{}`, so `z.object({ orgId: orgIdArg, ...def.input.shape })` is safe for every current tool; add a one-line comment noting this assumption so a future non-object input schema doesn't break silently.
- **[Trade-off] The per-tool handler is now one extra layer of indirection (adapter → def.run/preview/commit → service) vs. today's direct service call.** Accepted: this is the same trade-off the in-app side already made in Phase 1, and it's what buys "one definition."

## Migration Plan

1. Port `writes.ts` (5 tools: `create_property`, `update_property`, `preview_property_delete`, `delete_property`, `record_maintenance`) first — smallest file, includes the one tool with an extra MCP-only entry point (`preview_property_delete`), so it exercises every pattern early.
2. Port `writes-rental.ts` (9 tools) using the same pattern, now mechanical.
3. Port `register.ts`'s inline `search_properties` to call `VALGATE_TOOLS`'s `search_properties.run`.
4. Delete `mcp-server/tools.ts`.
5. Run `npx tsc --noEmit`, the `mcp-rental-write-tools` scenario set / live MCP connector check (tool list unchanged, one create/update/delete round-trip per entity, confirm-gate still requires two calls, audit rows still say "via MCP").

Rollback: each numbered step is an independent commit: revert the specific file's commit to restore its old hand-written registration if a regression is found — no shared state or migration to unwind.

## Open Questions

- None blocking. If a currently-undetected behavioral difference between `writes.ts`/`writes-rental.ts` and `tool-defs.ts` turns up during the port (beyond the known `"via MCP"` suffix), the executor should treat MCP's live behavior as the source of truth (it's the deployed, connector-verified surface) and either adjust the port or flag it back rather than silently picking one.
