# Plan — Build `/audit-page-datapoints` skill

## Context

Auditing data points one-at-a-time with `/audit-datapoint` has hit a redundancy wall: page-wide findings (e.g. "full `Property` shipped to a Client Component") get rediscovered across 5+ per-datapoint reports; §6 "Missing safeties" sections copy-paste verbatim across nearly every audit; ~half the audits are trivial direct-reads (`{property.name}`) that don't need a 9-section template; and most surfaces on pages like `/property/[id]/overview` are hardcoded mocks (12 of 15 in `PropertyOverviewPage.tsx:12-56`) — auditing fake data with the deep skill is wasted effort.

`/audit-page-datapoints` solves this by inverting the order of work: triage the whole page first (cheap), file shared findings once at the page level, classify each surface element, and recommend per-row whether subsequent `/audit-datapoint` runs should use a full or lite template — or be skipped entirely until the underlying entity is built. The existing `/audit-datapoint` skill's own SKILL.md already gestures at this gap: "Do not use this skill for whole-page audits — that is a separate, broader exercise."

The intended outcome: cut the per-page audit cost from ~15 hours of redundant deep-dives to ~5 hours of triage + entity work + batched audits, with no duplicated findings.

## Scope of this change

Three deliverables:

1. **New skill** at `.claude/skills/audit-page-datapoints/SKILL.md` (~600 lines) defining the page-triage workflow, surface inventory format, page-wide finding (PFn) convention, lite-template spec, schema-first batching, and re-audit detection.
2. **Three coupling edits** to existing files so `/audit-datapoint` and the audit corpus understand the new world: a precheck step, the lite template flag, and the `pages/` subfolder.
3. **One worked-example artifact** — the actual page audit for `/property/PROP-0001/overview` — written by running the new skill, to validate the format and prove the workflow.

## Files to create

### `.claude/skills/audit-page-datapoints/SKILL.md` (new skill, ~600 lines)

Frontmatter matches the existing convention:
```yaml
---
name: audit-page-datapoints
description: Triage every visible data point on a route in one pass. Classifies elements as WIRED/HARDCODED/PARTIAL/CHROME/DECORATIVE, files page-wide findings (PFn) once, groups missing entities, and recommends full-vs-lite template per row. Run BEFORE individual /audit-datapoint runs on a new page.
---
```

Sections:

- **§1 When to use** — first audit of any route; whenever a page gains/loses surfaces; before kicking off batched per-datapoint work.
- **§2 Surface classification** — five categories, with definitions and one citation each:
  - **WIRED** — value reaches DOM via prop chain from server data (e.g. `{property.status}` at `PropertyOverviewPage.tsx:158`).
  - **HARDCODED** — module-scope literal (e.g. `tenants`/`alerts`/`metrics` at `PropertyOverviewPage.tsx:12-56`).
  - **PARTIAL** — server-sourced value but adjacent meaning-bearing visual signal is hardcoded (e.g. badge text from `property.status` but emerald CSS regardless of value — see existing F2 in `property-id-overview--rental-status.md`).
  - **CHROME** — static labels/buttons/headings that aren't claims about user data ("Edit Profile", "View All").
  - **DECORATIVE** — icons, gradients, count-up animation, donut strokes, hero image — visual only, no data semantics. Without this category, the donut at `PropertyOverviewPage.tsx:261-276` would be miscategorized.
