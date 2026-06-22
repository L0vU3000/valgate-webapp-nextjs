# Valgate — Full Workflow & User-Journey Audit

> Read-only audit, 2026-06-19. Superset of `Plan-CRUD-Master.md`. Every journey traced
> entry → UI action → handler → backend → user feedback. No code changed.

---

## 0. Executive summary

**The good news:** auth, the create flows, and the entire Pro backend are solid — wiring,
Zod validation, ownership/IDOR checks, generic error messages, and server-side date
stamping are all in place. The Pro interface in particular is fully wired to live data
(no mocks).

**The bad news:** the destructive end of almost every journey is missing or unguarded.
Delete affordances don't exist where the backend already supports them, several buttons
are visual stubs, and one-click irreversible actions ship with no confirmation.

### ⚠️ Correction to the CRUD master plan — the backend is NOT Convex
The journey traces show the **live, wired path** is:
`UI → app/**/*.actions.ts → lib/services/* → Drizzle ORM on Neon Postgres`
plus a **legacy filesystem layer** for clients and add-property drafts
(`lib/data/db/clients.ts`, localStorage drafts).
The `convex/` code exists in parallel but the UI does **not** call it. **All wiring work
in both plans should target the services/Drizzle layer, not Convex.** Reconcile this before
starting any phase. `[needs confirmation with whoever owns the migration]`

### The headline findings
- **P0 — Documents bulk-delete is a dead button** (`PropertyDocumentsPage.tsx:707-712`): user selects files, clicks Delete, nothing happens. Backend delete exists; UI never calls it.
- **P0/P1 — Portfolio has no delete path at all**: no `(…)` row menu; the `deleteProperty` handler exists but is unreachable from the UI.
- **P1 — Photos can't be managed after creation**: photo UI lives only inside the Add-Property draft flow; no photos surface on an existing property.
- **P1 — Folder create button isn't wired** (`onClick` only closes the modal); per-file and folder delete have no UI.
- **P1 — Three Pro one-click actions are irreversible with no confirm**: Mark-Paid, Work-Order Resolve, Safety-Risk Resolve.
- **P1 — Quick-action + Export buttons on the property overview are stubs.**
- **P1 — Storage leak**: deleting a document row never deletes the underlying stored file.

---

## 1. Journey inventory

| # | Journey | Persona | Entry route | Status | Verdict |
|---|---|---|---|---|---|
| 1 | Login | both | `(auth)/login` | ✅ | Works; MFA is a stub (P1 only if a user has MFA on) |
| 2 | Register | both | `(auth)/register` | ✅ | Clean form → email OTP → finalize → auto-org |
| 3 | Forgot password | both | `(auth)/forgot-password` | ✅ | Solid 2-step reset |
| 4 | Site gate | both | `/gate` | ✅ | Password gate, open-redirect sanitized |
| 5 | Add property | consumer | `(shell)/add-property` | ⚠️ | Create works; draft delete is localStorage-only + unconfirmed; no multi-device persistence |
| 6 | View/edit property | consumer | `(shell)/property/[id]/*` | ⚠️ | Profile/financials/rental/verify edits work; quick-action + Export buttons are stubs |
| 7 | Verification request/revoke | consumer | property financials/rental/ownership | ✅ | Wired both ways; revoke confirm is thin (P2) |
| 8 | Portfolio management | consumer | `(shell)/portfolio` | ❌ | Archive/restore work; **no delete UI, no row `(…)` menu** |
| 9 | Manage photos | consumer | property (no page) | ❌ | **No post-create photo management surface** |
| 10 | Manage documents & folders | consumer | `property/[id]/documents` | ❌ | Upload works; **bulk-delete dead (P0)**, folder-create unwired, per-file/folder delete missing, storage leak |
| 11 | Manage owners / co-owners | consumer | `property/[id]/ownership` | ⚠️ | Add/edit work, split math live; **no remove co-owner** |
| 12 | Directory | consumer | `(shell)/directory` | ⚠️ | Add/view/contact work; **no edit, no delete** |
| 13 | Misc (analytics, estate, profile, settings, alerts) | consumer | various | ⚠️ | Read-only; dashboard alerts have dismiss-all but no per-item dismiss |
| 14 | Onboard client + assign properties | pro | `(pro)/pro/clients` | ✅ | Wired, validated, ownership-checked |
| 15 | Client detail / portfolio | pro | `clients/[clientId]` | ✅ | Read-only, org-scoped |
| 16 | Properties register | pro | `pro/properties` | ✅ | Read-only; client-side filter; 500-row cap (P2) |
| 17 | Rent — log payment | pro | `pro/rent` | ⚠️ | Wired; no confirm/undo (P1) |
| 18 | Rent — mark paid | pro | `pro/rent` | ⚠️ | One-click, irreversible, **no confirm/undo (P1)** |
| 19 | Lease renewal | pro | `pro/rent` | ✅ | Confirm modal present; UTC month-math edge case (P2) |
| 20 | Work order — create | pro | `pro/work-orders` | ✅ | Wired, validated, ownership-checked |
| 21 | Work order — assign vendor | pro | `pro/work-orders` | ⚠️ | Works; **no server-side vendor existence/ownership check (P1)**; picker unpaginated |
| 22 | Work order — status flow | pro | `pro/work-orders` | ⚠️ | One-click Resolve, **no confirm (P1)** |
| 23 | Compliance — resolve safety risk | pro | `pro/compliance` | ❌ | One-click Resolve, **no confirm (P1)**; resolved items vanish (no audit view) |
| 24 | Agents hub | pro | `pro/agents` | ⚠️ | Approve/reject flow not fully traced — needs follow-up |
| 25 | Pro dashboard | pro | `pro/dashboard` | ✅ | Read-only aggregates, real data |

