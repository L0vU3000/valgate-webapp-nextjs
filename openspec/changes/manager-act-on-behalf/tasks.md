## 1. Role-aware ctx (read-side; no behavior change for viewer grants)

- [x] 1.1 Add `getMembershipRole(orgId, userId): Promise<Ctx["orgRole"] | null>` — select `role` from `organization_memberships` where `orgId`+`userId`+`status='active'` (place in `lib/services/portfolio-members.ts` or `managers.ts`)
- [x] 1.2 Update `requirePreviewContext` (`as-client/_ctx.ts`): resolve role via `getMembershipRole`, `orgRole = role ?? "viewer"`, return `canWrite = roleAtLeast(orgRole, "admin")` alongside existing fields
- [x] 1.3 Keep both authz checks explicit: ownership (`clients.managerUserId`) AND active grant; document that the lookup is now the authorization boundary (server-only)
- [x] 1.4 `tsc` clean; existing preview still renders (viewer grant path unchanged)

## 2. Hybrid write service

- [x] 2.1 Add `recordAndApplyManagerChange(writeCtx, input)` to `lib/services/change-requests.ts`: `assertCanMutate()` + `requireAdmin(writeCtx)`, then `db.transaction`: insert row as `status:"approved"`, `decidedByUserId:writeCtx.userId`, `decidedAt:now` → `applyChangeRequest(writeCtx, cr)` → return CR
- [x] 2.2 On auto-apply, notify the CLIENT (owner org's non-manager member via `findOwnerUserId` + `insertAccessNotification`), not the manager
- [x] 2.3 Confirm transaction rollback on apply failure (no orphan `approved` row); return generic error
- [x] 2.4 Unit/authz test: viewer-grant ctx is rejected by `requireAdmin`; full-grant ctx records `approved` + applies; delete leaves a tombstone row

## 3. Action routing (server decides the path)

- [x] 3.1 In `change-requests.actions.ts`, re-derive the manager's grant server-side (via `getMembershipRole` for the target client org) — do NOT trust any client input
- [x] 3.2 Route: full grant → `recordAndApplyManagerChange`; viewer/absent → existing `createChangeRequest` (pending)
- [x] 3.3 `revalidateTag` the affected client-scoped reads so the preview reflects the applied change (via `bustCache` on the entity's Upstash tag + `revalidatePath` the preview route tree)

## 4. UI follows the grant

- [x] 4.1 Thread `canWrite` from `requirePreviewContext` to the section pages. **Deviation (see design.md open question):** the write surface stays the grant-aware Propose panel, not the section-page inline controls — those controls (`Add Property` → `/add-property`) escape into the manager's OWN org, so retargeting them to the client's org is out of scope. Section pages therefore stay `readOnly` in preview; `canWrite` is threaded to `ClientPreviewShell` → `ProposeChangePanel` instead.
- [x] 4.2 Full-grant: the panel becomes the direct Add/Edit/Delete surface (label "Edit portfolio", copy/toasts say changes apply immediately); viewer-grant: keep Propose panel (current behavior). The server, not the prop, chooses propose vs. apply.
- [x] 4.3 Reflect applied changes without a full reload (`router.refresh()` on success + server-side `revalidatePath`)

## 5. Verify & close

- [x] 5.1 Authz suite (`tests/authz/manager-act-on-behalf.test.ts`): full-grant manager applies (approved row + entity written); viewer-grant rejected by `requireAdmin`; absent grant floors to null; delete leaves a tombstone. 5/5 green; full authz suite 47/47 green.
- [ ] 5.2 Live QA: as a full-grant manager, create/edit/delete each Tier 1 entity in the preview → applied instantly, `change_requests` row `approved` with `decidedByUserId = manager`, client notified — **requires the user (running app + a real full-grant manager session)**
- [ ] 5.3 Live QA: as a viewer-grant manager, same actions → pending rows, client approval still required — **requires the user (running app + a real viewer-grant manager session)**
- [x] 5.4 `tsc` + `eslint` clean; `graphify update .` — all green
