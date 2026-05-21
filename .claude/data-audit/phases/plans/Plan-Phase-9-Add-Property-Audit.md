# Plan — Phase 9: `/add-property` Audit + Cross-App Input Map

## Context

`/add-property` is the **seed-data origin** of the app — the first and only place where a brand-new property record is created from user input. By design it captures only the **core** fields needed to bootstrap a property; everything else (leases, tenants, payments, expenses, documents, valuations, ownership records, safety records, estate plans, etc.) is entered later through other routes.

`/add-property` is one of three routes still flagged as "Pages NOT yet audited" in `ref/09-page-wiring-status.md`. Auditing it closes that gap.

Phase 9 covers two deliverables that must land together:

1. **Audit `/add-property` itself** — validate the core capture is clean (every collected field has a destination, validation isn't lying, draft persistence is intentional).
2. **Map the cross-app input surfaces** — produce a single reference document listing, for every other entity in the catalog, where its create/edit UI lives (or is supposed to live). Without this map, "the rest comes later" stays vague.

No code changes in Phase 9. Wiring fixes land in follow-up phases.

---

## Source Files

| File | Role |
|---|---|
| `app/(shell)/add-property/page.tsx` | Server Component wrapper; reads draft list via `getAddPropertyPageData()` |
| `app/(shell)/add-property/actions.ts` | `submitPropertyAction` Server Action + `mapWizardToProperty` transform + `parseCurrency`/`parseFloatSafe`/`parseDateMs` helpers |
| `app/(shell)/add-property/_components/AddPropertyFlow.tsx` | SPA shell — owns `form` state, step routing via `?step=N&draftId=X`, autosave wiring |
| `app/(shell)/add-property/_components/Step0NewOrDraft.tsx` | Method picker (manual/photo/upload) + draft resume list |
| `app/(shell)/add-property/_components/Step1PropertyType.tsx` | Property type enum picker (8 cards) |
| `app/(shell)/add-property/_components/Step2BasicInfo.tsx` | `propertyName`, `totalArea`, address (search or manual), Mapbox pin |
| `app/(shell)/add-property/_components/Step3Financial.tsx` | `currentMarketValue` only (lightweight) |
| `app/(shell)/add-property/_components/Step4PhotosDocs.tsx` | Photo + document upload (filenames only — blobs filtered) |
| `app/(shell)/add-property/_components/Step5Review.tsx` | Read-only summary with edit-to-step buttons |
| `app/(shell)/add-property/_components/Step6Success.tsx` | Celebration screen with confirmed-code |
| `app/(shell)/add-property/_components/schemas.ts` | 4 per-step Zod schemas + merged `fullPropertySchema` (24 of 25 fields `.optional()`) |
| `app/(shell)/add-property/_components/types.ts` | `FormData` interface, `Step` enum, defaults |
| `app/(shell)/add-property/_lib/drafts-storage.ts` | localStorage CRUD; `valgate:add-property:drafts:v1`; strips File blobs before persist |
| `app/(shell)/add-property/_lib/use-drafts.ts` | React hook — autosave on form/step change (Steps 1–5 only) |
| `lib/data/db/properties.ts` | `createProperty()` — writes Property to local-db FS layer |
| `lib/data/types/property.ts` | `PropertySchema` — 35 fields including the 14 transformed-but-never-captured |

---

## Sub-phase 1 — Audit `/add-property`

Produce `.claude/data-audit/pages/add-property/audit.md` and `plan.md`. No code changes.

### Adapted classification taxonomy

`/audit-page-datapoints`'s default taxonomy (WIRED / HARDCODED / PARTIAL / CHROME / DECORATIVE) is built for **display** pages. `/add-property` is an **input** page, so we adapt the taxonomy *for this audit only*. Display-page audits continue to use the standard taxonomy unchanged.

| Class | Meaning |
|---|---|
| **COLLECTED** | Field captures user input · destination entity+field known · write path exists |
| **COLLECTED-PARTIAL** | Captured but destination or write path incomplete (e.g. file blobs filtered before persist) |
| **COLLECTED-UNMAPPED** | Captured but no destination (form state with nowhere to go) |
| **DEFERRED-BY-DESIGN** | `Property` field exists in schema + transform, but intentionally not in wizard UI (later route owns it) |
| **VALIDATION-GAP** | Captured but no Zod / client validation enforces correctness |
| **CHROME** | Step labels, button copy, section headers |
| **DECORATIVE** | Animations, gates, icons, success confetti |

### Expected surface tally

| Class | Approx count | Notes |
|---|---|---|
| COLLECTED | ~13 | propertyType, propertyName, totalArea, addressLine, addressLine2, city, province, zip, country, mapCenter, currentMarketValue, photos[], documents[] |
| COLLECTED-PARTIAL | ~2 | photos[] / documents[] — blobs filtered, only filenames persist |
| DEFERRED-BY-DESIGN | 14 | purchasePrice, purchaseDate, ownershipStatus, outstandingMortgage, monthlyPayment, interestRate, annualPropertyTax, taxAssessmentValue, annualInsurance, yearBuilt, bedrooms, bathrooms, parkingSpaces, storageUnit |
| VALIDATION-GAP | ~24 | All `Property` fields except `province` are `.optional()` in fullPropertySchema |
| CHROME | ~30 | Step labels (1 of 6), button copy (Back/Continue/Save Draft/Submit), section headings, gate copy |
| DECORATIVE | ~10 | HowItWorksGate interstitials, success animation, sparkles, confetti, gradient hero |

### Page-wide findings (PFn) to file in `audit.md`

**PF1 — Draft persistence model unresolved (P2)**
Drafts persist to `localStorage` only (`valgate:add-property:drafts:v1`). No cross-device sync. Q4.A tracks the migration path to Convex `drafts` collection but is unresolved. Effect: a user starting on mobile cannot resume on desktop. The UI doesn't communicate this constraint.

**PF2 — File upload incomplete (P1)**
Photos and documents are collected in `Step4PhotosDocs.tsx` and stored in `form.photos[]` / `form.documents[]` as filename strings. Actual File blobs are filtered out of the persisted draft in `drafts-storage.ts:7–8`. The submit path writes filenames into `photoStorageIds` / `documentStorageIds` on `Property`, but no storage upload occurs. Tracked as Q5.C; resolution requires storage provider decision (Convex `_storage`, S3, etc.).

**PF3 — Validation too permissive (P1)**
`fullPropertySchema` marks 24 of 25 `Property` fields as `.optional()`. Only `province` is required. Effect: a user can submit a property with no name, no type, no address, no value — the wizard will succeed and `createProperty()` will persist a hollow row. Tracked as Q5.B. Note: PF6 fields (deferred-by-design) are expected to be optional; the gap is on the 13 collected fields, especially `propertyName`, `propertyType`, `addressLine`/`city`, `currentMarketValue`.

**PF4 — Form state managed manually, not RHF (P3)**
`AddPropertyFlow.tsx` owns a `useState<FormData>` and passes `(form, setForm)` down to each step component. No React Hook Form, no field-level dirty/touched tracking, no validation surfacing at the per-field level. Tracked as Q7. Not a correctness bug but a maintainability concern as the wizard grows.

**PF5 — `status` and `title` hardcoded in `mapWizardToProperty` (P2)**
The transform at `actions.ts:mapWizardToProperty` sets `status = "Vacant"` and `title = "—"` for every submission:
- **`status`** should be a selectable enum (e.g. Occupied / Vacant / Under Renovation). Today a brand-new occupied rental gets misclassified as Vacant until its first Lease is added. Add a UI field (likely Step 3 or a new Step 2-bis) or compute from `Lease` presence.
- **`title = "—"`** is a placeholder for a missing field. Either remove from transform entirely (the field shouldn't exist on `Property` if there's no UI for it), or add an input. Decision required.

**PF6 — 14 `Property` fields transformed but never captured in wizard UI (P2)**
`mapWizardToProperty` reads 14 fields from the form object that are never collected by any step. All are tagged **DEFERRED-BY-DESIGN** per user direction — the wizard intentionally captures only core fields, and these belong to later routes. Target-route assignments recorded once here; the input map's gaps section (Sub-phase 2) mirrors and prioritizes them.

| Field | Recommended target route | Rationale |
|---|---|---|
| `purchasePrice` | `/property/[id]/ownership` (acquisition panel) | Already displayed there; ownership tab owns acquisition history |
| `purchaseDate` | `/property/[id]/ownership` | Same as above |
| `ownershipStatus` | `/property/[id]/ownership` | Holding type / sole vs co-owned belongs with ownership UI |
| `outstandingMortgage` | `/property/[id]/ownership` (equity panel) | Already displayed in equity panel |
| `monthlyPayment` | `/property/[id]/ownership` (mortgage terms) | Already displayed |
| `interestRate` | `/property/[id]/ownership` (mortgage terms) | Already displayed |
| `annualPropertyTax` | `/property/[id]/valuation` or future finance tab | Annual cost data |
| `taxAssessmentValue` | `/property/[id]/valuation` | Valuation-adjacent |
| `annualInsurance` | `/property/[id]/valuation` or future finance tab | Annual cost data |
| `yearBuilt` | `/property/[id]/overview` (specs section, editable) | Property spec |
| `bedrooms` | `/property/[id]/overview` (specs) | Property spec |
| `bathrooms` | `/property/[id]/overview` (specs) | Property spec |
| `parkingSpaces` | `/property/[id]/overview` (specs) | Property spec |
| `storageUnit` | `/property/[id]/overview` (specs) | Property spec |

### Outputs of Sub-phase 1

- `.claude/data-audit/pages/add-property/audit.md` — Surface Inventory (all 7 steps) + PFn list above + source SHAs + verification commands
- `.claude/data-audit/pages/add-property/plan.md` — Entity Backlog (likely empty: no missing entities, only missing UI), Audit Roadmap (must direct per-datapoint follow-ups to **cite PF6** for the 14 deferred-by-design field assignments rather than restating target routes inline — same pattern as `pages/portfolio/plan.md` § Audit Roadmap), Fix Log seed

---

## Sub-phase 2 — Cross-app input map

Produce `.claude/data-audit/ref/10-input-data-map.md`. No code changes.

### Shallow inventory table — one row per entity

For each of the 24 non-`Property` entities, document where its create/edit UI lives today.

| Entity | Create UI today? | Path / Component | Status | Notes / Q-codes |
|---|---|---|---|---|

**Status values:**
- **`built`** — real create form shipped
- **`stub`** — placeholder/disabled "Add X" button only
- **`seed-only`** — no UI at all; demo data is the only source
- **`derived`** — no UI by design (auto-generated from events; e.g. `OwnershipHistory`, `EstateActivityEvent`, `Notification`)

### Entities to cover (24 total)

- **Rental:** Tenant, Lease, Payment, Expense, MaintenanceItem
- **Documents:** Document, Folder
- **Safety:** Inspection, Certification, SafetyRisk, EmergencyContact
- **Land/Value:** LandParcel, PropertyValuation, PropertyComparable (when built)
- **Ownership:** CoOwner, OwnershipRecord, OwnershipDocument, OwnershipHistory
- **Estate:** Successor, SuccessorPropertyAssignment, EstateActivityEvent
- **Directory/User:** Professional, UserProfile
- **System:** Notification, NotificationPreference

For each: read the relevant route's `actions.ts` / `queries.ts` and component tree; record whether there is a real create form, only an "Add X" stub button, or only seed-data.

### Gaps section (appended at end of `10-input-data-map.md`)

Focused list of entities flagged `seed-only` or `stub` above, plus the 14 deferred-by-design `Property` fields from PF6. For each:

- **Entity / field**
- **Why it's a gap** (no UI yet, or stub only, or transformed but uncaptured)
- **Recommended target route**
- **Priority** (P1 = blocks current pages from being usable with real data · P2 = needed for full feature parity · P3 = nice-to-have)

This is the actionable companion to the inventory table — the **"places to put other input data"** list.

---

## Sub-phase 3 — Registry updates

| File | Update |
|---|---|
| `.claude/data-audit/INDEX.md` | Add `add-property` row in page-level table |
| `.claude/data-audit/ref/09-page-wiring-status.md` | Move `/add-property` out of "Pages NOT yet audited" into status table; note the input-form taxonomy applied |
| `.claude/data-audit/ref/INDEX.md` | Add `10-input-data-map.md` under **§ Tier 1 — Canonical** with description "One-row-per-entity inventory of create/edit UI surfaces + gaps section listing missing input routes" and "When to read: when planning UI wiring for non-Property entities" |
| `.claude/data-audit/CLAUDE.md` | Mirror the Tier 1 entry in the `ref/` folder table |

---

## Verification

1. **Audit tally check** — `audit.md` field count must reconcile with `fullPropertySchema` keys + the 7 step components. Expected: ~13 COLLECTED + 14 DEFERRED + ~30 CHROME + ~10 DECORATIVE + ~24 VALIDATION-GAP overlays.
2. **Live walkthrough** — open `/add-property?step=N` in the dev server for N ∈ {0..6}; visually confirm the inventory matches what's rendered.
3. **Input map sanity check** — pick 3 random entities from `ref/10-input-data-map.md`, navigate to the listed route, and confirm the stated UI state (built/stub/seed-only) matches reality.
4. **Cross-ref check** — every entity in `ai-data-ref/entities.md` (25 total) should appear exactly once: 1 in the add-property audit (Property) + 24 in the input map.
5. **No regressions** — `09-page-wiring-status.md` row count moves from 15 + 3 unaudited → 16 + 2 unaudited.

---

## Resolved decisions (during plan review)

1. **14 missing-UI `Property` fields → DEFERRED-BY-DESIGN.** Each gets a target-route assignment in PF6 and is mirrored in the input map's gaps section.
2. **Input map depth → shallow rows + gaps section.** One-line per entity, with a focused gaps section listing where each missing input UI should live.
3. **`status='Vacant'` and `title='—'` → both gaps (PF5).** `status` should be a selectable enum; `title` is a placeholder for a missing field.
