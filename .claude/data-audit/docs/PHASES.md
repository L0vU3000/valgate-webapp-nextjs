# Phases — Master Reference

> Consolidated map of all phases discussed and executed across the audit + Zod + entity-wiring journey. Updated as work lands; cross-references the individual plan files in `docs/plans/`.

---

## Two parallel numbering schemes

Two ways of describing the same work. Use whichever is clearer in context.

### Beginner-version "Steps" (the simple 3-step playbook)

| Step | Description | Maps to detailed phases |
|---|---|---|
| **Step 1 — Walk every room** | Audit every page on the route | Phases 1, 2, 3, 4a–4g |
| **Step 2 — Add up what you learned** | Rank entities by cross-page impact, commit a build order | Phase 5 (`pages/SUMMARY.md`) |
| **Step 3 — Build entities in priority order** | The actual coding work | Phases 6.0–6.8 |

### Detailed phase numbering (numbered phases we drafted plans for)

See the full status table below.

---

## Detailed phase status

| Phase | What it does | Status |
|---|---|---|
| **1** | Update `audit-page-datapoints` skill — folder + audit/plan split | ✅ Done |
| **2** | Migrate existing `pages/property-id-overview.md` into the new folder structure | ✅ Done |
| **3** | Create master `pages/INDEX.md` cross-page entity backlog | ✅ Done |
| **4a** | Run page audit on `/portfolio` | ✅ Done |
| **4b** | Run page audit on `/property/[id]/rental` | ✅ Done |
| **4c** | Run page audit on `/property/[id]/documents` | ✅ Done |
| **4d** | Run page audit on `/property/[id]/safety` | ✅ Done |
| **4e** | Run page audit on `/property/[id]/ownership` | ✅ Done |
| **4f** | Run page audit on `/property/[id]/valuation` | ✅ Done |
| **4g** | Run page audit on `/property/[id]/location` | ✅ Done |
| **5** | Cross-audit synthesis → `pages/SUMMARY.md` (committed entity build order) | ✅ Done |
| **Zod B1** | PropertyValuation Zod migration (Option A pattern dress rehearsal) | ✅ Done |
| **Zod B2** | 10 tiny entities Zod sweep + `_common.ts` factoring | ✅ Done |
| **Zod B3** | 7 small/medium entities (Tenant, Lease, Payment, Professional, Notification, Document, UserProfile) | ✅ Done |
| **Zod B4** | Property Zod migration (largest entity; absorbs inline `propertyStatusSchema`) | ✅ Done |
| **6.0** | PropertyValuation **wiring** — 7 surfaces across 3 pages (overview, valuation, portfolio YoY) | ✅ Done |
| **6.1** | Lease + Tenant wiring — 17 surfaces across 2 pages (overview, rental) | ✅ Done |
| **6.2** | Payment + Expense wiring — 13 surfaces across 2 pages (overview, rental) | ✅ Done |
| **6.3** | Document wiring — 10 surfaces across 2 pages (rental, documents) | ✅ Done |
| **6.4** | LandParcel — 11 surfaces (location only) | ✅ Done (shipped 2026-05-06) |
| **6.5** | CoOwner — 10 surfaces (ownership only; PII-flagged) | ✅ Done (shipped 2026-05-06) |
| **6.6** | OwnershipRecord §21 — 6 surfaces (ownership) + PF5 rename (OwnershipRecord → OwnershipDocument) | ✅ Done (shipped 2026-05-06) |
| **6.7** | Folder — 4 surfaces (documents only; gated on 6.3) | ✅ Done (shipped 2026-05-06) |
| **6.8** | Notification + MaintenanceItem — 4 surfaces (overview, rental) | ✅ Done (shipped 2026-05-06) |
| **6.9** (was deferred) | PropertyComparable / MarketSnapshot — derived from internal portfolio data | 🔜 Unblocked by Q4.Q resolution; not yet planned |
| **6.x cleanup** | Remove `Property.health` (Q5.K) + add Monthly Income status badge (Q3.B) | 🔜 ~2 hr cleanup; not yet planned |

🎉 **Entity sprint complete.** All 8 ranks of the build order shipped (6.0 through 6.8). Every property page now ~95-100% wired against real entities + real seeds. Next: post-sprint cleanup (Property-field promotion micro-phase, DDL/ERD generation, finding routing sweep), then Phase 8 (audit non-property routes), then Phase 9 (backend migration to Convex/Neon).

