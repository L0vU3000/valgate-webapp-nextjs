# Valgate CRUD — Master Plan

> Audit + phased rollout for Create/Read/Update/Delete across the whole app.
> Read-only audit done 2026-06-19. No feature code written yet — this is the plan to approve.

---

## TL;DR — the three real problems

1. **Backend ≠ UI.** Convex already has CRUD mutations (with RLS, ownership checks, PII
   encryption) for almost every entity. The gaps are in the **UI** and in the **wiring**
   between UI and Convex — not the database.
2. **The UI is mid-migration (M5).** Pages call an intermediate `actions.ts` / older data
   layer; some destructive buttons are stubs. CRUD work is interleaved with finishing the wiring.
3. **One live hazard:** Documents tab bulk-delete button has no confirmation and a stubbed
   handler (`PropertyDocumentsPage.tsx:707-712`).

---

## Phase A — Audit results

### Backend (Convex) — CRUD largely complete
- 36+ entities across identity / property / documents / lease / copilot / scan / system domains.
- RLS via `convex/rls.ts` (org membership + role: viewer < editor < admin < owner + ownership consistency).
- Envelope encryption (AES-256-GCM) on PII: owner, tenant party, ownership membership, ownership transaction, copilot messages.
- Delete patterns: **hard cascade** for property→leases/payments/parties/documents/files, document→files/links, lease→payments/parties/docs; **soft** for copilot_thread; **immutable** for activities/accessLogs/analytics.
- Validation: native Convex `v.*` validators on all mutations.
- Gap: no `_storage` file cleanup when a document row is deleted.

### Consumer UI (`app/(shell)/`) — the gap list
| Page | What exists | What's missing / broken |
|---|---|---|
| Portfolio | Add Property; row → detail; Restore for archived | **No row `(…)` menu, no delete/archive affordance** (`PropertyTable.tsx:380`) |
| Add Property | Full multi-step create; draft delete | Draft delete unconfirmed (low risk) |
| Property / Overview | Edit profile (wired) | Quick-action buttons (lease/invoice/work-order) are **stubs**; Export Data **stub** |
| Property / Financials | Edit (unlock), revoke verification + confirm | Revoke confirm is minimal |
| Property / Ownership | Edit, revoke verification + confirm, upload doc | **No remove-co-owner**; doc table has no delete |
| Property / Rental | Edit, revoke verification + confirm | Lease/tenant display-only |
| Property / Documents | Upload modal, Add Folder | **Bulk delete: no confirm + stubbed handler** ⚠️; no folder delete; no per-file delete |
| Property / Location, Safety, Valuation | Read / edit-via-page | Display-only, fine |
| Directory | Add Professional | **No edit, no delete** |
| Dashboard, Analytics, Estate, Settings, Profile | Read / dismiss-all | No per-item delete |

### Pro UI (`app/(pro)/pro/`) — the gap list
- Real creates: Onboard Client, New Work Order. Real updates: lease renew (confirm modal), mark-paid, log payment, resolve safety risk, work-order status flow, vendor assign.
- **No delete anywhere** in Pro (probably intentional — append/soft-delete model).
- **No confirmation** on one-click state changes: work-order Resolve, safety-risk Resolve, rent Mark-Paid. No undo.
- All Pro mutations route through `app/(pro)/pro/actions.ts` (Zod-validated, `revalidatePro()`).

### Riskiest destructive ops (priority order)
1. Document **bulk delete** — no confirm, stubbed handler.
2. **Property** hard delete (backend cascade exists; no UI yet — high blast radius when added).
3. Revoke verification (ownership/financials/rental) — confirm too thin for a trust signal.
4. Pro one-click Resolve / Mark-Paid — irreversible, no confirm.

---

## The verification system (used by every phase)

One reusable `<ConfirmAction>` with three tiers. Risk decides the tier.

| Tier | When | Pattern |
|---|---|---|
| **1 — Undo toast** | Reversible, low stakes (dismiss alert, mark-paid) | Optimistic update + 5s "Undo" toast |
| **2 — Confirm modal** | Irreversible, single item, medium stakes (delete one document, remove co-owner, resolve work order) | "Are you sure? This can't be undone." Cancel / Confirm |
| **3 — Typed confirm** | Irreversible + sensitive + cascading (hard-delete property, bulk-delete docs, revoke verification) | Type the property name or `DELETE` to enable the button; modal lists exactly what will be removed |

