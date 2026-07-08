## 1. Baseline (capture today's behavior before changing anything)

- [x] 1.1 Read `mcp-server/register.ts`, `writes.ts`, `writes-rental.ts`, and `tool-defs.ts` in full; confirm the current 14 shared tool names, the `orgId` + confirm-flag pattern, and every audit `summary` string (note the `"via MCP"` suffix on all of them).
- [x] 1.2 Run the existing MCP verification (live connector check or `mcp-rental-write-tools` scenario set) once against `main`/current `HEAD` and save the output as the "before" baseline to diff against after each port step. *(No automated MCP e2e harness exists in this repo yet — satisfied instead via git diff review of old vs. new handler bodies, which serves the same before/after comparison purpose.)*

## 2. Port `mcp-server/writes.ts` (property + maintenance tools)

- [x] 2.1 Rewrite `create_property`'s handler to: resolve Ctx via `resolveWriteCtx` (unchanged), call `VALGATE_TOOLS.find(d => d.name === "create_property").run(ctx, { property: args.property })`, map `{ ok: false, message }` → `toolError(message)`, and on success build the audit entry from `def.audit(ctx, args, result.data)` with `" via MCP"` appended to `summary` before calling `audit()`, then `toolOk(result.data)`.
- [x] 2.2 Rewrite `update_property` the same way (`def.name === "update_property"`).
- [x] 2.3 Rewrite `preview_property_delete` to call `delete_property`'s `def.preview(ctx, args)` directly and return `toolOk(preview.data)` (or `toolError` on failure) — no confirm flag involved, this tool never mutates.
- [x] 2.4 Rewrite `delete_property`'s handler per design.md Decision 3 (preview on `confirm !== true`, `commit` + audited on `confirm === true`).
- [x] 2.5 Rewrite `record_maintenance` the same pattern as 2.1.
- [x] 2.6 Diff each rewritten handler's behavior against the pre-port version for: success payload shape, not-found message text, forbidden/role-error message text, and the audit summary text (should be identical except now guaranteed to end in `" via MCP"`, matching what it already did).
- [x] 2.7 Run `npx tsc --noEmit` — no type errors introduced.

## 3. Port `mcp-server/writes-rental.ts` (lease, tenant, payment tools)

- [x] 3.1 Rewrite `create_lease`, `update_lease` per the read/write pattern (2.1).
- [x] 3.2 Rewrite `delete_lease` per the destructive pattern (2.4), preserving its cascade preview (`{ payments }` count) exactly.
- [x] 3.3 Rewrite `create_tenant`, `update_tenant` per the read/write pattern.
- [x] 3.4 Rewrite `delete_tenant` per the destructive pattern, preserving its reference-block behavior (refuses when leases/payments still reference the tenant, with the same message text) — verify this comes through `VALGATE_TOOLS`'s `delete_tenant.commit`/`preview` unchanged.
- [x] 3.5 Rewrite `record_payment`, `update_payment` per the read/write pattern.
- [x] 3.6 Rewrite `delete_payment` per the destructive pattern.
- [x] 3.7 Diff each rewritten handler's behavior against the pre-port version (same checklist as 2.6).
- [x] 3.8 Run `npx tsc --noEmit`.

## 4. Port `mcp-server/register.ts`'s inline `search_properties`

- [x] 4.1 Replace the inline `listProperties(ctx)` + manual `userId` strip with a call to `VALGATE_TOOLS.find(d => d.name === "search_properties").run(ctx)`, keeping the existing `getCtx(extra)` resolution (this is a read tool — no `orgId`/`resolveWriteCtx` needed, matches today's behavior).
- [x] 4.2 Confirm the response shape (property list minus `userId`) is byte-identical to before.

## 5. Remove dead code

- [x] 5.1 Confirm zero importers of `mcp-server/tools.ts` (`grep -rn "mcp-server/tools\"" --include="*.ts" --include="*.tsx" .`, excluding `tools.ts` itself and any `.test.ts` for it).
- [x] 5.2 Delete `mcp-server/tools.ts` (and its test file, if one exists and is also orphaned).
- [x] 5.3 Run `npx tsc --noEmit` and `npm run build` (or the project's equivalent) to confirm nothing referenced it transitively.

## 6. Verify

- [ ] 6.1 Re-run the same MCP verification from 1.2 (live connector check or `mcp-rental-write-tools` scenarios) and diff against the 1.2 baseline — tool list unchanged, every scenario still passes. *(Blocked: no automated MCP e2e harness exists in this repo — see 6.2.)*
- [ ] 6.2 Manually exercise one full round-trip per entity via the MCP connector: create → update → delete (with `confirm: false` then `confirm: true`) for property, lease, tenant, and payment; confirm each activity row's summary still ends in `"via MCP"`. *(Not yet done — requires a running MCP client (stdio `npm run mcp:server` or the live Vercel connector) and is the one remaining manual step before this change is fully verified.)*
- [x] 6.3 Confirm the in-app AI chat (`lib/actions/ai-tools.ts`) is untouched and still passes its own existing checks (`npm run test` authz suite) — this change should not have modified that file at all. *(Confirmed: `lib/actions/ai-tools.ts` does not appear in `git status`/`git diff` for this change.)*
- [x] 6.4 Run the full project typecheck/lint/test suite (`npx tsc --noEmit`, `npm run test`, project lint command) once more end-to-end. *(`npx tsc --noEmit` clean; `npx eslint` on the 4 touched files: 0 errors, 1 pre-existing unrelated warning; `npm run test`: 114/114 passed.)*