---

## Per-entity sub-phase template (Phase 6.x breakdown)

Each entity in the build order can be decomposed into the same 5 sub-phases. After the Zod sweep (Batches 1–4), 6.x.1 is **skipped for all existing entities** — most remaining phases run as 4 sub-phases.

| Sub-phase | What it does | Time | Skipped when... |
|---|---|---|---|
| **6.x.0** | Pre-flight — read entity plan.md row, scan blocking Q-numbers, verify Zod schema | ~5 min | never |
| **6.x.1** | Schema PR — type + Zod + db + seed | ~half-day | entity already exists (every entity post-Zod-sweep) |
| **6.x.2** | Wiring PR — per consumer page | ~30–60 min/page | never |
| **6.x.3** | Batched audit — `/audit-datapoint` per surface | ~10 min/audit | never |
| **6.x.4** | Index updates — `pages/INDEX.md`, `SUMMARY.md`, plan.md fix logs | ~5 min | never |

In actual phase plans, the sub-phases roll up into named **steps** that are easier to write a prompt for:

| Plan-file step | Maps to sub-phases |
|---|---|
| **Step 0 — Pre-flight** | 6.x.0 |
| **Step A — Wiring + ★ WIRING-PLAYBOOK self-review** | 6.x.2 |
| **Step B — Visual dev-server check** | (gate, not a sub-phase) |
| **Step C — Audit batch + index updates** | 6.x.3 + 6.x.4 |

Same content, two naming conventions.

---

## Active Q-number blockers

Q-numbers that gate specific entity phases. Resolve or commit to a default before starting the affected phase.

| Q-number | Affects | Default if not resolved |
|---|---|---|
| ~~**Q3.B**~~ | ~~Phase 6.2 (Payment) — Monthly Income formula: expected vs received~~ | **✅ Resolved 2026-05-06: HYBRID — value + badge.** Primary value = "expected" (sum of `Lease.monthlyRent` where stage='Signed' and current month within window). Adjacent badge derived from Payment data: `"Collected"` / `"Partial"` / `"Due"` / `"Overdue"`. Affects overview + portfolio Monthly Income KPIs. Small follow-up phase: ~30 min wire-only (Lease + Payment data already fetched). |
| **Q3.C** | Phase 6.0 (already done) — YoY formula base value | "Latest valuation vs valuation closest to 12 months prior; NULL if no prior record" — committed in Phase 6.0 |
| **Q4.B** | Phase 6.1 (already done) — Tenant entity vs embedded in Lease | Resolved by Zod schema: separate entities; `Lease.tenantId` optional FK |
| ~~**Q4.F**~~ | ~~Phases 6.1 (done) + 6.8 — Auto-create Notification rows on lease/maintenance events~~ | **✅ Resolved Phase 6.8 (2026-05-06):** HYBRID per source. Lease-expiring → derived at query time (Phase 6.1). Manual/cross-cutting alerts → stored Notification rows (Phase 6.8). Auto-creation deferred to Convex/Neon backend phase. `linkTo` URL parse workaround used; see Q5.T for propertyId schema gap. |
| **Q4.N** | ~~Phase 6.5 (CoOwner) — Ownership tab Viewer RBAC~~ | ✅ Resolved Phase 6.5 (2026-05-06): RBAC deferred to Clerk+Convex backend phase; FS demo is single-user. Schema is forward-compatible. PII storage → Q5.S. |
| ~~**Q4.Q**~~ | ~~Phase 6.x deferred — External data source for MarketSnapshot/MarketComparable~~ | **✅ Resolved 2026-05-06: INTERNAL aggregation, no external API.** Comparable = other properties in the same area (filter by `Property.province` / `Property.city` / lat-lng proximity). MarketComparable becomes a derivation, not a stored entity. Unblocks 6.x deferred phase as Phase 6.9 — pure derivation work. |
| **Q4.R** | ~~Phases 6.4 (LandParcel)~~ + 6.x deferred — Schema design (denormalized vs separate; naming) | ✅ Resolved Phase 6.4 (2026-05-06): Option 2, separate entity. Still relevant for 6.x deferred (PropertyComparable/MarketSnapshot). |
| ~~**Q5.K**~~ | ~~Various — `Property.health` semantics~~ | **✅ Resolved 2026-05-06: REMOVE the field.** Drop `health` from `PropertyCoreSchema`, all PROP-NNNN seed files, `attentionCount` KPI on `/portfolio` (rewire to derived attention-signal: count of properties with open Emergency MaintenanceItems + properties with overdue Payment), and per-row health bar on the portfolio table. Cleanup phase: ~1.5 hours. |

