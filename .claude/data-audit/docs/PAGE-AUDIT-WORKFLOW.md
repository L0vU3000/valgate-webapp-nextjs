# Page-Audit Workflow — Three-Sub-Phase Structure

> Canonical structure for taking a page from "never audited" to "fully wired and recorded." Codified after Phase 8.1 (`/analytics`) which validated the split. Use this as the template for `/rental`, `/`, `/settings`, `/profile`, `/directory`, `/estate-planning`, `/add-property`, `/auth/*`.

---

## Why three sub-phases

Pre-Phase-8.1 the convention bundled wiring + per-surface audits in one plan (Phase 6.x pattern). For pages with **product-decision Q-numbers** (Q1/Q3/Q4/Q5 letters that need stakeholder input), bundling forces wiring to wait on Q-resolution AND blocks recording the audit findings. Splitting lets:

- The audit ship as soon as `/audit-page-datapoints` runs
- Q-numbers be resolved asynchronously (UX/product input)
- Wiring land independently when Q-numbers clear
- Post-wiring record-keeping run as a separate, low-risk pass with no code changes

For pages with **no Q-number gates** (pure derivation cleanup, no stakeholder input needed), the property-tab pattern (one bundled plan) is still fine — judge per route.

---

## The three sub-phases

```
<n>.<sub>-audit          →   <n>.<sub>-Wiring         →   <n>.<sub>-Post-Wiring
(skill produces docs)        (code changes)               (verify + record-keep)
~2 hours                     ~3-4 hours per fix scope     ~2.5-3 hours
```

Plan archive naming: `Plan-Phase-<n>.<sub>-<slug>-{audit|Wiring|Post-Wiring}.md`. Example: `Plan-Phase-8.1-Analytics-audit.md`, `Plan-Phase-8.1-Analytics-Wiring.md`, `Plan-Phase-8.1-Analytics-Post-Wiring.md`.

---

## Sub-phase 1 — Page Audit

> First-pass inventory of a route. Skill-driven; minimal manual input.

**Trigger:** first time auditing a route, OR surfaces gained/lost on an already-audited route (re-run bumps revision).

**Inputs:**
- The route URL (e.g. `/analytics`)
- Read-list: `pages/SUMMARY.md`, `pages/INDEX.md`, `WIRING-PLAYBOOK.md`, `ref/05-open-questions.md`, the closest pattern-reference page audit (e.g. `pages/portfolio/audit.md` for cross-portfolio routes)

**Step 0 — Pre-flight**
- Spot-check briefing assumptions against current source (line numbers may have drifted)
- Pick a slug; avoid collisions (e.g. `/rental` top-level → `pages/rental-dashboard/`, NOT `pages/rental/`, because `pages/property-id-rental/` already exists)
- Scan `ref/05-open-questions.md` for any blocking Q-letters already filed

**Step A — Run the skill**
- Invocation: `/audit-page-datapoints <route>`
- Outputs (skill-managed):
  - `pages/<slug>/audit.md` — Surface Inventory (every visible element classified WIRED / HARDCODED / PARTIAL / CHROME / DECORATIVE) + Page-Wide Findings (PFn) + source-file SHAs
  - `pages/<slug>/plan.md` — Entity Backlog + Audit Roadmap (per-surface lite/full template recommendation, with Step C bundling pre-applied) + Fix Log scaffold

**Step B — Findings supplement (manual, if skill missed obvious wins)**
- Add PFn rows the skill didn't surface (correctness bugs the briefing identified, filter-chrome misclassifications, etc.)
- Add Entity Backlog rows for entities/derivations the page renders but doesn't fetch
- Apply WIRING-PLAYBOOK Step C bundling — group lite-template surfaces into bundled audit reports (saves ~50 min per cluster of 5+ surfaces)

**Step C — Q-number filings**
- Append new Q-letters to `ref/05-open-questions.md` for any product/UX decisions surfaced
- Cross-link from PFn rows in `audit.md` (e.g. "Blocks PF3 fix · see Q3.K")
- Letter assignment: next free letter under the right Q-section (Q1=UX scope, Q2=copy, Q3=KPI definitions, Q4=entity/schema, Q5=labels/data)

**Step D — Index updates**
- `INDEX.md` (root) — append page-level audit row
- `pages/INDEX.md` — append cross-page entity backlog rows (each entity gets a surface count contribution); re-run sort `(pages_touched DESC, surfaces DESC)`
- `pages/SUMMARY.md` — only update if rerank or major build-order shift; otherwise add a "Last updated" footer note
- `docs/PHASES.md` — flip phase status, add to "Archived plan files"

