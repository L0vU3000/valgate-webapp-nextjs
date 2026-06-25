# Item 3 — Work Order "Cancelled" + Client "Inactive"

> Executable build plan. Backend = **Neon Postgres + Drizzle** (never Convex). One part is an
> **approved schema change** (a Postgres enum value); the other is FS-layer only (no migration).
> Lowest risk of the three — recommended to run **first**.

## Why
Phase 4 built the confirm UI for these two lifecycle states but deferred them because they needed
schema/type changes. This adds: a terminal "Cancelled" state for work orders, and an "Inactive"
(archive) state for Pro clients.

---

## Part A — Work Order "Cancelled" (Postgres enum — one migration)
**Decision:** append `"Cancelled"` to the existing `maintenance_status` enum (a sibling terminal
state beats a parallel boolean).

### Migration gate
Edit the enum, `npm run db:generate` → **STOP and show the SQL** (it will be `ALTER TYPE
maintenance_status ADD VALUE 'Cancelled'`) → test on a Neon dev branch → real DB. Note: a freshly
added enum value can't be used in the same transaction it's added — fine here (migrate, then use later).

### Tasks
1. `lib/db/schema/safety.ts:17` → `pgEnum("maintenance_status", ["Open","InProgress","Resolved","Cancelled"])`.
2. `lib/data/types/maintenance-item.ts:5` → add `"Cancelled"` to `MaintenanceStatusSchema` (this widens
   the app-wide union, so the `Record<MaintenanceStatus,…>` maps below become compile-time safety nets).
3. `app/(pro)/pro/actions.ts:176` (`updateWorkOrderSchema` status enum) + the inline union at `:183` → add `"Cancelled"`.
4. UI `app/(pro)/pro/work-orders/_components/WorkOrdersTable.tsx`: add `Cancelled` to `STATUS_LABEL` (~29)
   and a muted slate pill in `STATUS_PILL` (~35) (tsc forces both). Add a **Cancel** affordance behind the
   already-imported `ConfirmAction tier="confirm"` for `Open`/`InProgress` rows (action `<div>` ~160-199):
   onConfirm → `updateWorkOrder({ id, status:"Cancelled" })` → `router.refresh()` → `return toActionResult(res)`.
   Treat Cancelled like Resolved for the vendor Change/Assign affordances (`:136`, `:146`).
5. Query filters in `app/(pro)/pro/queries.ts` — add `&& X !== "Cancelled"` to each "active/not-closed" site:
   `:516` queue · `:880` urgentOpen · `:885` totalOpenCost · `:948` openWorkOrders · `:1686` active filter.
   `statusRankMaintenance (~:1112)` → sort Cancelled last (`Open?0:InProgress?1:Resolved?2:3`).
   Alert gen `~:1242` → `if (item.status === "Resolved" || item.status === "Cancelled") continue;`.
   Timeline label `~:1499` → add a "cancelled" branch. (Leave `:1125`/`:1133` resolved-counts — Cancelled
   is neither open nor resolved, which is correct.)

---

## Part B — Client "Inactive" (FS layer — NO migration)
**Decision:** add `status: z.enum(["Active","Inactive"]).optional()` to `ClientSchema` (absent =
Active, back-compatible) and filter at the `loadProContext` query layer (one chokepoint vs N display edits).

### Tasks
1. `lib/data/types/client.ts` (after ~`:24`) → add the optional `status` field. `.optional()` keeps
   existing FS JSON valid (parses as Active).
2. `lib/data/db/clients.ts` → no signature change (`create`/`update` already spread the record, so
   `status` flows through).
3. New action in `app/(pro)/pro/actions.ts` (near `:292`) → `setClientStatus({ clientId, status })`
   mirroring `onboardClient`'s userId pattern: `clientsDb.get` (IDOR check) → `clientsDb.update(userId,
   clientId, { status })` → `revalidatePro()`.
4. `app/(pro)/pro/queries.ts:382` → after the `Promise.all`, `const activeClients = clients.filter(c =>
   c.status !== "Inactive")` and feed that into `clientById` (`:441`) + rollups (`:510`). `getClientPortfolioData`
   (`:739-786`) then returns `null` for an Inactive client (clean not-found) — acceptable default.
5. UI — Archive/Reactivate control on the clients page card behind `ConfirmAction tier="confirm"`.

---

## Acceptance
- A work order can be Cancelled → muted pill, drops out of queue/alerts/open-cost; `tsc` clean
  (the `Record<MaintenanceStatus,…>` maps force exhaustive handling).
- A client can be set Inactive → vanishes from rollups/alerts/active book; Reactivate restores it.
- `npx tsc --noEmit` clean.

## Stop conditions
- STOP for human review of the generated enum migration SQL before applying to the real DB (Part A).
- Part B needs no migration. Never commit/push. Output `✅ [task]` after each.