---

## Side workstreams (also planned/unblocked)

| Workstream | Status | Notes |
|---|---|---|
| **DDL generation** | 🔜 Plan drafted; not executed | Postgres schema derived mostly mechanically from Zod; ~1 hr |
| **ERD generation** | 🔜 Plan drafted; not executed | Mermaid diagram hand-derived from Zod; auto-generator script as future follow-up |
| **Phase 7 — finding routing** | 🔜 Implicit; happens during 6.x as findings ship | Routes findings to `.context/todo-ui.md` (UI work) and `deferred-database-migration.md` (DB-pending) |
| **Phase 8 — audit non-property routes** | 🟡 In flight — **8.1 Analytics ✅ (2026-05-06)** · **8.2 Rental Dashboard audit ✅ (2026-05-07)** · **8.4 Directory ✅ (audit + wiring + post-wiring, 2026-05-07)** · **8.5 Estate Planning ✅ (audit + wiring + post-wiring, 2026-05-07)** · 8.2-wiring pending Q-resolution · 8.3 pending | `/analytics` ✅ (audit + post-wiring) · `/rental` ✅ audit · `/directory` ✅ audit + wiring + post-wiring · `/estate-planning` ✅ audit + wiring + post-wiring · `/add-property` · `/` · `/settings` · `/profile` · `/auth/*` |
| **Phase 8.1 Post-Wiring** | ✅ Done (2026-05-06) | PF1–PF6 + Row 38 resolved via Expense-entity reframe + period-filter URL wiring. 8 per-surface audit reports written. Q1.F / Q4.S / Q5.U closed; Q3.K / Q3.L implementation-note addenda filed; Q4.I deferred with empty-state partial. `/analytics` now 24 WIRED · 3 PARTIAL · 2 HARDCODED. |
| **Phase 8.5 Post-Wiring** | ✅ Done (2026-05-07) | Estate route rewired: KPI derivations (4-check rubric), `SuccessorPropertyAssignment` join entity, estate docs via `Document.category="estate"`, `EstateActivityEvent` timeline, Add Beneficiary modal+action flow. PF1–PF5 resolved; PF6 deferred. Final tally: 17 WIRED · 5 CHROME · 2 PARTIAL · 0 HARDCODED. 8 post-wiring audit reports written. |
| **Phase 9 — DB migration** | 🔜 Future | FS layer → Convex/Neon; absorbs deferred-DB items |
| **Phase 10 — steady state** | 🔜 Future | All entities wired, all routes audited, real DB |

---

## Prerequisite chain

What blocks what (read top-to-bottom):

```
Phase 1 (skill)
  └─ Phase 2 (migrate existing)
       └─ Phase 3 (master INDEX)
            └─ Phases 4a-4g (run 7 page audits)
                 └─ Phase 5 (synthesis → SUMMARY committing build order)

Zod Batch 1 (PropertyValuation)
  └─ Zod Batches 2, 3, 4 (sweep all remaining entities)

Phase 6.0 (PropertyValuation wiring)  [needs Phase 5 + Zod B1]
  └─ Phase 6.1 (Lease + Tenant wiring)  [needs Zod B3]
       └─ Phase 6.2 (Payment + Expense wiring)  [needs Zod B3]
            └─ Phase 6.3 (Document wiring)  [needs Zod B3]
                 └─ Phase 6.7 (Folder wiring)  [gated on 6.3]

Independent of the above chain (no inter-phase dependencies):
  Phase 6.4 (LandParcel)            ✅ Q4.R resolved (Option 2); 11 surfaces wired
  Phase 6.5 (CoOwner)               ✅ Q4.N resolved (RBAC defer + masked PII); 10 surfaces wired
  Phase 6.6 (OwnershipRecord §21)   ✅ PF5 rename done; 6 surfaces wired
  Phase 6.8 (Notification + Maint)  ✅ Q4.F resolved (HYBRID per source); 4 surfaces wired
```