**Outputs:**
- `pages/<slug>/audit.md` (rev 1)
- `pages/<slug>/plan.md` (status: "audit complete · no wiring yet")
- 1–N new Q-letters
- Updates to 4 indexes
- Archived plan: `Plan-Phase-<n>.<sub>-<slug>-audit.md`

**Time:** ~2 hours (lower-bound; smaller pages take ~90 min, dense aggregator pages ~3 hours)

**Out of scope this phase:** any code changes, any per-surface deep-dive audits, any wiring. Audit-only.

---

## Gate between sub-phase 1 and sub-phase 2 — Q-number resolution

> Not a phase, but the critical handoff. Without this, sub-phase 2 either guesses or stalls.

For each Q-letter filed in sub-phase 1:
- **Stakeholder input** — the user / product owner picks an option from the Q-letter's candidates (or proposes a new one)
- **Append a Resolved block** under the Q-letter in `ref/05-open-questions.md`: `> **Resolved YYYY-MM-DD: Option X — <short summary>.** <implementation note>. **Unblocks PFn.**`
- Some Q-letters can be **deferred** if the page can ship without them (with a partial-mitigation note in `plan.md` §5 Fix Log)
- Some Q-letters can be **accepted with default** if the audit's "Default if not resolved" cell in PHASES.md or the candidates list has a clear winner

**Output:** every Q-letter blocking a fix has either a Resolved block, a deferral note, or an accepted-default note. Wiring planning can proceed.

**Time:** highly variable — minutes if the user has opinions ready, days if they need to consult others. Not on the critical path of agent work; runs async.

---

## Sub-phase 2 — Wiring

> Code changes that resolve PFn findings.

**Trigger:** Q-numbers blocking the target findings are resolved (or accepted/deferred). Wiring scope is selected from `pages/<slug>/plan.md` Entity Backlog + §5 Fix Log open rows.

**Inputs:**
- The page's `plan.md` (Entity Backlog + Fix Log)
- `WIRING-PLAYBOOK.md` (Pre-flight + 3 self-review rules)
- The resolved Q-blocks in `ref/05-open-questions.md`

**Step 0 — Pre-flight (from WIRING-PLAYBOOK §Pre-flight)**
- Read the entity's plan.md row + Q-blocks
- Verify Zod schemas current
- Confirm the fix scope matches the resolved Q-letter exactly (the wiring may take a refinement path different from the candidate options — document this as an "implementation note" addendum, not a deviation)

**Step A — Implement the fix**
- Code changes touch `app/`, `lib/data/derivations/`, `lib/data/types/`, `lib/data/db/`, components — whatever's listed in the plan's "Files to Modify"
- Add new seed data if needed (`public/data/users/demo-user/<entity>/`)
- Run between-edits self-review per WIRING-PLAYBOOK 3 rules (adjacent-hardcode sweep, empty-state convention match, multi-record mental walk)

**Step B — WIRING-PLAYBOOK self-review (~5 min)**
- Rule 1 — Adjacent-hardcode sweep — does any neighbor value claim something about the wired value?
- Rule 2 — Empty-state convention match — does the new wiring's `"—"` / `"$0"` / `"None"` match this file's existing convention?
- Rule 3 — Multi-record mental example — for any aggregation loop, walk through with 2 records of differing states; verify both numerator + denominator use the same condition

**Step C — Visual dev-server check (~5 min)**
- `pnpm dev`, navigate to the route
- Eyeball: does each PFn fix render correctly?
- Click filters, hover charts, switch tabs — basic interactions work?
- If anything's wrong → back to Step A with notes
- If correct → hand off to sub-phase 3 (Post-Wiring)

**Step D — Commit**
- Single commit (or short chain) with descriptive message tying back to PFn references
- Note: do NOT update `audit.md` or `plan.md` Fix Log yet — that's sub-phase 3's job (it needs the commit SHA)

**Outputs:**
- Code changes committed
- (Optional) new seed data, new entity files
- Archived plan: `Plan-Phase-<n>.<sub>-<slug>-Wiring.md`

**Time:** ~3–4 hours per fix scope. Highly variable — small fix scopes (1–2 PFn) can be ~1 hour; complex fixes (5+ PFn touching new entities) can be ~6 hours.

**Out of scope this phase:** per-surface audits, Q-number close-out, fix-log updates, INDEX changes — all sub-phase 3.

---

## Sub-phase 3 — Post-Wiring

> Verification + record-keeping. No code changes.

**Trigger:** Wiring committed and visible in dev server.

