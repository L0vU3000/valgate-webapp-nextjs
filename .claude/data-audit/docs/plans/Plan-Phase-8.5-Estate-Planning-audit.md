# Plan - Phase 8.5-audit: Audit `/estate-planning`

> **Sub-phase 1 (Audit) only.** Do not wire anything in this phase. Output should be `pages/estate-planning/{audit.md, plan.md}` plus index and Q-number updates. **No application code changes.**
>
> Workflow reference: `.claude/data-audit/docs/PAGE-AUDIT-WORKFLOW.md` - Sub-phase 1, Page Audit.

---

## Context

`/estate-planning` is the estate succession dashboard at `app/(shell)/estate-planning/`. It is a composite screen: estate KPI cards, property estate-plan cards, selected-property detail, beneficiary table, estate documents, recent activity, and several action buttons.

The page is not purely mocked anymore, but it is still mostly hardcoded:

- `getEstatePlanningPageData()` reads `db.successors.list(userId)` and maps real `Successor` records into the beneficiary table.
- If no successors exist, it falls back to three hardcoded successors in `queries.ts:138-163`.
- The KPI cards, property list, selected-property status panel, estate documents, and recent activity timeline are all inline arrays/literals in `queries.ts:70-195`.
- The component receives `Successor.verified`, but the table always renders a green "Verified" status for every row (`SuccessionPage.tsx:350-354`). Current seed data has `SUCC-0003.verified = false`, so this is a likely P1 render bug.
- The existing `Successor` schema has no `linkedPropertyIds`, so the selected property does not actually scope beneficiaries or completion status.
- Estate documents are not a built entity. The entity catalog says `EstateDocument` is not built and may fold into `Document.category="estate"` (Q4.C).
- Recent activity likely belongs to an audit-log/activity source, not an inline timeline. Q4.P already covers the broader audit-log decision for chain-of-custody.

Why Phase 8.5 should be `/estate-planning`: the 8.4 directory plan explicitly called out "8.5 estate-planning" as a remaining target. This page is high product-risk because it makes legal/security claims ("Protected Documents", "End-to-end encrypted", beneficiary verification, activity history), and the audit can surface those decisions without being blocked by `/rental` Unit/yield-ranking work or `/directory` profile-route work.

---

## Prerequisites

Read before Step 0:

- `.claude/data-audit/CLAUDE.md` - folder structure and fix-recording rules
- `.claude/data-audit/docs/PAGE-AUDIT-WORKFLOW.md` - three-sub-phase framework
- `.claude/data-audit/WIRING-PLAYBOOK.md` - Step C bundling rules
- `.claude/skills/audit-page-datapoints/SKILL.md` - page-audit output shape
- `.claude/skills/audit-datapoint/SKILL.md` - post-wiring report templates
- `.claude/data-audit/pages/SUMMARY.md` - current Phase 8 status
- `.claude/data-audit/pages/INDEX.md` - cross-page entity backlog
- `.claude/data-audit/ref/00-entity-catalog.md` sections:
  - §1 Property
  - §2 Document
  - §14 Successor
  - §15 EstateDocument
- `.claude/data-audit/ref/01-read-map.md` `/estate-planning`
- `.claude/data-audit/ref/02-write-map.md` `/estate-planning`
- `.claude/data-audit/ref/03-data-flow-and-derivations.md` B9 Estate-planning derivations
- `.claude/data-audit/ref/05-open-questions.md` Q3.F, Q3.G, Q4.C, Q4.M, Q4.P
- Pattern reference audits:
  - `pages/directory/audit.md` - partly wired single-entity page with hardcoded fallback
  - `pages/property-id-documents/audit.md` - Document and audit-log precedent
  - `pages/rental-dashboard/audit.md` - composite route with hardcoded component clusters

Critical source files to inventory:

- `app/(shell)/estate-planning/page.tsx`
- `app/(shell)/estate-planning/queries.ts`
- `app/(shell)/estate-planning/_components/SuccessionPage.tsx`
- `app/(shell)/estate-planning/actions.ts`
- `lib/actions/successors.actions.ts`
- `lib/data/types/successor.ts`
- `lib/data/db/successors.ts`
- `lib/data/types/property.ts`
- `lib/data/db/properties.ts`
- `lib/data/types/document.ts`
- `lib/data/db/documents.ts`
- `public/data/users/demo-user/successors/*/core.json`
- a few property and document seed records under `public/data/users/demo-user/`

---

## Step 0 - Pre-flight

1. **Confirm slug.** Use `pages/estate-planning/` for the page-audit folder. No collision risk.
2. **Re-verify line numbers.** Current high-signal anchors:
   - `queries.ts:57-68` - live `Successor` read and map
   - `queries.ts:70-103` - hardcoded stats
   - `queries.ts:104-137` - hardcoded estate-property cards
   - `queries.ts:138-163` - hardcoded successor fallback
   - `queries.ts:164-175` - hardcoded estate documents
   - `queries.ts:176-195` - hardcoded timeline
   - `SuccessionPage.tsx:29-49` - status label/color config
   - `SuccessionPage.tsx:205-213` - header action stubs
   - `SuccessionPage.tsx:237-240` - Filter action stub
   - `SuccessionPage.tsx:257-277` - selected-property header and action stubs
   - `SuccessionPage.tsx:283-297` - hardcoded status panel
   - `SuccessionPage.tsx:306` - hardcoded "3 total entries"
   - `SuccessionPage.tsx:323-360` - successor rows
   - `SuccessionPage.tsx:350-354` - hardcoded Verified status despite `s.verified`
   - `SuccessionPage.tsx:371-394` - estate document cards and download stubs
   - `SuccessionPage.tsx:408-425` - timeline rows
   - `SuccessionPage.tsx:431-442` - encryption/history/download footer claims/actions
3. **Sanity-check seed data.** Confirm current demo successors:
   - `SUCC-0001`: primary, 75, verified true
   - `SUCC-0002`: contingent, 12.5, verified true
   - `SUCC-0003`: contingent, 12.5, verified false
   This seed makes the hardcoded "Verified" render bug visible.
4. **Check existing Q-number coverage.** Do not duplicate:
   - Q3.F - "Verified across 32 properties in Cambodia"
   - Q3.G - Successor share validation
   - Q4.C - EstateDocument vs Document
   - Q4.M - multi-user/sharing
   - Q4.P - audit log / chain-of-custody
5. **Light visual peek only if needed.** `pnpm dev` and open `/estate-planning` to verify visible surfaces and click-only behavior. This is optional context gathering, not Step B visual validation.

---

## Step A - Run `/audit-page-datapoints` against `/estate-planning`

Invocation:

```text
/audit-page-datapoints /estate-planning
```

Expected outputs:

- `.claude/data-audit/pages/estate-planning/audit.md`
- `.claude/data-audit/pages/estate-planning/plan.md`

Audit content checklist:

### 1. Surface inventory

Use the skill categories exactly: WIRED, HARDCODED, PARTIAL, CHROME, DECORATIVE.

Expected clusters:

| Section | Expected classification pattern | Notes |
|---|---|---|
| Header labels | mostly CHROME | Breadcrumb, H1, subtitle. |
| Header actions | CHROME / possible PFn | View Analytics and Generate Portfolio Report have no handler/route. |
| Stats grid | HARDCODED | 4 KPI cards from `queries.ts:70-103`; Plan Completion, Pending Reviews, Named Beneficiaries, Protected Documents. |
| Property list | HARDCODED | 4 property cards from `queries.ts:104-137`; not sourced from `db.properties.list(userId)`. |
| Property card status labels | HARDCODED / PARTIAL | Status derives from hardcoded `EstateProperty.status`; label text/color from local config. |
| Filter action | CHROME | No state/filter behavior. |
| Selected-property header | PARTIAL / HARDCODED | Property name changes with selected hardcoded property; "Last updated: Oct 14, 2023" hardcoded. |
| Status panel | HARDCODED | Always "Plan Finalized" and "100% Finalized", independent of selected property. |
| Successor table direct reads | WIRED | Initials, name, relation, role, share read from `Successor` when DB rows exist. |
| Successor table count | HARDCODED | "3 total entries" literal; should be `successors.length`. |
| Successor verified status | PARTIAL / HARDCODED | `s.verified` exists but render always says Verified with green icon. |
| Successor row actions | CHROME | More menu button has no behavior. |
| Estate documents | HARDCODED | 2 document rows from `queries.ts:164-175`; no `Document`/`EstateDocument` source. |
| Recent activity | HARDCODED | Timeline rows from `queries.ts:176-195`; includes relative "Today" / "Yesterday" strings. |
| Footer security copy | HARDCODED or CHROME with finding | "End-to-end encrypted estate planning data" is a security claim with no backing implementation in the FS demo. |
| Footer actions | CHROME | View full history / Download all documents buttons have no handlers. |

Do not over-count decorative icons as data. Icons become audit-relevant only when their color/state claims a data status, such as green verified checks.

### 2. Page-wide findings to file

Expected PFn findings:

- **PF1 - Estate stats are fully hardcoded.** Plan Completion 84.5%, Pending Reviews 12, Named Beneficiaries 48/32 Cambodia caption, Protected Documents 156 and "All encrypted & backed up" are literal data claims. Existing Q3.F covers the beneficiary caption; a new Q3 letter may be needed for plan-completion and pending-review formulas.
- **PF2 - Estate property list is hardcoded and not linked to real Property records.** The page has real `Property` data available elsewhere in the app, but estate-property cards are bespoke mock objects with numeric ids, hardcoded addresses, status, initials, and colors. This likely requires `Successor.linkedPropertyIds` or an estate-plan property state model.
- **PF3 - Selected-property status panel is hardcoded.** It always says "Plan Finalized" / "100% Finalized" regardless of which estate property is selected. This is a stronger version of PF2 and should cite the same missing estate-status source.
- **PF4 - Successor table is partially wired but verified status is wrong.** Current seeds include one unverified successor, but the UI always renders Verified. Also "3 total entries" is hardcoded. This is actionable without new schema for the verified cell; share-total validation remains Q3.G.
- **PF5 - Estate documents are hardcoded and entity boundary is unresolved.** Cite Q4.C. The likely low-friction path is to use existing `Document` with `category="Estate"` / `"estate"`, but Q5.R (Document category enum) may also matter.
- **PF6 - Recent Activity timeline is hardcoded; chain-of-custody source is unresolved.** Cite Q4.P rather than re-filing the broad audit-log question. Timeline also uses relative labels ("Today", "Yesterday") that go stale.
- **PF7 - Action buttons and write paths are not wired.** Add Beneficiary has server-side helper code (`actions.ts`) but no UI flow. Download Summary, Review All, document downloads, View Full History, Download All Documents, View Analytics, Generate Portfolio Report, and Filter are stubs/chrome. File a Q1 scope question only if the audit treats these as Phase 8.5 wiring candidates rather than future UX.
- **PF8 - Security/encryption claims are not backed by the current storage model.** Protected Documents and footer copy claim encryption/backup. In the FS demo, `Document.storageId` is a string path and there is no explicit encryption state. This likely becomes a P2/P3 semantic finding unless product confirms this copy is pure marketing chrome.

### 3. Entity Backlog expectations

Rows likely needed in `pages/estate-planning/plan.md`:

| Entity / Gap | Status | Surfaces unlocked | Notes |
|---|---|---|---|
| `Successor` | shipped, partial wiring | Beneficiary table direct reads | Existing schema supports name, initials, relation, role, share, verified. UI ignores `verified`; no property assignment. |
| `Successor.linkedPropertyIds` or EstateAssignment | schema gap | Property-specific beneficiaries, named-beneficiary property caption, selected-property detail | Catalog already proposes `linkedPropertyIds`; not in Zod. Tie to Q4.M / new Q4 letter if needed. |
| Estate status / EstatePlanProperty derivation | not built | Plan Completion, Pending Reviews, property card statuses, status panel | Could be derived from properties + successors + documents, or stored as an estate-plan record per property. Needs Q3 formula decision. |
| `Document` with estate category or `EstateDocument` | entity-boundary unresolved | Estate Documents list, Protected Documents KPI, document downloads | Cite Q4.C. Also consider Q5.R for category enum/casing. |
| AuditLog / ActivityEvent | not built | Recent Activity, Last updated, View full history | Cite Q4.P. Avoid creating a second duplicate broad audit-log Q. |
| Report/export/download flows | route/action gap | Header and panel action buttons | Likely Q1 UX scope, not entity sprint. |

### 4. Audit Roadmap expectations

Apply WIRING-PLAYBOOK Step C bundling:

| Planned report | Template | Surfaces covered | Finding refs |
|---|---|---|---|
| `estate-planning--stats-kpis.md` | full | 4 KPI cards: values, captions, progress/security claims | PF1, PF8, Q3.F |
| `estate-planning--property-cards.md` | full or bundled lite after wiring | 4 property cards: name, address, initials, status label/color | PF2 |
| `estate-planning--property-status-panel.md` | full | selected-property title, last-updated date, plan status, progress | PF2, PF3, Q4.P |
| `estate-planning--successor-table-direct-reads.md` | bundled lite plus finding table | successor initials/name/relation/role/share rows | PF4, Q3.G |
| `estate-planning--successor-verification-status.md` | full | verified status icon/label, unverified seed behavior | PF4 |
| `estate-planning--estate-documents.md` | full | document names, meta, icon state, download buttons | PF5, Q4.C |
| `estate-planning--recent-activity.md` | full | timeline title/time/description/active dot | PF6, Q4.P |
| `estate-planning--action-stubs.md` | bundled lite or page-level only | all inert actions | PF7 |

If the skill chooses fewer reports by bundling action stubs at the page level only, that is acceptable. The key is not to create one per button.

---

## Step B - Manual supplement

After the skill writes `audit.md` and `plan.md`, verify and supplement:

1. Add any missed PFn rows from the list above, especially PF4 (verified status bug) and PF8 (security/encryption claim).
2. Ensure `plan.md` has an Entity Backlog row for `Successor` plus a separate row for property assignment / estate status.
3. Ensure Q3.F, Q3.G, Q4.C, Q4.M, and Q4.P are cited instead of duplicated.
4. Ensure the Audit Roadmap bundles direct-read successor fields.
5. Record source-file hashes in the `audit.md` details block.
6. Keep status as `"audit complete · no wiring yet"` after the audit phase.

---

## Step C - Q-number filings

Scan `ref/05-open-questions.md` before assigning letters. Existing relevant Qs:

- **Q3.F** - Named Beneficiaries caption / "Verified across 32 properties in Cambodia"
- **Q3.G** - Successor share validation
- **Q4.C** - EstateDocument vs Document
- **Q4.M** - Multi-user / sharing
- **Q4.P** - Audit log / chain-of-custody
- **Q5.R** - Document category enum/casing, if estate docs fold into `Document`

Likely new Qs:

- **Q3.R or next free Q3** - Estate plan completion and pending-review formulas. Define how Plan Completion %, Pending Reviews count, property estate status (`complete` / `pending` / `action` / `draft`), and selected-property status panel derive from available entities.
- **Q4.V or next free Q4** - Successor-to-property assignment model. Options: add `Successor.linkedPropertyIds`, introduce an `EstateAssignment` join entity, or keep successors global-only and remove property-specific selection semantics.
- **Q1.K or next free Q1** - Estate action scope. Decide which visible actions should be wired in v1: Add Beneficiary, Review All, Download Summary, Download document, View full history, Download all documents, View Analytics, Generate Portfolio Report, Filter.
- **Q5.W or next free Q5** - Estate security copy semantics. Decide whether "Protected Documents", "All encrypted & backed up", and "End-to-end encrypted estate planning data" are acceptable copy before the backend/storage encryption phase, or should be softened to match FS-demo reality.