---

## Archived plan files

Every plan is archived here at creation time (not at completion) — the active plan at `~/.claude/plans/make-a-plan-to-enchanted-lollipop.md` gets overwritten on each new plan request, so archiving up-front is the only way to preserve it.

- `docs/plans/Plan-Phase-6.1-Lease-Tenant-wiring.md` — Phase 6.1 plan (executed)
- `docs/plans/Plan-Phase-6.2-Payment-Expense-wiring.md` — Phase 6.2 plan (executed)
- `docs/plans/Plan-Phase-6.3-Document-wiring.md` — Phase 6.3 plan (executed)
- `docs/plans/Plan-Phase-6.4-LandParcel-wiring.md` — Phase 6.4 plan (executed; resolved Q4.R = Option 2; 11 surfaces wired)
- `docs/plans/Plan-Phase-6.5-CoOwner-wiring.md` — Phase 6.5 plan (executed; reinterpreted + resolved Q4.N = RBAC defer + masked-PII strategy; 10 surfaces wired)
- `docs/plans/Plan-Phase-6.6-OwnershipRecord-wiring.md` — Phase 6.6 plan (executed; PF5 rename + §21 entity build + 6 surfaces wired)
- `docs/plans/Plan-Phase-6.7-Folder-wiring.md` — Phase 6.7 plan (executed; wire-only; 4 surfaces wired)
- `docs/plans/Plan-Phase-6.8-Notification-MaintenanceItem-wiring.md` — Phase 6.8 plan (executed; resolves Q4.F = HYBRID per source; final 6.x phase — **entity sprint complete**)
- `docs/plans/Plan-Phase-8.1-Analytics-audit.md` — Phase 8.1 plan (executed; first non-property route audit; 6 PFn, 5 Q-numbers, no code changes)
- `docs/plans/Plan-Phase-8.1-Analytics-Wiring.md` — Phase 8.1 wiring plan (executed; Expense-entity reframe + period-filter + 4 file changes; PF1–PF6 + Row 38 resolved)
- `docs/plans/Plan-Phase-8.1-Analytics-Post-Wiring.md` — Phase 8.1 post-wiring plan (executed; 8 audit reports + Q-number close-out + INDEX/PHASES sync)
- `docs/plans/Plan-Entity-Catalog-Refresh.md` — Entity Catalog Refresh plan (drafted, not yet executed; awaiting user scheduling)
- `docs/plans/Plan-Phase-8.2-Rental-Dashboard-audit.md` — Phase 8.2 Rental Dashboard audit plan (executed 2026-05-07; 6 PFn, 8 Q-numbers, no code changes; wiring gated on Q4.T Unit entity decision + Q3.M–Q3.Q formula definitions)
- `docs/plans/Plan-Phase-8.4-Directory-audit.md` — Phase 8.4 Directory audit plan (executed 2026-05-07; 6 PFn, 5 Q-filings, no code changes; smallest and cleanest non-property audit; schema gap Q5.V is primary finding)
- `docs/plans/Plan-Phase-8.4-Directory-Wiring.md` — Phase 8.4 Directory wiring plan (executed 2026-05-07; Q5.V + Q1.I + Q1.C + Q1.J + Q4.U resolved; 9 schema fields added, 9 seed records updated, `/directory/[id]` route built, sort/pagination/email/phone/verified wired; PF1–PF5 closed)
- `docs/plans/Plan-Phase-8.5-EstatePlanning-audit.md` — Phase 8.5 Estate Planning audit plan (executed 2026-05-07; produced 6 PFn + 4 Q-numbers; follow-on wiring/post-wiring landed same day with PF1–PF5 resolved)

**Convention:** `Plan-Phase-<n>-<entity-or-action>.md`, derived from the plan's title. When drafting a new plan, write it to BOTH `~/.claude/plans/make-a-plan-to-enchanted-lollipop.md` (the active slot) AND `docs/plans/Plan-Phase-<n>-<title>.md` (the archive) in the same step.

---

## Pre-Phase-6 supporting infrastructure

Built once, used across every Phase 6.x:

