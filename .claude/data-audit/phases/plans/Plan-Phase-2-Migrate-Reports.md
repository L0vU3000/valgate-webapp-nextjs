# Plan — Phase 2: Migrate existing report + update downstream references

## Context

The existing page audit at `.claude/data-audit/pages/property-id-overview.md` (1 file, 24-row inventory + 4 PFn + 6-entity backlog + audit roadmap) was produced **before** the audit/plan split was decided. Once Phase 1 lands the new skill template, this single report is in the old format and needs to be reshaped into the new folder structure to keep the corpus consistent.

This is a **mechanical reformat plus four small reference updates** — no new content, no re-analysis, no SHA changes (the source files haven't moved). The migration is the bridge that makes Phase 3 (master `pages/INDEX.md` seeded from this report) and Phase 4 (run 7 new audits in the new format) possible without inconsistency.

The intended outcome: after Phase 2, every page-level audit on disk follows the folder + audit/plan convention, and every link/citation pointing at a page audit resolves to a real file.

## Prerequisite

Phase 1 must be complete. Specifically, `.claude/skills/audit-page-datapoints/SKILL.md` must already describe the folder + `audit.md` + `plan.md` output structure, including the section-split table. Phase 2 follows that table verbatim — no design decisions are made in this phase.

## Scope of this change

**Seven files touched** (all under `.claude/`; no source code or seed JSON changes):

1. **CREATE** `.claude/data-audit/pages/property-id-overview/audit.md` — analysis sections from the existing report
2. **CREATE** `.claude/data-audit/pages/property-id-overview/plan.md` — action sections from the existing report
3. **DELETE** `.claude/data-audit/pages/property-id-overview.md` — old single file
4. **EDIT** `.claude/data-audit/INDEX.md:29` — update the page-level audits row (path)
5. **EDIT** `.claude/data-audit/property-id-overview--rental-status.md:17` — update the TL;DR back-link to point at `pages/property-id-overview/audit.md`
6. **EDIT** `.claude/skills/audit-datapoint/SKILL.md` — update 4 references to `pages/<route-slug>.md` (lines 102, 104, 106, 297) so they point at `pages/<route-slug>/audit.md`
7. **EDIT** `.claude/data-audit/CLAUDE.md:14` — update the structure tree to show `pages/<slug>/audit.md` + `pages/<slug>/plan.md`

## Migration mechanics — section split

Source: `.claude/data-audit/pages/property-id-overview.md` (~360 lines).

Apply the section-split table that Phase 1's skill update established. Concretely:

### `audit.md` gets

- Front-matter (slug, route, revision: 1, date, verdict — same as today)
- Cross-link line at top: `_See [plan.md](./plan.md) for the action items derived from this audit._`
- TL;DR (3 bullets — current ones reflect inventory + entity backlog, both belong here)
- Contents table (trimmed to the sections audit.md owns: Surface Inventory, Page-wide findings, source SHAs)
- Glossary
- §1 Surface Inventory (24 rows, unchanged)
- §2 Page-wide findings (PF1–PF4, unchanged including the verification-driven PF1 correction)
- 🔍 Source files & hashes `<details>` (6 source paths + SHAs, unchanged)
- 📋 Manual verification commands `<details>` (unchanged)
- 📜 Revision history `<details>` — keep the existing Revision 1 entry, append:
  > Revision 2 — `<date>`: structural reformat. Split into audit.md + plan.md per skill update; no source SHA changes.

### `plan.md` gets

- Front-matter (same slug, route, revision: 1, date, verdict — though plan.md's verdict will diverge from audit.md's over time as work lands)
- Cross-link line at top: `_See [audit.md](./audit.md) for the underlying analysis._`
- Contents table (trimmed to the sections plan.md owns: Entity Backlog, Audit Roadmap, Fix Log, recommended next moves)
- §3 Entity Backlog (6 entities — Lease, Tenant, PropertyValuation, Payment+Expense, RentalEvent, Notification+MaintenanceItem)
- §4 Audit Roadmap (16 rows + legend + recommended next moves list)
- §5 Fix Log (empty per current state)
- 📜 Revision history `<details>` — start fresh:
  > Revision 1 — `<date>`: extracted action items from initial audit. No fixes applied yet.

### Cross-references inside the migrated content

- The original file has internal references like "see PF1" — after the split, PF1 lives in `audit.md`. References from `plan.md` to PFn should read `see PF1 in audit.md`. References inside `audit.md` that point at PFn entries in the same file stay as-is.
- The original file has cross-links to external audits using `../` (e.g. `[property-id-overview--rental-status](../property-id-overview--rental-status.md)`). The folder change adds one level of nesting, so all `../` becomes `../../`. Update each occurrence.

## Downstream reference updates

### `.claude/data-audit/INDEX.md:29`

Current:
```
| [property-id-overview](pages/property-id-overview.md) | /property/[id]/overview | 5 | 10 | 4 | ⚠️ 10 hardcoded — top entity to land: Lease | 1 |
```

Updated:
```
| [property-id-overview](pages/property-id-overview/audit.md) | /property/[id]/overview | 5 | 10 | 4 | ⚠️ 10 hardcoded — top entity to land: Lease | 1 |
```

(Link points at `audit.md` because that's where the verdict counts originate. `plan.md` is one click away via the cross-link header.)

### `.claude/data-audit/property-id-overview--rental-status.md:17`

Current:
```
- 📄 Page audit: see [pages/property-id-overview.md](pages/property-id-overview.md)
```

Updated:
```
- 📄 Page audit: see [pages/property-id-overview/audit.md](pages/property-id-overview/audit.md) (and [plan.md](pages/property-id-overview/plan.md) for the action items)
```

### `.claude/skills/audit-datapoint/SKILL.md` (4 references)

- **Line 102** — change `pages/<route-slug>.md` → `pages/<route-slug>/audit.md` in the precheck description.
- **Line 104** — change `Page-wide: see PF<n> in pages/<route-slug>.md` → `Page-wide: see PF<n> in pages/<route-slug>/audit.md`.
- **Line 106** — change `[pages/<route-slug>.md](pages/<route-slug>.md)` → `[pages/<route-slug>/audit.md](pages/<route-slug>/audit.md)`.
- **Line 297** — change `(in .claude/data-audit/pages/<route-slug>.md)` → `(in .claude/data-audit/pages/<route-slug>/audit.md)`.

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
   - `audit.md` contains §1 Surface Inventory and §2 Page-wide findings; does NOT contain Entity Backlog or Audit Roadmap.
   - `plan.md` contains Entity Backlog, Audit Roadmap, Fix Log; does NOT contain Surface Inventory or PFn definitions (only references back to `audit.md`).
   - Both files share the same slug in front-matter.
   - Both files cross-link each other in their headers.
3. **Downstream links resolve:**
   - Click the link in `INDEX.md:29` — opens `audit.md` ✓
   - Click the back-link in `property-id-overview--rental-status.md` TL;DR — opens `audit.md` ✓
   - Grep `.claude/skills/audit-datapoint/SKILL.md` for `pages/<route-slug>.md` (without trailing `/audit.md`) — should be **zero** matches (all replaced).
4. **No source files touched:** `git status` should show only `.claude/` files modified. No `app/`, `lib/`, `components/`, or `public/` changes.
5. **Re-running `/audit-page-datapoints` against `/property/PROP-0001/overview` should detect no source SHA changes** — the source files haven't moved, only the report shape has. The skill should print "No source changes since revision N. Nothing to re-audit." This proves the migration was a pure reformat with no semantic drift.

## What unblocks after Phase 2

- **Phase 3** — create `.claude/data-audit/pages/INDEX.md` seeded with the entity-backlog rows from `pages/property-id-overview/plan.md`. The skill (post-Phase-1) already knows how to write to this file; Phase 3 is just the initial scaffolding + first row.
- **Phase 4** — safe to run the new skill against the next 7 routes, knowing the corpus is consistent and downstream references work.

## Time estimate

~10–15 minutes:
- Mechanical content split: ~5 min (the section-split table is unambiguous; just relocate blocks).
- Four downstream reference updates: ~5 min.
- Verification grep + click-through: ~3 min.

No exploration needed.