- **§3 How the skill walks a page** — read `app/(shell)/<route>/page.tsx` → its `_components/*.tsx` → AND any layout wrappers (`components/property/PropertyLayout.tsx` for property routes; analogous for other routes). Layout traversal is essential — without it, the property code badge and tab nav are invisible to the audit.
- **§4 Page-wide findings (PFn convention)** — number page-level findings as `PF1`, `PF2`. Per-datapoint reports cite as "see PF1 in `pages/<route-slug>.md`" instead of restating. Sort order preserved alphabetically (P after F). Use cases: "full entity to Client Component", "no `queries.ts` narrowing layer", "auth shim", "missing Zod at FS boundary" — each filed once per page.
- **§5 Lite template (4 sections)** — full spec lives here; `/audit-datapoint` defers to it.
  1. Snapshot (same as full §1)
  2. Entity link (cite `ref/00-entity-catalog.md` § + name the field; no verdict, no §2 issues exploration — those live at page level)
  3. Render (same as full §4 minus PII/IDOR — those become PFn)
  4. Findings (same as full §8)
  - **Omitted:** §2 entity issues, §3 formula (lite is direct-read by definition), §5 consistency, §6 missing safeties (page-level), §7 meaning, glossary, manual verification commands.
  - **Trigger:** "value is `entity.field` rendered verbatim or via a pure formatter (`formatCurrency`, `text-transform: uppercase`); no aggregation; no cross-card identity; no derivation file involvement." Any failure → use full.
- **§6 Schema-first batching** — dedicated section in the page report (not a callout), grouping HARDCODED rows by needed entity. Format:
  ```
  ### Entity needed: Lease
  Required by: tenants table (3 rows), Active Leaseholders, lease-expiring alert, Tenant Mix donut
  Catalog reference: ref/00 §<n>
  Status: not yet defined in lib/data/types/
  Land first, then audit: tenants-mix, active-leaseholders, lease-alerts as a batch (full template — "30 days remaining" is a derivation)
  ```
- **§7 Report template** — five sections in the produced markdown:
  1. Surface Inventory (the main table)
  2. Page-wide findings (PFn list)
  3. Entity backlog (HARDCODED rows grouped by needed entity)
  4. Audit roadmap (per WIRED/about-to-be-WIRED row: full vs lite template recommendation, cross-link if already done)
  5. Re-audit metadata (collapsible `<details>` with source SHAs — same convention as `/audit-datapoint` SKILL.md:131)
- **§8 Re-audit detection** — cross-reference to `/audit-datapoint`'s existing logic at SKILL.md:121-141 (don't restate; ~80 lines saved). Two added rules: (a) when a previously-HARDCODED row becomes WIRED, the row's audit recommendation flips to "ready for `/audit-datapoint`"; (b) when a new surface is added to the page, append it to the inventory and bump revision.
- **§9 Cross-linking back to existing per-datapoint audits** — on first run for a route, the skill must edit existing per-datapoint reports for that route to add a one-line "Page audit: see `pages/<route-slug>.md`" link in their TL;DR. This makes the cross-link bidirectional. Currently only `property-id-overview--rental-status.md` would need this.
- **§10 Slug & file path** — `.claude/data-audit/pages/<route-slug>.md`. `route-slug` follows the same rule as `/audit-datapoint` (path with leading slash dropped, `/` → `-`, lowercase). Examples: `/portfolio` → `pages/portfolio.md`; `/property/PROP-0001/overview` → `pages/property-id-overview.md`.
- **§11 Worked example** — point readers at the produced `.claude/data-audit/pages/property-id-overview.md` after first invocation.

## Files to edit

### `.claude/skills/audit-datapoint/SKILL.md`

Three additions (one short paragraph each, no rewrites):

1. **Precheck step in "How to resolve the input"** — after step 5 (entity identification), add: "Before writing, check `.claude/data-audit/pages/<route-slug>.md`. If it exists, read its Page-wide findings (PFn) and Audit roadmap row for this datapoint. Cite PFn instead of restating; honor the recommended template (full vs lite)."
2. **New section "Lite template"** (~10 lines) — defer the full spec to `audit-page-datapoints/SKILL.md`; just say: "If the page audit recommends lite, render only Snapshot / Entity link / Render / Findings. Omit §3, §5, §6, §7, glossary, and verification commands."
3. **§6 "Missing safeties" rule update** — "If a missing-safety gap is filed in the page-level audit's PFn list, cite the PF-number in the `Link` column instead of restating. Do not duplicate."

### `.claude/data-audit/CLAUDE.md`