- **`.claude/data-audit/WIRING-PLAYBOOK.md`** — self-review rules between Step A wiring and Step B visual check. 3 rules: adjacent-hardcode sweep, empty-state convention match, multi-record mental walk. Read before any Phase 6.x.
- **`.claude/data-audit/pages/SUMMARY.md`** — committed entity build order with sort rule `(pages_touched DESC, surfaces DESC)`. Source of truth for "what to build next."
- **`.claude/data-audit/pages/INDEX.md`** — auto-regenerated cross-page entity backlog (raw counts; SUMMARY is the curated decision).
- **`.claude/data-audit/pages/<slug>/audit.md` + `plan.md`** — per-page analysis + action. Q-number resolutions land in plan.md §5 Fix Log when wiring ships.
- **`.claude/skills/audit-datapoint/SKILL.md`** — deep-dive single-datapoint audit; recognizes lite vs full template via page-audit roadmap.
- **`.claude/skills/audit-page-datapoints/SKILL.md`** — page-triage skill that wrote the 8 page audit folders + maintains INDEX.

---

## How this doc gets updated

- **When a new plan is drafted:** archive it as `docs/plans/Plan-Phase-<n>-<title>.md` and add an entry under "Archived plan files" with `(drafted, not yet executed)`.
- **When a phase completes:** flip the status emoji (🔜 → ✅). Update the phase's "Archived plan files" entry from `(drafted, not yet executed)` to `(executed)`.
- **When a Q-number is resolved:** move it from "Active Q-number blockers" to a brief mention in the affected phase's status row.
- **When a new phase is identified:** insert into the status table in numerical order; cross-reference in the prerequisite chain.
- **When sub-phase pattern evolves:** update the per-entity template table.

This doc is the **living index** of the journey. The plan files in `docs/plans/` are immutable snapshots; this doc is the rolling map.

---

## Last updated

2026-05-07 — **Phase 8.5-Post-Wiring complete (Estate Planning).** `/estate-planning` moved from 5 WIRED · 10 HARDCODED to 18 WIRED · 0 HARDCODED (2 PARTIAL, 6 CHROME). PF1–PF5 resolved: KPI derivations wired, property-scoped successors, verified/unverified status rendering fixed, estate docs wired from `Document.category="Estate"`, timeline wired from `estate-activity-events`, and Add Beneficiary modal/action flow wired via `addSuccessorAndAssign`. PF6 (demo-user auth shim) remains deferred to backend migration. `pages/estate-planning/{audit,plan}.md` updated to post-wiring state.

_Previous entry:_ 2026-05-07 — **Phase 8.4-Post-Wiring complete (Directory).** 6 audit reports written: `directory--professional-card-direct-reads` (99 surfaces · verified badge · PF6 deferred), `directory--contact-buttons` (PF1 resolved · 18 WIRED), `directory--filter-controls` (11 WIRED · 0 findings), `directory--pagination` (PF3 resolved · 1 P3 nit), `directory--card-actions-stubs` (PF4 resolved · 18 WIRED), `directory--sort-and-empty-state` (PF2 + PF5 resolved). `INDEX.md` updated with 6 new per-datapoint rows + page-level row flipped to ✅. `/directory` is now fully audited end-to-end.

_Previous entry:_ 2026-05-07 — **Phase 8.4-Wiring complete (Directory).** All 5 Q-resolutions implemented: Q5.V (email/phone/verified fields added to `ProfessionalSchema`, all 9 seed records updated), Q1.I (sort dropdown wired with comparator), Q1.C (client-side pagination with `ITEMS_PER_PAGE = 12`, real count in footer), Q1.J (`/directory/[id]` profile route built — 3 new files; VIEW PROFILE now a `<Link>`), Q4.U (HARDCODED_PROFESSIONALS replaced by 6 Valgate-verified seeds PROF-0004–0009; `verified` badge wired). PF1–PF5 closed. PF6 deferred.

_Previous entry:_ 2026-05-07 — **Phase 8.5-audit complete (Estate Planning).** `/estate-planning` inventoried: 5 WIRED · 1 PARTIAL · 10 HARDCODED · 8 CHROME · 6 PFn. Only non-property route to have real data wired at audit time — 5 `Successor` direct-read fields already fetched via `db.successors.list()`. Primary bug: PF2 (verified-status rendering — `SUCC-0003.verified=false` ignored; always shows green "Verified"; fixable in ~10 min with no schema changes). Primary HARDCODED cluster: 4 KPI stat cards blocked on Q3.R (estate formula definitions). Schema gap: no Successor-Property assignment model (Q4.V). Security copy claim (PF3 — "End-to-end encrypted" with no encryption backend — Q5.W). 4 new Q-numbers filed: Q3.R, Q4.V, Q4.W, Q5.W. `EstatePlan` (new entity) + `EstateDocument` (Q4.C) + estate activity log (Q4.P) enter backlog. No code changes.

