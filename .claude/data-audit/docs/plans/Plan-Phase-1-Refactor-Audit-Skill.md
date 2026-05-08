# Plan — Phase 1: Refactor `audit-page-datapoints` skill output to folder + audit/plan split

## Context

The page-audit skill (`audit-page-datapoints`) currently produces **one large markdown file** per route at `.claude/data-audit/pages/<slug>.md`. That single file mixes two different concerns:

- **Analysis** (what's on the page, what's wrong with it): Surface Inventory + Page-wide findings (PFn). This part is mostly stable — it changes only when the page changes.
- **Action** (what we'll do, in what order, how it gets ticked off): Entity Backlog + Audit Roadmap + Fix Log + recommended next moves. This part evolves continuously as work gets done, entities ship, and rows get audited.

Mixing them means every fix-log update touches the same file as the inventory, the inventory's verdict counts drift each time the plan changes, and reviewing "what's the current state of work on this page" requires scrolling past inventory tables that haven't changed.

The user has decided to split this into a **folder per page** with two files: `audit.md` (analysis) and `plan.md` (action). Naming is short because the parent folder already disambiguates — same convention Next.js uses (`page.tsx`, `layout.tsx`, `loading.tsx`).

This Phase 1 plan covers ONLY the skill refactor. Subsequent phases (migration of the existing `property-id-overview.md`, creation of the master `pages/INDEX.md`, running the 7 new page audits) are deliberately out of scope here and will be separate workstreams.

## Scope of this change

**One file edited:** `.claude/skills/audit-page-datapoints/SKILL.md` (~600 lines today).

Five targeted section edits:

1. **§ "Slug & file path" (line 222)** — change output path from `pages/<slug>.md` to `pages/<slug>/audit.md` + `pages/<slug>/plan.md`. Document the folder convention (slug rules unchanged; folder name = slug).
2. **§ "Report template" (line 276)** — split the single template into TWO templates. Define which sections live in `audit.md` vs `plan.md`. Both files share a slim front-matter; cross-link each other in their headers.
3. **§ "Re-audit detection" (line 243)** — handle two files. SHAs of source files live in `audit.md` (not `plan.md`, because `plan.md` evolves from work, not from source changes). When source SHAs change, refresh `audit.md`'s sections; `plan.md` updates separately when work lands.
4. **§ "How the skill walks a page" (line 105)** — add a final step: after writing both files, update `.claude/data-audit/pages/INDEX.md` (master entity backlog roll-up — the file itself is created in Phase 3, but the skill should write to it idempotently from Phase 1 onward).
5. **§ "INDEX.md format" (line 432)** — clarify there are now TWO INDEX files: the existing `.claude/data-audit/INDEX.md` (per-datapoint + page-level table) and the new `.claude/data-audit/pages/INDEX.md` (cross-page entity backlog). Document both.

Plus minor updates: §11 Worked example (point at the new folder structure), Verbosity & tone (front-matter is now in two files, add a one-line cross-link rule).

### Section split — what goes where

| Section | Destination | Reasoning |
|---|---|---|
| Front-matter (slug, route, revision, date, verdict) | **both files** | Each file is independently versioned but shares the slug |
| TL;DR | **audit.md** | Summary of what was found |
| Contents table | **each file** has its own | Different files have different sections |
| Glossary | **audit.md** only | Plan can cite back |
| §1 Surface Inventory | **audit.md** | Stable; reflects code state |
| §2 Page-wide findings (PFn) | **audit.md** | Stable; refilled on re-audit when source changes |
| §3 Entity Backlog | **plan.md** | Action — evolves as entities land |
| §4 Audit Roadmap | **plan.md** | Action — evolves as audits get ticked off |
| §5 Fix Log | **plan.md** | Action — appended to as fixes ship |
| Recommended next moves (currently §4 footer) | **plan.md** | Action — re-prioritised over time |
| 🔍 Source files & hashes (collapsible) | **audit.md** | Drives re-audit detection |
| 📋 Manual verification commands (collapsible) | **audit.md** | Tied to source state |
| 🔧 Metric Definition SSOT YAML (collapsible) | **audit.md** | Tied to source state |
| 📜 Revision history (collapsible) | **each file** has its own | Audit revisions track source changes; plan revisions track work progress |

### Cross-links between the two files

`audit.md` opens with: `_See [plan.md](./plan.md) for the action items derived from this audit._`
`plan.md` opens with: `_See [audit.md](./audit.md) for the underlying analysis._`

## Files to modify

- `.claude/skills/audit-page-datapoints/SKILL.md` — the only file edited in Phase 1

## Files NOT modified in this phase (deliberate)

- `.claude/data-audit/pages/property-id-overview.md` — migration to the new folder is **Phase 2**
- `.claude/data-audit/pages/INDEX.md` — creation is **Phase 3** (the skill will know how to write it once it exists)
- `.claude/data-audit/INDEX.md` — row update happens in Phase 2 (when the migrated file moves)
- `.claude/data-audit/property-id-overview--rental-status.md` — back-link path update happens in Phase 2
- `.claude/data-audit/CLAUDE.md` — structure-tree update happens in Phase 2 (when the new folder shape exists on disk)
- `.claude/skills/audit-datapoint/SKILL.md` — its precheck step references `pages/<slug>.md` which becomes `pages/<slug>/audit.md`; this update is bundled into Phase 2 (migration phase) so the path change lands together with the file move

## Verification

After the skill edit lands, verify by reading top-to-bottom:

1. **Open `.claude/skills/audit-page-datapoints/SKILL.md`** and check the five touched sections each describe the new shape:
   - "Slug & file path" describes a folder per page with `audit.md` + `plan.md`
   - "Report template" defines two distinct templates
   - "Re-audit detection" handles two files independently
   - "How the skill walks a page" ends with the `pages/INDEX.md` update step
   - "INDEX.md format" describes both INDEX files
2. **Sanity-check internal references.** Grep the file for `pages/<slug>.md` — should be zero hits (all replaced with the folder form). Grep for `audit.md` and `plan.md` — should appear in the new template sections, the slug section, and the worked example.
3. **Cross-link rule appears.** Grep for `See [plan.md]` and `See [audit.md]` — should each appear at least once in the report-template section.
4. **No production-code or seed file is touched.** Confirm `git status` after the edit shows only `.claude/skills/audit-page-datapoints/SKILL.md` modified, plus the plan file itself.

If all four checks pass, Phase 1 is complete and Phase 2 (migrating the existing `property-id-overview.md` into the new folder structure) becomes unblocked.

## Time estimate

~10–15 minutes of focused editing. No new code, no new tests, no exploration needed — five surgical section edits in one well-known file.

## What unblocks after Phase 1

- **Phase 2** — migrate existing `pages/property-id-overview.md` into `pages/property-id-overview/audit.md` + `plan.md`; update all downstream path references (covered in detail below).
- **Phase 3** — create the master `pages/INDEX.md` (cross-page entity roll-up) seeded with the migrated overview's entity contributions.
- **Phase 4** — run the new skill against 7 routes to produce 7 new folders × 2 files each.
- **Phase 5** — summary back to the user.

---

# Plan — Phase 2: Migrate existing report + update downstream references

## Context

The existing page audit at `.claude/data-audit/pages/property-id-overview.md` (1 file, 24-row inventory + 4 PFn + 6-entity backlog + audit roadmap) was produced **before** the audit/plan split was decided. Once Phase 1 lands the new skill template, this single report is in the old format and needs to be reshaped into the new folder structure to keep the corpus consistent.

This is a **mechanical reformat plus four small reference updates** — no new content, no re-analysis, no SHA changes (the source files haven't moved). The migration is the bridge that makes Phase 3 (master `pages/INDEX.md` seeded from this report) and Phase 4 (run 7 new audits in the new format) possible without inconsistency.

The intended outcome: after Phase 2, every page-level audit on disk follows the folder + audit/plan convention, and every link/citation pointing at a page audit resolves to a real file.

## Scope of this change

**Six files touched:**

1. **CREATE** `.claude/data-audit/pages/property-id-overview/audit.md` — analysis sections from the existing report
2. **CREATE** `.claude/data-audit/pages/property-id-overview/plan.md` — action sections from the existing report
3. **DELETE** `.claude/data-audit/pages/property-id-overview.md` — old single file
4. **EDIT** `.claude/data-audit/INDEX.md` — update the page-level audits row (path)
5. **EDIT** `.claude/data-audit/property-id-overview--rental-status.md` — update the TL;DR back-link to point at `pages/property-id-overview/audit.md`
6. **EDIT** `.claude/skills/audit-datapoint/SKILL.md` — update 4 references to `pages/<route-slug>.md` (lines 102, 104, 106, 297) so they point at `pages/<route-slug>/audit.md` (and `plan.md` where appropriate)
7. **EDIT** `.claude/data-audit/CLAUDE.md:14` — update the structure tree to show `pages/<slug>/audit.md` + `pages/<slug>/plan.md`

(That's 7 files counting the structure-tree edit, but file #4 and #5 are tiny path swaps.)

## Migration mechanics — section split

Source: `.claude/data-audit/pages/property-id-overview.md` (currently lives in this repo, ~360 lines).

Apply the section-split table from Phase 1 verbatim. Concretely:

### `audit.md` gets

- Front-matter (slug, route, revision: 1, date, verdict — same as today)
- Cross-link line: `_See [plan.md](./plan.md) for the action items derived from this audit._`
- TL;DR (3 bullets — current ones reflect inventory + entity backlog, both belong here)
- Contents table (trimmed to only the sections audit.md owns: Surface Inventory, Page-wide findings, source SHAs)
- Glossary
- §1 Surface Inventory (24 rows, unchanged)
- §2 Page-wide findings (PF1–PF4, unchanged including the verification-driven PF1 correction)
- 🔍 Source files & hashes `<details>` (6 source paths + SHAs, unchanged)
- 📋 Manual verification commands `<details>` (unchanged)
- 📜 Revision history `<details>` — keep the existing Revision 1 entry as-is, append a Revision 2 line: `Revision 2 — <date>: structural reformat. Split into audit.md + plan.md per skill update; no source SHA changes.`

### `plan.md` gets

- Front-matter (same slug, route, revision: 1, date, verdict — though plan.md's verdict will diverge from audit.md's over time as work lands)
- Cross-link line: `_See [audit.md](./audit.md) for the underlying analysis._`
- Contents table (trimmed to the sections plan.md owns: Entity Backlog, Audit Roadmap, Fix Log, recommended next moves)
- §3 Entity Backlog (6 entities — Lease, Tenant, PropertyValuation, Payment+Expense, RentalEvent, Notification+MaintenanceItem)
- §4 Audit Roadmap (16 rows + legend + recommended next moves list)
- §5 Fix Log (empty per current state)
- 📜 Revision history `<details>` — start fresh: `Revision 1 — <date>: extracted action items from initial audit. No fixes applied yet.`

### Cross-references inside the migrated content

The original file has internal references like "see PF1" — after the split, PF1 lives in `audit.md`. References from `plan.md` to PFn should read `see PF1 in audit.md`. Internal references inside `audit.md` that point at PFn entries in the same file stay as-is.

The original file has cross-links to external audits (e.g. `[property-id-overview--rental-status](../property-id-overview--rental-status.md)` in the Audit Roadmap row 3). Those paths shift by one directory level — the folder change adds one level of nesting, so `../` becomes `../../`. Update accordingly: `[property-id-overview--rental-status](../../property-id-overview--rental-status.md)`.

## Downstream reference updates

### `.claude/data-audit/INDEX.md:29`

Current row:
```
| [property-id-overview](pages/property-id-overview.md) | /property/[id]/overview | 5 | 10 | 4 | ⚠️ 10 hardcoded — top entity to land: Lease | 1 |
```

Updated row:
```
| [property-id-overview](pages/property-id-overview/audit.md) | /property/[id]/overview | 5 | 10 | 4 | ⚠️ 10 hardcoded — top entity to land: Lease | 1 |
```

(Link points at `audit.md` — that's where the verdict counts originate. `plan.md` is one click away from there via the cross-link header.)

### `.claude/data-audit/property-id-overview--rental-status.md:17`

Current line:
```
- 📄 Page audit: see [pages/property-id-overview.md](pages/property-id-overview.md)
```

Updated line:
```
- 📄 Page audit: see [pages/property-id-overview/audit.md](pages/property-id-overview/audit.md) (and [plan.md](pages/property-id-overview/plan.md) for the action items)
```

### `.claude/skills/audit-datapoint/SKILL.md` (4 references)

- **Line 102** — change `pages/<route-slug>.md` to `pages/<route-slug>/audit.md` in the precheck description.
- **Line 104** — change `Page-wide: see PF<n> in pages/<route-slug>.md` to `Page-wide: see PF<n> in pages/<route-slug>/audit.md`.
- **Line 106** — change the back-link template `[pages/<route-slug>.md](pages/<route-slug>.md)` to `[pages/<route-slug>/audit.md](pages/<route-slug>/audit.md)`.
- **Line 297** — change `(in .claude/data-audit/pages/<route-slug>.md)` to `(in .claude/data-audit/pages/<route-slug>/audit.md)`.

### `.claude/data-audit/CLAUDE.md:14`

Current line in the structure tree:
```
  pages/<slug>.md    ← page-level inventory reports (e.g. pages/property-id-overview.md)
```

Updated:
```
  pages/<slug>/      ← per-page folder
    audit.md         ← analysis (Surface Inventory + Page-wide findings + source SHAs)
    plan.md          ← action (Entity Backlog + Audit Roadmap + Fix Log)
  pages/INDEX.md     ← master cross-page entity backlog (created in Phase 3)
```

## Verification

After Phase 2 lands:

1. **Files exist where expected:**
   - `.claude/data-audit/pages/property-id-overview/audit.md` exists
   - `.claude/data-audit/pages/property-id-overview/plan.md` exists
   - `.claude/data-audit/pages/property-id-overview.md` does NOT exist (deleted)
2. **Content split is correct:**
   - `audit.md` contains §1 Surface Inventory and §2 Page-wide findings; does NOT contain Entity Backlog or Audit Roadmap
   - `plan.md` contains Entity Backlog, Audit Roadmap, Fix Log; does NOT contain Surface Inventory or PFn definitions (only references)
   - Both files share the same slug in front-matter
   - Both files cross-link each other in their headers
3. **Downstream links resolve:**
   - Click the link in `INDEX.md:29` — opens `audit.md` ✓
   - Click the back-link in `property-id-overview--rental-status.md` TL;DR — opens `audit.md` ✓
   - Grep `.claude/skills/audit-datapoint/SKILL.md` for `pages/<route-slug>.md` — should be **zero** matches (all replaced)
4. **No source files touched:** `git status` should show only `.claude/` files modified. No `app/`, `lib/`, `components/`, or `public/` changes.
5. **Re-running `/audit-page-datapoints` against `/property/PROP-0001/overview` should detect no source SHA changes** — the source files haven't moved, only the report shape has. The skill should print "No source changes since revision N. Nothing to re-audit." This proves the migration was a pure reformat with no semantic drift.

## What unblocks after Phase 2

- **Phase 3** — create `.claude/data-audit/pages/INDEX.md` seeded with the entity-backlog rows from `pages/property-id-overview/plan.md`. The skill (post-Phase-1) already knows how to write to this file; Phase 3 is just the initial scaffolding + first row.
- **Phase 4** — safe to run the new skill against the next 7 routes, knowing the corpus is consistent and downstream references work.

## Time estimate

~10–15 minutes:
- Mechanical content split: ~5 min (the section-split table is unambiguous; just relocate blocks)
- Four downstream reference updates: ~5 min
- Verification grep + click-through: ~3 min

No exploration needed beyond what's already been done in this session.