**Security rules on every mutation (from CLAUDE.md):** Zod-validate input → authenticate → authorize ownership (IDOR) → soft-delete preferred for sensitive records → never return `err.message` → rate-limit destructive actions.

**UI build tools per phase:** `mobbin` MCP (`search_screens`/`search_flows` for "delete confirmation modal", "table row action menu / kebab", "file manager delete", "destructive typed confirmation") and `/impeccable` (`harden` for empty/error states, `critique`/`polish` before ship).

---

## Phased rollout

### Phase 0 — Decisions + foundations
- **Decide soft vs hard delete per entity** (recommendations below).
- Build `<ConfirmAction>` (3 tiers) + a `useDestructiveAction` hook (optimistic + undo).
- Add an `activity`/audit write on every destructive mutation (table already exists).
- Standard toast + error mapping (generic client message, internal log).
- **Acceptance:** component + hook exist with one self-check; no behavior wired yet.

### Phase 1 — Stop the bleeding (the live hazard)
- Wire Documents bulk-delete to the Convex document delete mutation; add Tier-3 typed confirm listing file count; add `_storage` file cleanup.
- Add per-file delete (Tier 2) and folder delete (Tier 2, warns if non-empty).
- **Entities:** document, file, folder. **Acceptance:** no destructive doc action without a confirm + real backend call + audit row.

### Phase 2 — Portfolio + property lifecycle
- Portfolio table: add `(…)` row-action menu → View / Edit / **Archive** (Tier 2) / **Delete** (Tier 3, typed).
- **Recommendation:** Archive is the primary, default action (reversible, status flag). Hard delete is Tier-3, admin/owner-role only, behind typed confirm — because the cascade wipes leases/payments/docs.
- Wire Archive + Restore + Delete to Convex; ownership/role check server-side.
- **Acceptance:** archive round-trips; delete requires typed name + role; both audited.

### Phase 3 — Property sub-entities
- **Photos:** add / replace / delete (Tier 2) wired to image mutations + storage cleanup.
- **Co-owners:** add / remove (Tier 2) on ownership tab; respects ownership-split math.
- **Financials / rental records:** confirm the edit/unlock writes reach Convex; upgrade revoke-verification to Tier 3 (lists what verification covers).
- **Acceptance:** every property sub-entity has the CRUD ops it needs, all wired, all guarded.

### Phase 4 — Pro interface safety
- Add confirmation to one-click destructive transitions: work-order Resolve (Tier 2), safety-risk Resolve (Tier 2), rent Mark-Paid (Tier 1 undo).
- Add **soft-delete/cancel**: work-order "Cancelled" status; client "Inactive"/archive; property archive reachable from Pro.
- **Acceptance:** no irreversible one-click action in Pro; consistent modal pattern.

### Phase 5 — Directory + loose ends
- Directory professional: add Edit + Delete (Tier 2) with row menu.
- Dashboard alerts: per-item dismiss (Tier 1) alongside dismiss-all.
- Wire or remove the Overview quick-action buttons and Export Data stub (decide: build vs hide).
- **Acceptance:** no stub buttons left in the UI; everything either works or is hidden.

### Phase 6 — Audit, undo polish, QA
- Activity-log surface (who deleted what, when) — sensitive-data requirement.
- `/impeccable harden` pass (empty/error/overflow states) + `critique` on every new modal.
- QA pass (`/qa`) over all destructive flows, IDOR checks (try acting on another org's resource).
- **Acceptance:** QA green; ownership enforced server-side on every mutation, verified by attempting cross-org access.

---

## Soft-vs-hard delete recommendations (beginner-friendly "why")

| Entity | Recommendation | Why |
|---|---|---|
| Property | Archive default; hard delete = Tier 3, owner-only | Cascade destroys leases/payments/docs — expensive mistake; archive keeps history |
| Document / file | Hard delete + storage cleanup, Tier 2/3 | Storage costs money; but confirm because legal docs matter |
| Co-owner, lease party | Soft (remove from active set) | Ownership/lease history is a legal record — keep it |
| Verification status | Revoke = state change, Tier 3 | It's a trust signal; revoking has reputational weight |
| Work order, safety risk | Status transition, not delete | Compliance trail; "Cancelled"/"Resolved" beats deletion |
| Rent payment | Never delete; reverse with adjustment | Financial records must be append-only/auditable |
| Alerts/notifications | Hard delete fine, Tier 1 undo | Disposable, low stakes |