_Previous entry:_ 2026-05-07 — **Phase 8.4-audit complete (Directory).** `/directory` inventoried: 79 WIRED · 22 HARDCODED · 8 CHROME · 6 PFn. Smallest and cleanest non-property audit. Primary finding: PF1 (Email/Phone schema gap — 12 buttons, no `email`/`phone` fields in `ProfessionalSchema`) files Q5.V. Secondary findings: PF2 (sort CHROME — Q1.I), PF3 (pagination "142" — Q1.C updated), PF4 (VIEW PROFILE stub — Q1.J), PF5 (HARDCODED_PROFESSIONALS fallback — Q4.U), PF6 (linkedProperties scalar — cite entity catalog §13). 5 Q-filings. `Professional` entity enters cross-page backlog as first audit of this entity (60 wired surfaces). No code changes. Phase 8.4-Wiring pending Q-resolution gate.

_Previous entry:_ 2026-05-07 — **Phase 8.2-audit complete (Rental Dashboard).** `/rental` inventoried: ~25 WIRED · 1 PARTIAL · ~67 HARDCODED · ~14 CHROME · 6 PFn. Highest HARDCODED ratio of all audited pages. KpiCards receives no props (PF2 — 11 surfaces). HeatmapGrid has 33 hardcoded unit tiles (PF3 — Unit entity question Q4.T filed). LeaseTable has 3 hardcoded property-ranking rows (PF4). Four scalars with no formula (PF5). 8 new Q-numbers: Q1.G, Q1.H (nav tabs + placement), Q3.M–Q3.Q (5 formula definitions), Q4.T (multi-unit/Unit entity). Unit entity enters unbuilt backlog at 33 surfaces — becomes rank 1 if Q4.T resolves to "build entity". Phase 8.2-wiring pending Q-resolution gate; Phase 8.3 is next audit.

_Previous entry:_ 2026-05-06 — **Phase 8.1 Post-Wiring complete.** `/analytics` now ✅ fully wired: 24 WIRED · 3 PARTIAL · 2 HARDCODED. 8 per-surface audit reports written (`analytics--kpi-strip-direct-reads`, `analytics--noi-kpi`, `analytics--revenue-chart`, `analytics--occupancy-card`, `analytics--lease-pipeline-direct-reads`, `analytics--capital-growth-direct-reads`, `analytics--expense-breakdown`, `analytics--maintenance-spend`). Q1.F / Q4.S / Q5.U resolved blocks written; Q3.K + Q3.L implementation-note addenda filed (Expense-entity supersedes candidate-formula path); Q4.I deferred with partial mitigation (empty-state copy). Payment+Expense entity now rank 1 in cross-page backlog (25 surfaces, 3 pages). Phase 8.2 (Rental Dashboard) is next.

_Previous entry:_ 2026-05-06 — **Phase 8.1 complete — Analytics audit done.** `/analytics` page inventoried: 13 WIRED · 10 HARDCODED · 7 PARTIAL · 6 PFn. Three P1 derivation bugs filed (PF2: expenses=0 due to `* 0`; PF3: NOI = Revenue with no deduction; PF5: "Utilities" slice = insurance data). Three hardcoded scalars filed (91.4% occupancy, $48k donut center, March–Aug 2024 timeline range). Five inert filter affordances documented (PF1). Five new Q-numbers filed: Q1.F (period-filter scope), Q3.K (NOI formula), Q3.L (expense series source), Q4.S (occupancy time-series), Q5.U (Utilities label). Entity build order **unchanged** — analytics consumes only already-wired entities. Phase 8.2 is the next non-property audit (candidates: `/rental` or `/`).

_Previous entry:_ 2026-05-06 — Phase 6.8 complete — Entity Sprint Done. Notification + MaintenanceItem wired (4 surfaces). Q4.F resolved. All 8 Phase 6.x entity phases ✅.