**Inputs:**
- The page's current `audit.md` (rev 1) + `plan.md` (status: pre-wiring)
- The wiring commit SHAs
- `CLAUDE.md` §"How to record a fix" (the 9-step in-place update flow)

**Step 0 — Pre-flight (~10 min)**
- `pnpm tsc --noEmit` — type check clean
- `git diff --stat` — confirm scope is what the wiring plan said it'd touch (no scope creep)
- Spot-check seed data still present and valid

**Step A — Visual verification (~25 min)**
- For each PFn finding, re-check the fix landed (separate from sub-phase 2 Step C — this is the formal pass)
- Use a small table in the plan: Finding → Expected behavior → Pass criteria → Pass/Fail
- Stop here if any verification fails — do NOT do Step B with broken wiring

**Step B — Per-surface audit batch (~60–75 min)**
- Run the 8-ish reports listed in `pages/<slug>/plan.md` §4 Audit Roadmap
- Each `/audit-datapoint` invocation:
  - Records source-file SHAs (so re-audit detection works)
  - Confirms live value renders correctly
  - Captures any new findings (most should be ≤1 P3 each post-wiring)
  - Auto-appends a row to root `INDEX.md`
- Apply WIRING-PLAYBOOK Step C bundling: ~3 min per lite-bundled report, ~10 min per full report

**Step C — Q-number close-out (~20 min)**
- For each Q-letter the wiring resolved, append a `**Resolved YYYY-MM-DD (Phase <n> Post-Wiring): Option X.**` block in `ref/05-open-questions.md`
- For Q-letters where wiring took a refinement path (e.g. used existing entity instead of the candidate-formula split), add an **implementation-note addendum** documenting the equivalence and trade-offs
- For Q-letters that remain deferred, append a partial-mitigation note (e.g. PF6 empty-state copy added; entity decision still deferred)

**Step D — audit.md + plan.md fix-log update (~25 min)**

In `pages/<slug>/audit.md` (per CLAUDE.md §"How to record a fix"):
1. Front-matter: bump `revision`, `date`, update `verdict`
2. TL;DR: refresh to post-wiring state
3. §8 Findings: strikethrough resolved finding headers (`~~PFn — ...~~ — ✅ resolved in Revision N`); append `**Resolved:**` line under each Fix block citing commit SHA + 1-line summary
4. PFn rows that are partial: append `**Partial:**` line documenting mitigation
5. PFn rows that are deferred: append `**Deferred:**` line explaining why and when to revisit
6. `<details>` Source files: bump SHAs (`git hash-object <path>`)
7. `<details>` Revision history: append new entry summarizing what changed

In `pages/<slug>/plan.md`:
1. Front-matter: status flip (e.g. "audit complete" → "shipped, fully wired")
2. §1 Summary table: refresh WIRED/PARTIAL/HARDCODED counts
3. §2 Blocking Q-numbers table: flip status cells to ✅ where resolved
4. §5 Fix Log: fill in commit SHA + status (Resolved/Partial/Deferred) + 1-line note for each PFn row

**Step E — INDEX + cross-page sync (~15 min)**
- `INDEX.md` (root): bump page-audit row revision; append new per-datapoint rows from Step B
- `pages/INDEX.md`: surface count adjustments for any newly-wired entities; re-run sort
- `pages/SUMMARY.md`: footer note documenting the update; only rerank if a major build-order shift
- `docs/PHASES.md`: add new sub-phase row with status ✅; update "Archived plan files"; update "Last updated" footer

**Outputs:**
- `audit.md` rev 2 (or whatever next number) with strikethroughs + resolved blocks + bumped SHAs
- `plan.md` status updated, Fix Log filled in
- 8-ish new per-datapoint audit reports
- Q-resolution blocks appended to `ref/05-open-questions.md`
- 4 indexes updated
- Archived plan: `Plan-Phase-<n>.<sub>-<slug>-Post-Wiring.md`

**Time:** ~2.5–3 hours total

**Out of scope this phase:** code changes, new entity work, fixing OTHER pages' findings.

---

## When to skip / collapse sub-phases

| Scenario | Sub-phase shape |
|---|---|
| Page already wired, just needs audit | Sub-phase 1 only. Skip 2 + 3. |
| New page, no Q-numbers blocking any fix | Sub-phase 1 + 2 + 3 — but 2 can run immediately after 1 |
| Audit found correctness bugs gated on stakeholder Q-numbers | Sub-phase 1 ships first (audit + Q-letter filings). Sub-phase 2 + 3 wait for resolution. |
| Wiring scope is small (1–2 PFn, no Q-numbers) | Property-tab pattern still works — bundle 2 + 3 in one plan with Step C audit batch |
| Re-audit (surfaces changed on already-audited route) | Re-run sub-phase 1; revision bumps to N+1; cite prior revisions in §Revision history |
| Audit-only finding (no fix possible until backend migration) | Sub-phase 1 ends with `**Deferred:**` line citing the gating phase. Sub-phase 2 + 3 deferred to that phase. |

