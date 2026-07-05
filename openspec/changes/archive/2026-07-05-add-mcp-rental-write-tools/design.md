## Context

The MCP server today registers 7 tools: `list_workspaces`, `search_properties`, and the five property/maintenance writes in `mcp-server/writes.ts` (`create_property`, `update_property`, `preview_property_delete`, `delete_property`, `record_maintenance`). All reads beyond `search_properties` are served by the `valgate://property/{id}` resource, which already nests leases, tenants, and payments. So reads exist; only writes are missing for the rental core.

The write tools in `writes.ts` are deliberately thin: they call `resolveWriteCtx(getCtx, extra, orgId, humanAction)` (which enforces `requireExplicitOrg = true`), invoke a `lib/services/*` function, `audit(...)` the result via `logActivity`, and return `toolOk`/`toolError`. Authorization is never re-implemented — the services enforce org-scope, role (`requireMember` / admin-only delete), and demo read-only (`assertCanMutate`) on their own.

The services for the new entities already exist and follow the same CRUD shape:
- `lib/services/leases.ts` — `createLease` / `updateLease` / `deleteLease` (schemas `NewLease` / `LeasePatch`)
- `lib/services/tenants.ts` — `createTenant` / `updateTenant` / `deleteTenant` (`NewTenant` / `TenantPatch`)
- `lib/services/payments.ts` — `createPayment` / `updatePayment` / `deletePayment` (`NewPayment` / `PaymentPatch`); `createPayment` already resolves the parent `propertyId` from `leaseId`.

## Goals / Non-Goals

**Goals:**
- Add create/update/delete MCP tools for leases, tenants, and payments as thin wrappers, reusing the exact helpers and design laws in `writes.ts`.
- Keep the two transports (stdio demo, authenticated HTTP) identical by registering through the shared `register.ts` path.
- Live-verify each tool through the connector against throwaway records, as the existing 7 were verified.

**Non-Goals:**
- Document write tools (needs storage/upload; separate change).
- Any new reads — the property resource already nests these entities.
- New services, schema changes, migrations, or auth changes.
- Reducing the overall tool count (noted as a risk, addressed later if needed).

## Decisions

**D1 — Extend the existing `writes.ts` pattern, don't invent a new one.**
Each tool is `server.registerTool(name, {title, description, inputSchema}, handler)` where the handler is `resolveWriteCtx → service call → audit → toolOk/toolError`, copied structurally from `create_property`. Reuse `orgIdArg`, `resolveWriteCtx`, `audit`, `toolOk`, `toolError` verbatim. *Alternative considered:* a generic CRUD-tool factory over an entity registry. Rejected — one factory to serve 3 entities is more indirection than 9 near-identical 12-line handlers, and it hides the per-entity descriptions the AI relies on. (Ponytail: 9 boring handlers beat 1 clever factory.)

**D2 — Where to put the code.** Add the new tools to `writes.ts` (it already owns "the write tools") or a sibling `writes-rental.ts` if `writes.ts` gets long, wired in via the same `registerWriteTools(server, getCtx)` call in `register.ts`. Either keeps registration in one place. *Recommendation:* start in `writes.ts`; split only if it crosses ~500 lines.

**D3 — Delete safety, given there is no cascade counter for these entities.**
`delete_property` pairs with `countPropertyCascade` + `preview_property_delete`. **No equivalent counter exists for leases/tenants/payments** — their `delete*` is a plain `scopedDelete`. So:
- **`delete_payment`**: a payment is a leaf (nothing references it). Gate behind `confirm: true` for consistency, but no preview is needed — the "preview" branch just echoes the payment that would be removed.
- **`delete_lease`** and **`delete_tenant`**: these have dependents (payments carry `leaseId`; leases carry `tenantId`). Gate behind `confirm: true`, and in the `confirm !== true` branch return a **lightweight inline count** of directly-referencing rows (e.g. `SELECT count(*) FROM payments WHERE lease_id = ?`) as the blast-radius preview — mirroring `delete_property`'s shape without building a full cascade service.
*Alternative considered:* build `countLeaseCascade` / `countTenantCascade` service functions. Deferred — a single scoped `count` in the tool is enough for v1; promote to a service only if a second caller needs it.

**D4 — Naming stays outcome-shaped.** `record_payment` (not `create_payment`) to match `record_maintenance`; `create_lease` / `create_tenant` (the natural verb) to match `create_property`. Descriptions state the role requirement and the `orgId` rule, reusing `orgIdArg`'s wording.

## Risks / Trade-offs

- **Tool-list growth (7 → ~16).** More tools = more model context per call and more room for the AI to pick the wrong one. → Mitigate with crisp, distinct descriptions; if it gets noisy, a later change can demote some operations to resources (the existing design law). Out of scope here.
- **FK on-delete behavior is unverified.** If `payments.lease_id` / `leases.tenant_id` are `ON DELETE RESTRICT`, deleting a parent with children will throw; if `CASCADE`, children vanish silently. → The delete tools must surface a clean generic error either way, and D3's inline count warns the caller first. Confirm the actual FK rule during implementation (see Open Questions).
- **Demo/read-only parity.** The services already refuse writes under demo mode; the tools inherit this for free — but the live-test must run against a real (non-demo) authenticated Ctx, exactly like the property writes were tested.

## Migration Plan

Additive only — new tool registrations, no data or schema change. Deploy = ship the branch; the tools appear on the next connector session. Rollback = remove the registrations (no state to unwind). Verify with `tsc --noEmit`, `npm run lint`, then a live create → update → delete cycle per entity through the connector against a throwaway record.

## Open Questions

- **FK on-delete semantics** for `payments.lease_id` and `leases.tenant_id` — restrict vs cascade? Determines whether `delete_lease`/`delete_tenant` should block-with-message or proceed-and-warn. Resolve by reading `lib/db/schema/*` during implementation.
- **Do we want `update_payment`/`delete_payment` at all in v1, or just `record_payment`?** Recording rent is the high-value verb; edit/delete of payments may be rarer. Could ship create-only first and add edit/delete if asked. (Recommendation: include all three for symmetry, but this is a cheap thing to cut.)
