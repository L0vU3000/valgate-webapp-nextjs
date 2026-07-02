# Refactor Phase 3 — Component Decomposition (frontend)

**Goal:** break the 5 largest page components into focused pieces, kill the duplicated ownership page, and pull initial data fetches out of `useEffect` where the phase already touches the file.
**Risk:** Medium — UI regressions are visible, but you (the designer) can spot them fastest; verify with `/qa` + `/design-review` per page.
**Effort:** Large (2–3 days). This is the phase where your frontend expertise leads.

## Targets (in order)

### 1. `PropertyDocumentsPage.tsx` — 2,577 lines, 4+ useEffects
`app/(shell)/property/[id]/_components/PropertyDocumentsPage.tsx`
Extract along its natural seams:
- `DocumentListGrid` (list/grid + sort/filter state)
- `DocumentPreviewPane` (viewer + AI summary panel — this is the shipped Phase-2 AI summaries feature; behavior frozen)
- `DocumentUploadSection`
- `FolderSidebar` (rename/delete already shipped)
Move any initial-load `useEffect` fetch up into the server component/queries layer (Phase 2 gave you the service seams). Client components keep only interaction state.

### 2. `PropertyOwnershipPage.tsx` (1,408) vs `PropertyOwnershipPage2.tsx` (772)
**Decision needed.** `Plan-Ownership2-Redesign.md` exists in the archive — Page2 is likely the in-flight redesign, not accidental duplication.
- **Recommendation:** finish the migration to Page2 if the redesign is approved, then delete Page1; if the redesign stalled, delete Page2 and re-note the redesign as future work. Check which one the route actually renders before deciding.

### 3. `SuccessionPage.tsx` — 1,375 lines
`app/(shell)/estate-planning/_components/` — extract the visualization, the assignments table, and the activity feed into siblings.

### 4. `PropertyRentalPage.tsx` (1,245) and `PropertyOverviewPage.tsx` (1,226)
Same pattern: one component per visible section (rental terms, lease timeline, payments; overview hero, pillar stats, KPI cards). The Progress pillar math stays in its derivation function — components only render it.

### 5. Wizards — only if time allows
`OnboardClientWizard.tsx` (995), `Step4PhotosDocs.tsx` (961), `AddProfessionalWizard.tsx` (939): extract one file per step. Lower priority — wizards are naturally linear and less painful to read than the pages above.

## Rules
- Extract in place: new components live in the same `_components/` folder, props typed from the existing query return types — no new data fetching, no prop-drilling refactors.
- Visual output must be pixel-identical unless the Ownership decision says otherwise.
- No new `"use client"` boundaries above the leaf that needs them.

## Done when
- No component file over ~800 lines among the 5 targets.
- Exactly one PropertyOwnership page remains.
- tsc, lint, tests green; `/qa` pass on: documents page, ownership page, rental, overview, estate planning.
- `/design-review` on the touched pages reports no visual drift.
- `graphify update .` run after landing.

## Execution prompt (paste into Sonnet)
> Execute docs/plans/refactor-phase-3-component-decomposition.md, one target per commit. Ownership decision: [keep Page2 / keep Page1]. Extraction only — pixel-identical output, no data-flow changes except moving initial-load useEffect fetches to the server layer. After each target: tsc + lint + eyeball the page via /qa. Skip target 5 (wizards) if any earlier target overruns.