Do not create new broad Qs for document boundary or audit logging unless Q4.C/Q4.P are insufficient. Prefer adding implementation notes under existing Qs.

---

## Step D - Index updates

Audit execution should update:

1. **Root `INDEX.md`** - add page-level audit row for `estate-planning`.
2. **`pages/INDEX.md`** - add/adjust cross-page backlog rows:
   - `Successor` - shipped, partial wiring on `/estate-planning`.
   - `Successor.linkedPropertyIds` or EstateAssignment - schema gap, surfaces from property-specific beneficiaries/status.
   - `Document` / `EstateDocument` - estate document surfaces; cite Q4.C.
   - `AuditLog` / ActivityEvent - recent activity and last-updated surfaces; cite Q4.P.
   - Estate KPI derivations - plan completion, pending reviews, named beneficiaries, protected docs.
3. **`pages/SUMMARY.md`** - append a Phase 8.5-audit footer note. Rerank only if the new entity/gap counts materially change the backlog.
4. **`docs/PHASES.md`** - add Phase 8.5-audit as pending/executed when the audit actually runs; do not mark complete from this planning pass alone.

---

## Verification checklist for the future audit run

- [ ] `pages/estate-planning/audit.md` exists with a complete source inventory and PFn findings.
- [ ] `pages/estate-planning/plan.md` exists with Entity Backlog, Audit Roadmap, Q gate, and Fix Log scaffold.
- [ ] `Successor.verified` render mismatch is captured against the `SUCC-0003` seed.
- [ ] Existing Q3.F, Q3.G, Q4.C, Q4.M, Q4.P are cited where applicable.
- [ ] New Qs are filed only for uncovered estate-specific ambiguity.
- [ ] Root `INDEX.md`, `pages/INDEX.md`, `pages/SUMMARY.md`, and `docs/PHASES.md` are synced.
- [ ] No `app/`, `lib/`, `components/`, or seed data files are changed in the audit-only phase.

---

## What this unblocks

- **Phase 8.5-Wiring** - after Q-resolution, likely first-pass scope is small and high-confidence:
  - fix successor verified render and table count
  - remove/replace hardcoded successor fallback with an empty state
  - wire property list from `db.properties.list(userId)` if estate status can be defined
  - wire estate documents if Q4.C resolves to `Document.category="estate"`
- **Phase 8.5-Post-Wiring** - per-surface reports from the Audit Roadmap, Q close-out, and index/fix-log updates.
- **Backend migration planning** - estate planning will likely add pressure to audit logging, document category semantics, and security/encryption copy.

---

## Time estimate

| Step | Estimate |
|---|---:|
| Step 0 - source/ref preflight | 15 min |
| Step A - run page-audit skill and verify inventory | 60-75 min |
| Step B - manual supplement | 20-30 min |
| Step C - Q filings | 15-20 min |
| Step D - index sync | 15 min |
| **Total** | **~2-2.5 hours** |

This should be a bit smaller than `/rental` but more nuanced than `/directory`: fewer repeated card surfaces, more semantic/legal/security claims.

---

## Out of scope

- Running `/audit-page-datapoints /estate-planning` during this planning pass.
- Wiring successor verification, estate documents, property cards, or actions.
- Creating `pages/estate-planning/audit.md` or `pages/estate-planning/plan.md` before the actual audit phase.
- Adding `Successor.linkedPropertyIds`, `EstateDocument`, `AuditLog`, or estate KPI derivations.
- Updating `docs/PHASES.md` to mark Phase 8.5 complete before the audit runs.
- Any Convex/backend migration work.