Add a short subsection after "How to audit a data point":

- **"How to audit a whole page"** (~15 lines) — point at `/audit-page-datapoints`, explain when to use it (first time on a route, before per-datapoint work), document the `pages/` subfolder, document the `PFn` convention, and document the lite vs full template choice.
- Add `pages/` to the Structure tree at the top of the file.

### `.claude/data-audit/INDEX.md`

Add a second table at the bottom titled "Page-level audits", sorted by route, columns:

```
| Route | Wired | Hardcoded | PFn | Last revised |
|---|---|---|---|---|
```

The existing per-datapoint table stays unchanged.

## Verification

After implementation, validate end-to-end by running the new skill against the worked-example target:

1. **Invoke** `/audit-page-datapoints /property/PROP-0001/overview`. Expect a new file at `.claude/data-audit/pages/property-id-overview.md` with the 15-row inventory format proven by the design (4 WIRED, 1 PARTIAL, 7 HARDCODED, 1 CHROME, 2 DECORATIVE — see `PropertyOverviewPage.tsx:12-56` for the constants and `:131-456` for the JSX surfaces).
2. **Verify the cross-link mechanic**: confirm `property-id-overview--rental-status.md` was edited to add the back-link line in its TL;DR. The existing F1 (full Property to Client) and F2 (hardcoded emerald CSS) should now be referenced as PF1/PF2 in the page audit.
3. **Verify INDEX.md update**: the new "Page-level audits" table should have one row for `/property/[id]/overview`.
4. **Run a fresh `/audit-datapoint`** on a HARDCODED row that was upgraded to a real entity (e.g. once Lease lands, audit "Active Leaseholders monthly rent total"). Confirm the produced report cites PFn instead of re-filing the page-wide findings, and uses the full template (it's a derivation).
5. **Run a fresh `/audit-datapoint`** on a trivial WIRED row (e.g. `/property/PROP-0001/overview` → "Province"). Confirm the produced report uses the lite 4-section template.
6. **Re-run `/audit-page-datapoints`** with no source changes → should print "No source changes since revision N" and not modify the file or INDEX (mirrors `/audit-datapoint` behavior at SKILL.md:121-141).

## Critical files referenced

- `.claude/skills/audit-datapoint/SKILL.md` — pattern source for frontmatter, re-audit detection, slug convention; receives 3 small edits
- `.claude/data-audit/CLAUDE.md` — folder guide; receives `pages/` and `/audit-page-datapoints` documentation
- `.claude/data-audit/INDEX.md` — receives second table for page audits
- `.claude/data-audit/property-id-overview--rental-status.md` — first per-datapoint report to be back-linked; validates the cross-link mechanic
- `.claude/data-audit/ref/00-entity-catalog.md` — referenced by lite template's §2 Entity link
- `.claude/data-audit/ref/03-data-flow-and-derivations.md` — referenced by full template's canonical-home assignment (unchanged behavior)
- `.claude/data-audit/ref/05-open-questions.md` — same Q-number filing rules apply (unchanged behavior)
- `app/(shell)/property/[id]/page.tsx` + `app/(shell)/property/[id]/overview/page.tsx` — entry points the skill reads
- `app/(shell)/property/[id]/_components/PropertyOverviewPage.tsx` — worked-example target; 15 surfaces to classify
- `components/property/PropertyLayout.tsx` — must be walked too (layout wrapper); proves the multi-component traversal rule
- `lib/data/types/property.ts`, `lib/data/db/properties.ts`, `lib/data/properties.ts` — entity definition referenced by both templates

## Out of scope (deliberate)

- Auto-generating Zod schemas from inventory rows.
- Building the Lease/Tenant/Alert entities themselves — the skill identifies them as needed, but defining them is a separate workstream.
- Migrating the 14 existing portfolio audits to use PFn citations — they stay as-is; new findings on `/portfolio` get the new treatment.
- Adding visualization tooling beyond the markdown table.