---

## 2. Findings by severity

### P0 — blocks a task / live hazard
1. **Documents bulk-delete dead button** — `PropertyDocumentsPage.tsx:707-712`. No `onClick`. User cannot delete documents at all.
2. **Portfolio delete unreachable** — no row `(…)` menu / delete affordance; `deleteProperty` handler exists in `app/actions/properties.ts:60-70` but nothing calls it. (P0 for "user cannot delete a property"; the cascade danger when it IS wired makes the confirm design urgent too.)

### P1 — high priority
- Folder-create button unwired (`PropertyDocumentsPage.tsx:869-878` only closes modal) — backend `createFolder()` exists.
- Per-file delete: no UI (`deleteDocument()` exists).
- Folder delete: no UI (`deleteFolder()` exists).
- Document storage cleanup missing on delete — stored file orphaned (cost + privacy leak).
- No post-create photo management page (`Step4PhotosDocs.tsx` is draft-only); upload mutation exists but isn't surfaced.
- Remove co-owner: no UI (`removeCoOwner()` exists, `PropertyOwnershipPage.tsx:1050-1060`).
- Directory edit + delete: no UI.
- Overview quick-action buttons (New Lease / Work Order / Invoice / Notify All) — no handlers (`PropertyOverviewPage.tsx:41-46`).
- Overview Export Data — no handler.
- Pro Mark-Paid: one-click irreversible, no confirm/undo (`OverdueList.tsx:90-100`).
- Pro Work-Order Resolve: one-click, no confirm (`WorkOrdersTable.tsx:169-178`).
- Pro Safety-Risk Resolve: one-click, no confirm (`SafetyRisksCard.tsx:88-95`).
- Pro vendor assignment: no server-side check that vendor exists / belongs to org before `updateWorkOrder` (`actions.ts:181`).
- Login: MFA path throws "not supported" — blocks any user with MFA enabled.

### P2 — medium
- Verification revoke confirm is minimal (no typed confirm, no scope list) across financials/rental/ownership.
- Add-property drafts: localStorage-only, no server persistence, delete unconfirmed.
- Dashboard alerts: no per-item dismiss.
- Properties register: client-side filter + 500-row cap, no pagination.
- Lease renewal: `getUTCMonth()` math can drift near month boundaries in non-UTC contexts.
- Compliance: resolved risks disappear with no "show resolved" audit filter.
- Vendor picker: 500+ vendors unpaginated.
- Auth footer / support links point at routes that may 404.

### P3 — polish / by design
- Photo "set cover" hard-coded to first image; no replace affordance.
- Client detail read-only by design.
- Architecture debt: clients on FS layer, properties/leases on Drizzle.
- Resolved work orders not reopenable (intentional compliance trail).

---

## 3. Cross-cutting patterns
1. **"Backend exists, UI doesn't."** The dominant pattern. Delete/remove handlers are written but unreachable (documents, folders, property, co-owner, directory). The work is overwhelmingly UI affordance + wiring, not new backend.
2. **No confirmation standard.** Some flows have a thin modal, some have nothing, none use a typed/tiered pattern. Every destructive action needs to route through one shared component.
3. **One-click irreversibles in Pro.** Mark-Paid, Resolve ×2 — fast but unrecoverable. Need undo-toast (low risk) or confirm (medium risk).
4. **No undo anywhere.** Server actions + `revalidate` give no rollback path.
5. **Storage not reconciled with rows.** Deleting metadata leaves files behind.
6. **Read-only surfaces lack per-item actions** (alerts, resolved-risk audit).

