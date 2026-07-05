## 1. Groundwork

- [ ] 1.1 Confirm the FK on-delete semantics for `payments.lease_id` and `leases.tenant_id` by reading `lib/db/schema/*` (restrict vs cascade) — records how the delete tools must behave (block-with-message vs proceed-and-warn).
- [ ] 1.2 Confirm the exact exported names + Zod schemas: `createLease/updateLease/deleteLease` (`NewLease`/`LeasePatch`), `createTenant/updateTenant/deleteTenant` (`NewTenant`/`TenantPatch`), `createPayment/updatePayment/deletePayment` (`NewPayment`/`PaymentPatch`).
- [ ] 1.3 Decide file placement per D2: extend `mcp-server/writes.ts`, or add `mcp-server/writes-rental.ts` wired through `registerWriteTools`.

## 2. Lease tools

- [ ] 2.1 `create_lease` — thin wrapper over `createLease`; `orgIdArg` + `NewLease` input; `resolveWriteCtx` → service → `audit` → `toolOk`/`toolError`.
- [ ] 2.2 `update_lease` — id + `LeasePatch`; returns generic "no such lease" when the id is absent in the workspace.
- [ ] 2.3 `delete_lease` — `confirm: true` gate; on `confirm !== true` return a lightweight inline count of referencing payments as the blast-radius preview (D3).

## 3. Tenant tools

- [ ] 3.1 `create_tenant` — thin wrapper over `createTenant`; `NewTenant` input.
- [ ] 3.2 `update_tenant` — id + `TenantPatch`.
- [ ] 3.3 `delete_tenant` — `confirm: true` gate; on `confirm !== true` return a lightweight inline count of referencing leases as the preview (D3).

## 4. Payment tools

- [ ] 4.1 `record_payment` — thin wrapper over `createPayment` (outcome-shaped name, per D4); `NewPayment` input.
- [ ] 4.2 `update_payment` — id + `PaymentPatch`.
- [ ] 4.3 `delete_payment` — leaf entity: `confirm: true` gate, preview branch just echoes the payment (no cascade count needed).

## 5. Wire-up

- [ ] 5.1 Register all 9 tools through `registerWriteTools` in `mcp-server/register.ts` so both transports (stdio + HTTP) get them identically.
- [ ] 5.2 Ensure each tool description states the role requirement and the `orgId` rule, reusing `orgIdArg`'s wording.

## 6. Verify

- [ ] 6.1 `./node_modules/.bin/tsc --noEmit` → 0 errors.
- [ ] 6.2 `npm run lint` → 0 new warnings/errors.
- [ ] 6.3 Live-test each entity through the connector against a throwaway record: create → update → delete (confirm:false then confirm:true), confirming guards and audit. Clean up all throwaways.
- [ ] 6.4 Confirm the property resource still reflects the new lease/tenant/payment rows (read-after-write sanity).

## 7. Ship

- [ ] 7.1 Update the in-app "Connect Claude" capability list (`ConnectClaudeSection.tsx`) to include the new Modify actions, keeping it honest against the live server.
- [ ] 7.2 `graphify update .`, commit, and note the tool count moved from 7 → ~16.
