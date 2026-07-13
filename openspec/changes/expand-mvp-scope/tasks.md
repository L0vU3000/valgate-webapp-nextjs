> **Execution status (2026-07-13) — ALL PHASES DONE.** Gate green (`tsc` + `lint` + `build` all PASS),
> `/code-review` (3 finders) applied, `/verify` **PASS** (live demo-mode run: /docs public, Financials tab,
> AI chat opens+replies, ownership write → new Activity row, no hydration warnings). Phases 3–5 built via
> `/code-build-loop`. **Key decisions during build:** (3) AI chat kept BOTH FloatingAgentChat + AIOverlay,
> decoupled from Pro via a new consumer `AgentOverlayContext`; the 5 Pro read-tools were stripped (Option A)
> and the owner chat given one `search_properties` lookup — richer owner tools deferred. (4) `/docs` was
> already public in middleware; pruned compliance + work-orders pages. (5) Activity read + `logActivity`
> pre-existed; kept only the **valuation.created + ownership.updated** emissions (reverted the property +
> document ones as duplicates of pre-existing action-layer emissions / estate-timeline pollution). **Open
> follow-ups (not blockers):** co-owner data-loss in the restored Ownership edit wizard when a step is
> skipped (pre-existing); docked AI-bar bottom overlap (placement/polish); two pre-existing restored-chat
> internals (first-send session race, Floating/Overlay separate state). Swappability intact: 0 migrations,
> 0 schema changes, 0 new tables.
>
> **Original status (2026-07-13):** Phases 1 (Analytics) + 2 (Financials tab) **done, `tsc` clean** —
> restored from `valgate-pro@44c70b9f` and wired (sidebar Analytics item; property `financials` tab w/
> `Coins` icon). Task 2.3 was a no-op (pro's overview had no financials summary card). **Phase 3
> reclassified:** the AI overlay is **coupled to the cut Pro product** (`FloatingAgentChat` imports
> `useProAgent` from `app/(pro)/pro/_components/ProAgentContext`), so it is NOT a clean restore — it needs
> decoupling into the consumer shell. Phase 3 files were backed out of the restore batch and moved into
> the `/code-build-loop` bucket with Phases 4–5 (new-logic work that needs review + verify).

## 0. Safety net (do first)

- [x] 0.1 Confirm `valgate-pro` exists on origin at `44c70b9f` (full pre-cut snapshot) — the restore source.
- [x] 0.2 Work on `valgate-mvp-v1` only. Do **not** touch the DB: no migration, no `seed:reset`.

## 1. Restore Analytics

- [x] 1.1 `git checkout valgate-pro@44c70b9f -- 'app/(shell)/analytics'` (bring the route tree back).
- [x] 1.2 Re-add the **Analytics** item to the consumer `Sidebar` (final nav: Home, Portfolio, Rental,
      Analytics, Settings).
- [x] 1.3 `tsc` — restore any analytics-only helper it imports that the cut also deleted (one path at a
      time). The data services it reads were kept, so expect little.

## 2. Restore the Financials property tab

- [x] 2.1 `git checkout valgate-pro@44c70b9f -- 'app/(shell)/property/[id]/financials'`.
- [x] 2.2 `PropertyLayout` tab bar — re-add `financials` (order: overview · financials · documents ·
      ownership · rental · location).
- [x] 2.3 (no-op — pro overview had no financials summary card)
- [x] 2.4 `tsc` clean for the financials tab.

## 3. Restore the AI chat assistant

- [ ] 3.1 `git checkout valgate-pro@44c70b9f -- 'components/layout/ai-overlay'`.
- [ ] 3.2 `ShellLayout` — re-mount the AI chat overlay + Agent Hub entry points the cut unmounted.
- [ ] 3.3 Confirm it does not collide with the kept scan/extraction UI inside add-property (they are
      separate; the cut kept extraction).
- [ ] 3.4 `tsc` clean; verify the overlay's server actions/services still exist (restore from pro if not).

## 4. Relocate the Fumadocs user manual to a PUBLIC route group

- [ ] 4.1 Create `app/(marketing)/` route group. Restore the manual into `app/(marketing)/docs/` from
      `valgate-pro@44c70b9f` (was `app/docs/`). It still serves at `/docs` (route groups add no segment).
- [ ] 4.2 Restore Fumadocs config + deps the cut removed (`source.config.ts` / `package.json` entries) if
      isolated to docs.
- [ ] 4.3 `middleware.ts` (Clerk) — add `/docs` and `/docs/(.*)` to the **public** route matcher so
      logged-out visitors can read it.
- [ ] 4.4 Verify `/docs` renders **while logged out** and is not wrapped by the authenticated shell chrome.

## 5. Add the property Activity panel (schema already exists — do NOT add tables)

- [ ] 5.1 **Reads** — in `lib/services/activities.ts` (or `activity.ts`), verify/add
      `getPropertyActivity(propertyId, orgId)`: org-scoped, `where propertyId = ? and orgId = ?`, order by
      `createdAt desc`, limit 50. Reject a `propertyId` not in the caller's org (IDOR guard).
- [ ] 5.2 **Write helper** — add append-only `logActivity(ctx, { entity, action, entityId, propertyId,
      title, description })` to the activities service (UUID id; org/user from ctx). Wrap callers so a log
      failure never fails the underlying mutation (try/catch, swallow-and-continue).
- [ ] 5.3 **Emit writes** from the kept mutation paths — call `logActivity` inside:
      property update · valuation create · document create/delete · ownership update. **Only these four**
      in this change.
- [ ] 5.4 **UI** — read-only right-rail list mounted in `components/property/PropertyLayout.tsx`:
      description + relative time, grouped by day; empty state "No activity yet." No filters (v1).
- [ ] 5.5 Confirm the standalone `/activity` route is **not** restored.

## 6. Verify (no DB changes anywhere)

- [ ] 6.1 `npx tsc --noEmit` clean (0 errors).
- [ ] 6.2 `npm run lint` clean.
- [ ] 6.3 `npm run build` succeeds.
- [ ] 6.4 Manual pass: 5-item nav (incl. Analytics) → `/analytics` loads → open a property → `financials`
      tab loads → AI overlay opens → edit the property → **Activity panel shows the new row** → log out →
      `/docs` still reads. No dead links; no `/activity` or `/pro` resolves.
- [ ] 6.5 Grep for orphaned imports from the restored trees.

## 7. Land

- [ ] 7.1 Commit on `valgate-mvp-v1`; PR base = `valgate-webapp-nextjs-v1.0.2`.
- [ ] 7.2 Update `.context/valgate-core-scope.md` if any scope detail shifted during build.
- [ ] 7.3 Archive this change (`openspec/changes/archive/`) once merged.