---

## Naming conventions

**Plan archive files** — `.claude/data-audit/docs/plans/Plan-Phase-<n>.<sub>-<slug>-<kind>.md`
- `<n>.<sub>` — major.minor (e.g. `8.1`, `8.2`, `6.9`); minor optional for unique major phases
- `<slug>` — page slug, kebab-case (e.g. `Analytics`, `Rental-Dashboard`, `Property-Id-Overview`)
- `<kind>` — one of `audit` / `Wiring` / `Post-Wiring` (case as shown — sub-phase 1 lowercase, sub-phases 2 + 3 PascalCase by historical convention)

Examples in archive:
- `Plan-Phase-6.1-Lease-Tenant-wiring.md` (older single-phase wiring; pre-three-phase split)
- `Plan-Phase-8.1-Analytics-audit.md` (sub-phase 1)
- `Plan-Phase-8.1-Analytics-Wiring.md` (sub-phase 2)
- `Plan-Phase-8.1-Analytics-Post-Wiring.md` (sub-phase 3)
- `Plan-Phase-8.2-Rental-Dashboard-audit.md` (sub-phase 1, Rental Dashboard slug)

**Page slug** — `pages/<slug>/` directory:
- Pure routes: `pages/portfolio/`, `pages/analytics/`, `pages/profile/`
- Property tabs: `pages/property-id-overview/` (NOT `pages/property/[id]/overview/` — slugs are flat, no special chars)
- Top-level routes that collide with property-tab slugs: distinguish (`pages/rental-dashboard/` vs `pages/property-id-rental/`)

**Per-datapoint audits** — `<slug>--<metric-slug>.md` at `data-audit/` root
- Examples: `analytics--noi-kpi.md`, `analytics--revenue-chart.md`, `analytics--expense-breakdown.md`
- Bundled lite reports: `<slug>--<group>-direct-reads.md` (e.g. `analytics--kpi-strip-direct-reads.md`)

**Q-number letters** — append next free letter under the right section in `ref/05-open-questions.md`
- Q1 = UX scope / page intent
- Q2 = copy / labels / microcopy
- Q3 = KPI definitions / formulas
- Q4 = entity / schema design
- Q5 = data semantics / field meanings

---

## Cross-references (always read alongside)

- `.claude/data-audit/CLAUDE.md` — folder structure, fix-recording protocol
- `.claude/data-audit/WIRING-PLAYBOOK.md` — sub-phase 2 self-review rules + sub-phase 3 Step B bundling rules
- `.claude/data-audit/docs/PHASES.md` — master journey tracker; sub-phase status updates here
- `.claude/data-audit/pages/SUMMARY.md` — committed entity build order; rerank trigger
- `.claude/skills/audit-page-datapoints/SKILL.md` — sub-phase 1 driver
- `.claude/skills/audit-datapoint/SKILL.md` — sub-phase 3 Step B driver

---

## Worked example: Phase 8.1 (`/analytics`)

| Sub-phase | When | Outputs | Time |
|---|---|---|---|
| 8.1-audit | 2026-05-06 morning | `pages/analytics/{audit.md, plan.md}`; 5 Q-letters filed (Q1.F, Q3.K, Q3.L, Q4.S, Q5.U) | ~2h |
| Q-resolution gate | 2026-05-06 same-day | Q3.K + Q3.L resolved (option c); Q1.F + Q4.S + Q5.U pending | (async) |
| 8.1-Wiring | 2026-05-06 afternoon | Code changes in 4 files: `analytics/page.tsx`, `queries.ts`, `_components/AnalyticsPage.tsx`, `derivations/analytics.ts` | ~3h |
| 8.1-Post-Wiring | (next session) | `audit.md` rev 2; `plan.md` status flipped; 8 per-datapoint audit reports; Q1.F/Q4.S/Q5.U Resolved blocks; Q3.K/Q3.L addendum; Q4.I deferred; INDEX/SUMMARY/PHASES synced | ~2.5h |

Total Phase 8.1 from "never audited" to "fully recorded": ~7.5 hours of agent work spread across 2 sessions, with the Q-resolution gate amortized across them.
