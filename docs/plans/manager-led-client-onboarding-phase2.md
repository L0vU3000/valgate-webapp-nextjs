# Manager-led client onboarding — Phase 2: Rich property population

- **Status:** **P0 shipped (2026-06-29)** — the draft→property file seam is fixed and org-aware. P1/P2 pending.
- **Visual plan:** `plan-5f2dec9315c9422e` — [hosted](https://plan.agent-native.com/plans/plan-5f2dec9315c9422e) (status: in_progress)
- **Produced with:** `/impeccable shape` + Mobbin reference research
- **Design context:** `.impeccable.md` → "Valgate Professional" section
- **Predecessors:** [Phase 1](./manager-led-client-onboarding-phase1.md) (wizard + handoffs, shipped), [Phase 3](./manager-led-client-onboarding-phase3.md) (lifecycle, partial)

> **Framing — this is NOT greenfield.** Phase 2 is ~60% built as uncommitted WIP
> (`AddPropertyFlowPro`, `BulkAssignModal`, `CsvImportModal`, `PortfolioSelectorModal`,
> and the full `app/_shared/add-property/` step set). The work is **reconciliation,
> fixing one broken seam, closing two dead-ends, and a polish pass** — not new scaffolding.

---

## Locked decisions

| # | Decision | Choice |
|---|---|---|
| **D1** | Where rich population lives | **Separate from onboarding.** Onboarding keeps lightweight stubs (Phase 1); the full 5-step wizard runs against an already-created portfolio from the Properties page. |
| **D2** | "Create new client" inside the property flow | **Nested inline.** Open `OnboardClientWizard` as a nested step, then resume the property wizard with the new portfolio pre-selected. No navigation, no lost work. |
| **D3** | "Save as draft" persistence | **Same-session only.** Wire the existing `draftId`/S3 backend so progress holds while the wizard is open. Cross-session "Drafts inbox" is deferred to Phase 3. |
| **D4** | CSV duplicates & partial failures | **Import valid, skip+report the rest.** Dedupe = skip by name with a "create anyway" toggle. No all-or-nothing rollback. |

---

## 1. Feature summary

Give asset managers a fast, trustworthy way to populate a client's portfolio with real
properties — one at a time through a rich wizard (photos, documents, financials, location),
in bulk via CSV, or by re-assigning existing unassigned properties. The machinery exists;
Phase 2 makes it **actually persist files**, removes two dead-ends, and lifts the visual bar
to the Zillow/Airbnb standard.

## 2. Primary user action

**"Add a real, complete property to this client's portfolio — including its photos and
documents — and trust that it saved."** Today the wizard creates the property row but
silently drops every uploaded file. Fixing that single seam is the heart of Phase 2.

## 3. Design direction

Express the **Valgate Professional** language (`.impeccable.md`): light mode, blue precious,
borders over shadows, hierarchy over decoration, dense-but-calm. The wizard is a focused
modal — the manager is *doing one thing*, so the surrounding cockpit recedes.

Two references set the bar (both desktop web):
- **Zillow Rental Manager** ([adding a listing](https://mobbin.com/flows/1094e4a3-c06f-442b-b079-3689c8a92808), [adding photos](https://mobbin.com/flows/a3ca8c3e-6087-458d-9a6a-7b0860921375)) — a **labeled step rail with checkmarks**, a **right-side contextual helper card** per step, and a **drag-to-reorder photo grid** with an "Add" tile. This is the structure to adopt.
- **Airbnb** ([uploading photos](https://mobbin.com/flows/3f788b1b-ee86-400c-9f5f-8e2cbe393916)) — an **upload-progress overlay** ("3 of 8 uploaded", per-item spinner → check) and a **cover-photo badge** on review. This is the feedback to adopt.

What to **avoid** (anti-references from `.impeccable.md`): hero-metric gradient headers,
side-stripe accents, icon-in-box section headers. The property *content* is the hero.

## 4. Layout strategy

**Add-property wizard (`AddPropertyFlowPro`)** — widen from a plain top progress bar to a
two-column modal body:
- **Left rail (~180px):** vertical labeled step list with checkmark / active-dot / pending states (Type · Basics · Financial · Photos & docs · Review). Replaces the current thin bar — gives the manager a sense of "how much is left" that a percentage can't.
- **Main column:** the active step's fields, generous vertical rhythm (vary spacing — don't pad everything equally).
- **Helper slot (top-right of main, not a third column):** one-line contextual hint per step ("Photos help your client recognize the property at a glance"). Restrained, secondary-text color.

**CSV import (`CsvImportModal`)** — adopt the canonical four-stage rail from
[Attio](https://mobbin.com/flows/2c5ec636-6d46-416e-b798-ae09d51881c3) /
[folk](https://mobbin.com/flows/2f2bb6d1-b0f1-4425-9708-177ab9ee886c) /
[Dovetail](https://mobbin.com/flows/53e90827-7a72-4ac8-ad0d-e2b7545d5c68):
**Upload → Map columns → Review → Import.** A right-side **data-preview** column during
mapping; **invalid-row filter chips** ("All 200 · Valid 198 · Skipped 2") on review.

**Portfolio selector** — keep the compact list; the "Create new client" row becomes a
real entry point (D2), not a navigation away.

## 5. Key states

| Surface | States to design |
|---|---|
| **Portfolio selector** | default (clients list), empty (no clients yet → "Create new client" is the only CTA), "Create new" → nested onboarding |
| **Wizard — Photos & docs** | empty drop-zone, **uploading** (per-file spinner → check, "N of M uploaded"), uploaded thumbnail grid (drag-to-reorder, cover badge on first), upload error (file too big / wrong type — inline, keep others), HEIC-converting |
| **Wizard — submit** | submitting (creating property → attaching files), success ("{name} added to {portfolio}"), partial success ("Property created, but 2 photos failed — retry"), error |
| **Save as draft (D3)** | idle, saved-just-now (subtle "Draft saved" affordance), restored-on-reopen banner |
| **CSV — review** | all-valid, some-skipped (chips + per-row reason), all-invalid (block with guidance), duplicates-found (dedupe choice surfaced) |
| **CSV — import** | progress ("importing 198…"), done ("198 added · 2 skipped — view report"), failure |

## 6. Interaction model

**The critical fix — draft → property file seam (D3):**
1. On wizard open (or Step 1 → 2), call `upsertPropertyDraftAction()` and store the returned `DRFT-…` id in state. This unblocks `Step4PhotosDocs` (which gates uploads on a non-null `draftId`).
2. Photo/doc uploads stage to S3 against the draft (already wired) with the Airbnb-style progress overlay.
3. On submit: create the property (`createPropertyForOrg(targetOrgId, …)`), then **call `convertDraftToDocumentsAction(draftId, propertyId)`** to move staged files onto the real property. *This call is the missing line that makes Phase 2 real.*
4. Wire `onSaveDraft` to persist current form state into the draft (same-session resume); remove the no-op.

**Create-new-client round-trip (D2):** in `PortfolioSelectorModal`, "Create new client"
opens `OnboardClientWizard` nested. On its success, capture the returned `orgId`, set it as
the property wizard's `targetOrgId`, and advance into the property wizard — no route change.

**CSV (D4):** after mapping, validate client-side → show review with valid/skipped chips and
a dedupe choice (skip-by-name default, "create anyway" toggle). Import sends only valid rows;
the action returns `{ created, skipped[] }`; show a short report. Make `importCsvProperties`
**not** fail the batch on a single bad row.

**Bulk assign:** already works — leave it; only restyle for consistency with the new chips.

## 7. Content requirements

- Step rail labels: `Type · Basics · Financial · Photos & docs · Review`
- Helper hints (one per step), specific not vague (principle 8): e.g. Photos → "Photos help your client recognize the property at a glance."
- Upload progress: `{n} of {m} uploaded` · errors: `"{file} is over 10 MB"`, `"{file} isn't a supported type"`
- Success: `"{propertyName} added to {portfolioName}"` (name the portfolio — managers juggle many)
- Draft: `"Draft saved"` / on reopen `"Picked up where you left off"`
- CSV review chips: `All {n}` · `Valid {n}` · `Skipped {n}` · per skipped row: `"Row {i}: duplicate of an existing property"` / `"Row {i}: missing name"`
- CSV confirm: `"{n} properties will be added to {portfolio}"` · result: `"{n} added · {k} skipped"`
- Empty selector: `"No clients yet"` + `"Create new client"` (no filler)

## 8. Recommended impeccable references for build

- `interaction-design.md` — form-heavy wizard, upload feedback, validation timing
- `motion-design.md` — upload spinner→check, step transitions, success (state-only motion per principle 5)
- `spatial-design.md` — the two-column rail layout + vertical rhythm
- `state-design.md` — the upload/partial-success/skipped-row matrix above

## 9. Build worklist (file-level, for eng handoff)

**P0 — the broken seam — ✅ DONE (2026-06-29):**

Implementation surfaced that the seam needed an **org-aware** convert path (the plan's
"two missing calls" understated it): `convertDraftToDocuments` inserts via `scopedInsert`
into `ctx.orgId` (the manager's org), but the Pro property lives in the client's
`targetOrgId` — so files would have been filed in the wrong org, invisible to the client.
Fix mirrors the `createProperty` → `createPropertyForOrg` precedent:

1. ✅ `lib/services/documents.ts` — **NEW** `createDocumentForOrg(ctx, targetOrgId, input)` (`assertOrgAdmin` + `{ orgId: targetOrgId }` override).
2. ✅ `lib/services/property-drafts.ts` — **NEW** `convertDraftToDocumentsForOrg(ctx, draftId, propertyId, targetOrgId)`.
3. ✅ `app/actions/property-drafts.ts` — **NEW** `convertDraftToDocumentsForOrgAction`.
4. ✅ `app/(pro)/pro/_components/AddPropertyFlowPro.tsx` — init `draftId` on client-select; convert in **both** submit branches (ForOrg for `targetOrgId`, single-org for the FS-client path); real `onSaveDraft`; soft amber file-notice on success (non-fatal — re-submit would duplicate the property).

Verified: `tsc --noEmit` + `eslint` clean (the only remaining tsc errors are the pre-existing `PendingHandoffsSection.tsx` ones, untouched).

**P1 — close the dead-ends — ✅ DONE (2026-06-29):**
3. ✅ `AddPropertyFlowPro.tsx` + `OnboardClientWizard.tsx` + `actions.ts` — nested `OnboardClientWizard` (new `onComplete` prop); `onboardClientPortfolioAction` now returns `orgId`; `handleNestedWizardComplete` sets `targetOrgId`, reopens the property wizard, and re-inits the draft (D2).
4. ✅ `app/(pro)/pro/actions.ts` `importCsvProperties` + `lib/services/properties.ts` — returns `{ count, skipped[] }`; per-row try/catch (skip-don't-fail); dedupe-by-name via new org-scoped `listPropertyNamesByClientId` (no N+1) + `createAnyway` toggle (D4).
5. ✅ `CsvImportModal.tsx` — Upload→Map→Review→Done rail with valid/skipped chips, dedupe choice, confirm, and post-import report.

**P2 — polish to the Mobbin bar — ✅ DONE (2026-06-29):**
6. ✅ `AddPropertyFlowPro.tsx` — labeled left step rail + per-step contextual helper (replaced the thin progress bar).
7. ✅ `Step4PhotosDocs.tsx` — upload-progress overlay + drag-to-reorder grid + cover badge (order persisted as `photoStorageIds` array order — no schema change).
8. ✅ `BulkAssignModal.tsx` — count chip / chip restyle for consistency.

Verified: `tsc --noEmit` clean (only the pre-existing `PendingHandoffsSection.tsx` errors remain, untouched). P2 visual polish best confirmed by dogfooding the running app.

**Out of scope (Phase 3):** cross-session Drafts inbox (D3-A), property "completeness"
tracking/nudges (D1-C), CSV upsert/update-existing (D4-C).

## Open questions for the implementer

1. ~~Does `convertDraftToDocumentsAction` attach to `documents` *and* `photoStorageIds`, or only documents?~~ **RESOLVED (P0):** it turns every staged file (photos included) into a **document row** with a `kind` discriminator — it does **not** populate the property's `photoStorageIds`. Photos appear in the document list, not the property's photo gallery. Surfacing them on the property card is a separate **P2** task if desired.
2. ~~Where does `targetOrgId` enter the `clients` prop today?~~ **RESOLVED (P1):** existing FS clients never populate `targetOrgId` — it only comes from the D2 nested-onboard round-trip, which sets it directly from the new org's id. So the create-new path is the source of `targetOrgId`, not the clients query.
3. ~~Drag-to-reorder: real write or display-only?~~ **RESOLVED (P2):** persisted as `photoStorageIds` array order — no schema change.