---

## 4. Expanded phased rollout (workflow hardening)

Builds on `Plan-CRUD-Master.md`. Ordered by risk + dependency. Each phase: goal → journeys → fixes → acceptance. `mobbin` + `/impeccable` are **build-time** (noted, not run yet).

### Phase 0 — Foundations + the backend decision (BLOCKING)
- **Confirm the live backend** (services/Drizzle vs Convex) and lock all wiring targets. Nothing else starts until this is answered.
- Build the shared 3-tier `<ConfirmAction>` (undo-toast / confirm-modal / typed-confirm) + `useDestructiveAction` hook (optimistic + undo).
- Standard toast + generic-error mapping; an `activity`/audit write on every destructive action.
- **Acceptance:** component + hook exist with one self-check; backend target documented.

### Phase 1 — Stop the bleeding (P0 + storage leak)
- Wire Documents **bulk-delete** → real delete action + Tier-3 typed confirm (file count + scope) + storage cleanup.
- Add **per-file delete** (Tier 2) and **folder delete** (Tier 2, warns if non-empty).
- Wire the **Create Folder** button to `createFolder()` + toast.
- Add `storage.delete()` on document row delete.
- **Journeys:** 10. **Acceptance:** no dead delete buttons; every doc/folder destructive action confirms, persists, and cleans storage.

### Phase 2 — Portfolio + property lifecycle
- Portfolio table `(…)` row menu → View / Edit / **Archive** (Tier 2) / **Delete** (Tier 3 typed, owner-role only).
- Wire archive/restore/delete to the service layer with server-side ownership + role checks; confirm lists cascade scope.
- **Journeys:** 8. **Acceptance:** archive round-trips; delete needs typed name + role; both audited.

### Phase 3 — Property sub-entities
- **Photos:** build a real photo manager on the property (add / replace / delete / set cover) wired to the upload mutation + storage cleanup.
- **Co-owners:** add remove (Tier 2), respecting split math.
- **Verification revoke:** upgrade to Tier-3 typed confirm that lists what verification covers.
- **Journeys:** 6, 7, 9, 11. **Acceptance:** every property sub-entity has the CRUD it needs, wired + guarded.

### Phase 4 — Pro interface safety
- Add confirmation to one-click irreversibles: Mark-Paid (Tier-1 undo), Work-Order Resolve (Tier 2), Safety-Risk Resolve (Tier 2).
- Add server-side **vendor existence/ownership check** before assignment.
- Add soft-delete/cancel states (work-order "Cancelled", client "Inactive") + a "show resolved" audit filter for compliance.
- **Journeys:** 17–23. **Acceptance:** no irreversible one-click action without undo/confirm; vendor assignment validated server-side; resolved items auditable.

### Phase 5 — Directory, drafts, misc + stub cleanup
- Directory: add Edit + Delete (Tier 2) with row menu.
- Add-property drafts: server-side persistence + confirmed delete (decide: keep localStorage as cache).
- Dashboard alerts: per-item dismiss (Tier 1).
- Decide build-vs-hide for overview quick-actions + Export; remove any button that stays a stub.
- **Journeys:** 5, 12, 13, 6. **Acceptance:** no stub buttons remain; drafts survive a session.

### Phase 6 — Hardening, audit, QA
- Activity-log surface (who did what, when) — sensitive-data requirement.
- `/impeccable harden` pass (empty/error/overflow/loading states) + `critique` on every new modal.
- `/qa` over all destructive flows; explicit IDOR test (attempt cross-org actions); MFA path decision.
- Properties register pagination + lease-renewal TZ fix.
- **Journeys:** all. **Acceptance:** QA green; ownership enforced server-side everywhere, proven by attempting cross-org access.

---

## 5. Follow-ups before building
1. **Backend target** (services/Drizzle vs Convex) — blocks everything.
2. **Property delete policy** — archive-default + gated hard-delete (recommended) vs archive-only.
3. **Stub buttons** — build or hide quick-actions + Export.
4. **Agents hub (journey 24)** — not fully traced; needs its own pass.
5. **MFA** — implement, or disable Clerk MFA so the login path can't be hit.
