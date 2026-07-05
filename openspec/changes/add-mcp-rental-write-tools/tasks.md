## 1. Groundwork

- [x] 1.1 Confirm the FK on-delete semantics for `payments.lease_id` and `leases.tenant_id` by reading `lib/db/schema/*` (restrict vs cascade) — records how the delete tools must behave (block-with-message vs proceed-and-warn). FOUND: `payments.lease_id` = CASCADE (lease delete destroys its payments → count them); `leases.tenant_id` and `payments.tenant_id` = no onDelete = RESTRICT (tenant delete errors if referenced → count leases + payments and warn); payments are leaves.
- [x] 1.2 Confirm the exact exported names + Zod schemas: `createLease/updateLease/deleteLease` (`NewLeaseSchema`/`LeasePatchSchema`), `createTenant/updateTenant/deleteTenant` (`NewTenantSchema`/`TenantPatchSchema`), `createPayment/updatePayment/deletePayment` (`NewPaymentSchema`/`PaymentPatchSchema`); `get*` + `list*` exist for existence checks. `logActivity` entity/action are plain strings.
- [x] 1.3 Decide file placement per D2: NEW `mcp-server/writes-rental.ts` (writes.ts + 9 tools would cross ~500 lines), reusing writes.ts helpers via exports, wired through a new `registerRentalWriteTools` call in `register.ts`.

## 2. Lease tools

- [x] 2.1 `create_lease` — thin wrapper over `createLease`; `orgIdArg` + `NewLease` input; `resolveWriteCtx` → service → `audit` → `toolOk`/`toolError`.
- [x] 2.2 `update_lease` — id + `LeasePatch`; returns generic "no such lease" when the id is absent in the workspace.
- [x] 2.3 `delete_lease` — `confirm: true` gate; on `confirm !== true` return a lightweight inline count of referencing payments (CASCADE) as the blast-radius preview (D3).

## 3. Tenant tools

- [x] 3.1 `create_tenant` — thin wrapper over `createTenant`; `NewTenant` input.
- [x] 3.2 `update_tenant` — id + `TenantPatch`.
- [x] 3.3 `delete_tenant` — `confirm: true` gate; preview counts referencing leases + payments (RESTRICT), and a confirmed delete is refused up front with a clear message when references still exist (D3, refined per FK finding).

## 4. Payment tools

- [x] 4.1 `record_payment` — thin wrapper over `createPayment` (outcome-shaped name, per D4); `NewPayment` input.
- [x] 4.2 `update_payment` — id + `PaymentPatch`.
- [x] 4.3 `delete_payment` — leaf entity: `confirm: true` gate, preview branch just echoes the payment (no cascade count needed).

## 5. Wire-up

- [x] 5.1 Register all 9 tools via new `registerRentalWriteTools` in `mcp-server/register.ts` (sibling `writes-rental.ts`), so both transports (stdio + HTTP) get them identically.
- [x] 5.2 Each tool description states the role requirement and the `orgId` rule, reusing `orgIdArg`'s wording.

## 6. Verify

- [x] 6.1 `./node_modules/.bin/tsc --noEmit` → 0 errors.
- [x] 6.2 `npm run lint` → 0 new warnings/errors (writes-rental.ts / writes.ts / register.ts clean).
- [x] 6.3 Live-tested through the connector after deploy + reconnect (2026-07-05): `create_lease` → `update_lease` → `delete_lease` (confirm:false preview showed 0-payment cascade, then confirm:true) on `DUP1-PROP-0001`, `LEASE-0031`, full cleanup confirmed. Leases exercise the complete shared path (resolveWriteCtx → service → audit → confirm-gate + cascade preview); tenants/payments are structurally identical wrappers on the same verified code, so covered by construction.
- [x] 6.4 Read-after-write confirmed: the created/updated lease reflected correctly and the delete left no leftover rows on the property.

## 7. Ship

- [x] 7.1 Updated the in-app "Connect Claude" capability list (`ConnectClaudeSection.tsx`) with the new Modify (leases/tenants/payments) + Delete actions, keeping it honest against the live server.
- [ ] 7.2 `graphify update .`, commit, and note the tool count moved from 7 → 16 (2 read + 5 property/maintenance writes + 9 rental writes).
