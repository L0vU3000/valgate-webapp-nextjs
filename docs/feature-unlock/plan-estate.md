# Plan: Feature Unlock Wizard — Estate Planning Pillar

> **Note on scope:** This plan is the **Estate Planning** pillar implementation, fifth after Ownership, Financials, Location, and Rental. It is the first pillar wired on a **portfolio route** (`/estate-planning`), not a property tab.

---

## Context

Estate planning is portfolio-scoped but **verified per property**. The `/estate-planning` page already has:

- Property list + detail panel (`SuccessionPage.tsx`)
- `Successor` entities with a legacy `verified: boolean` flag (contact/identity signal)
- `EstateAssignment` join records (`successorId` × `propertyId`) — CRUD has `create` + `remove` only (no `update`)
- Estate docs filtered as `Document` with `category` matching `"estate"` (case-insensitive)
- Derived completion % and status chips (`complete` / `pending` / `action` / `draft`)
- `addSuccessorAndAssign` server action (primary-share validation per property)
- `Document.verifies.entityType` already includes `"estate-plan"` (reserved during Ownership round)

Estate is **not required** for property-level Valgate Verified (`feature-requirements.md`), but unlocking it powers portfolio succession KPIs, readiness score, and shareable estate summary (future).

### What the user gets after this work

- **Per-property** header CTA on the estate detail panel: Unlock feature / Verify to unlock / Edit data
- A 3-step wizard scoped to the **selected property**:
  1. Beneficiaries (assign or create successors + shares)
  2. Contact confirmation (email/phone → sets `Successor.verified`)
  3. Verification (will/trust upload + declaration)
- Verification flips three namespaced fields on **Property**: `estateVerified`, `estateVerifiedAt`, `estateEvidenceDocIds`
- Emerald **Valgate Verified** pill on the property panel when `estateVerified === true`
- Revoke menu (keeps assignments, successors, and uploaded docs; clears verification only)
- **"Verifies Estate"** chip on documents linked as evidence
- Seed data covering all three button states across PROP-0001 / PROP-0002 / PROP-0003
- Real `estate-assignments` seed (removes reliance on query-time fallback assignments)

### Design decisions locked

| Decision | Choice | Why |
|---|---|---|
| Verification anchor | **Property-level** (`PropertyCoreSchema`): `estateVerified`, `estateVerifiedAt`, `estateEvidenceDocIds` | Matches Rental/Financials/Location; one gate per property's succession record |
| Document reverse link | `verifies.entityType = "estate-plan"`, `entityId = propertyId` | Enum already reserved; revoke clears link without deleting files |
| Wizard host route | `/estate-planning` detail panel header | User works property-by-property; no new property tab |
| `Successor.verified` | **Keep** as sub-signal (contact confirmed in step 2) | Already wired in queries/table; do not replace with entity `verifiedAt` in v1 |
| Beneficiary contact fields | Add optional `email`, `phone` on `SuccessorSchema` | Required for "contact on file" verification step |
| Estate doc category | Add `"Estate"` to `Document.category` enum | Queries filter `category === "estate"` but Zod enum lacks it today |
| Assignment sync | New `estate-assignments.actions.ts` | Wizard must assign/unassign without only `addSuccessorAndAssign` |
| Evidence docs | Central `documents/` only | Framework standard; estate panel lists docs by `category` **or** `verifies.entityType === "estate-plan"` |
| Portfolio-wide verify | **Out of scope** | No single "verify whole portfolio" button in v1 |
| Complex trust tier | **Out of scope** | Solicitor confirmation / probate upload deferred |
| Export stubs | **Out of scope** | `Generate Portfolio Report`, `Download Summary` remain stubs |

---

## Architecture

```
Server
├─ lib/data/types/property.ts                    + estateVerified, estateVerifiedAt, estateEvidenceDocIds on PropertyCoreSchema
├─ lib/data/types/successor.ts                   + email?, phone? (optional)
├─ lib/data/types/document.ts                    + "Estate" in category enum (confirm estate-plan in verifies)
├─ lib/data/db/properties.ts                     splitProperty() routes the 3 estate fields into core shard
├─ lib/data/db/successor-property-assignments.ts + update() if needed for assignment patches (optional v1)
├─ lib/actions/properties.actions.ts             + verifyEstate, revokeEstateVerification
├─ lib/actions/estate-assignments.actions.ts     NEW — assignSuccessor, removeAssignment, listForProperty
├─ lib/actions/successors.actions.ts             (existing updateSuccessor — used in contact step)
└─ lib/data/estate-wizard.ts                     NEW — hydration helper per propertyId

Client (reusable framework — already exists)
└─ components/feature-unlock/pillars/
   └─ EstateUnlock.tsx                            NEW — schema, 3 steps, loadInitial, onSubmitData, verification

Client (page wiring)
├─ app/(shell)/estate-planning/_components/SuccessionPage.tsx   + UnlockButton, wizard mount, verified pill, revoke dialog (per selected property)
├─ app/(shell)/estate-planning/queries.ts                       + expose estateVerified on property metrics; align completion with verification
└─ app/(shell)/property/[id]/_components/PropertyDocumentsPage.tsx  + chip "estate-plan" → "Verifies Estate"

Progress derivation
└─ lib/data/derivations/progress.ts              estate pillar: add check `property.estateVerified === true` (per propertyId in ctx)

Seed data
├─ PROP-0001/core.json                           estateVerified: true, estateVerifiedAt, estateEvidenceDocIds: ["DOC-0009"]
├─ PROP-0002/core.json                           assignments exist, no estateVerified (verify state)
├─ PROP-0003/core.json                           no assignments, no estateVerified (unlock state)
├─ estate-assignments/EA-0001/core.json          SUCC-0001 → PROP-0001
├─ estate-assignments/EA-0002/core.json          SUCC-0002 → PROP-0002 (primary 100% or split per demo narrative)
├─ successors/SUCC-*.json                        email + phone on at least SUCC-0001; SUCC-0002 unverified contact for verify flow
├─ documents/DOC-0009/core.json                  Will — category: "Estate", verifies: { entityType: "estate-plan", entityId: "PROP-0001" }
└─ (optional) documents/DOC-0010                 second estate doc for PROP-0002 panel display, not yet verified

Docs archive
└─ docs/feature-unlock/plan-estate.md            (this file)
```

---

## Type changes

### `lib/data/types/property.ts` — `PropertyCoreSchema`

```ts
estateVerified: z.boolean().optional(),
estateVerifiedAt: timestampSchema.optional(),
estateEvidenceDocIds: z.array(idSchema).optional(),
```

Route through `splitProperty()` / merge in `lib/data/db/properties.ts` (core shard, same as `rentalVerified`).

### `lib/data/types/successor.ts`

```ts
email: z.union([z.string().email(), z.literal("")]).optional(),
phone: z.string().optional(),
```

`verified` stays `z.boolean()` — set `true` in wizard step 2 when email or phone is present for each assigned successor.

### `lib/data/types/document.ts`

```ts
category: z.enum([..., "Estate"]).optional(),
```

Confirm `verifies.entityType` includes `"estate-plan"` (no change expected).

### `lib/data/types/successor-property-assignment.ts`

No verification fields on the join in v1 — property-level `estateVerified` is the pillar gate.

---

## Server actions

Add to `lib/actions/properties.actions.ts` (mirror `verifyRental`):

```ts
verifyEstate(propertyId: string, evidenceDocIds: string[]): Promise<ActionResult<Property>>
revokeEstateVerification(propertyId: string): Promise<ActionResult<Property>>
getEstateWizardInitialAction(propertyId: string): Promise<ActionResult<EstateWizardInitial>>
```

**`verifyEstate`**

1. Validate `evidenceDocIds.length > 0`.
2. Require ≥1 `EstateAssignment` for `propertyId`.
3. Require primary successor share totals ≈ 100% for that property (same rule as `addSuccessorAndAssign`).
4. For each docId: `documents.update(..., { verifies: { entityType: "estate-plan", entityId: propertyId } })`.
5. `properties.update(..., { estateVerified: true, estateVerifiedAt: Date.now(), estateEvidenceDocIds })`.
6. `estateActivityEvents.create` — kind `estate.reviewed`, title "Estate plan verified".
7. `revalidateTag("properties")`, `revalidateTag("documents")`, `revalidateTag("estate-assignments")`, `revalidateTag("successors")`.

**`revokeEstateVerification`**

1. Read property → `estateEvidenceDocIds`.
2. Clear `verifies` on each doc (do **not** delete documents).
3. Clear `estateVerified`, `estateVerifiedAt`, `estateEvidenceDocIds` on property.
4. Activity event — "Estate verification revoked".
5. Same revalidate tags.

### `lib/actions/estate-assignments.actions.ts` — NEW

```ts
assignSuccessorToProperty(successorId: string, propertyId: string): Promise<ActionResult<EstateAssignment>>
removeAssignment(assignmentId: string): Promise<ActionResult<void>>
listAssignmentsForPropertyAction(propertyId: string): Promise<ActionResult<EstateAssignment[]>>
```

- Reuse primary-share overflow check from `addSuccessorAndAssign` before create.
- On assign: write assignment + `successor.assigned` activity event.
- On remove: delete assignment + activity event (do not delete successor unless user explicitly removes beneficiary elsewhere).

---

## Wizard hydration — `lib/data/estate-wizard.ts`

```ts
export type EstateWizardInitial = {
  property: Property;
  assignments: EstateAssignment[];
  successors: Successor[];           // successors linked to this property
  allSuccessors: Successor[];        // for "assign existing" picker
  estateDocuments: Document[];       // category Estate OR verifies.estate-plan for propertyId
};

export async function getEstateWizardInitial(propertyId: string): Promise<EstateWizardInitial>
```

---

## Pillar config — `components/feature-unlock/pillars/EstateUnlock.tsx`

Exports `estateWizardConfig` and `<EstateUnlockMount propertyId open onOpenChange startAt onSuccess />`.

### Zod schema (sketch)

```ts
const EstateWizardSchema = z.object({
  beneficiaries: z.array(z.object({
    assignmentId: z.string().optional(),  // existing EA id
    successorId: z.string().optional(),   // existing SUCC id
    name: z.string().min(1),
    relation: SuccessorRelationSchema,
    role: z.enum(["primary", "contingent"]),
    share: z.coerce.number().min(0).max(100),
    email: z.union([z.string().email(), z.literal("")]).optional(),
    phone: z.string().optional(),
  })).min(1, "Add at least one beneficiary"),
}).superRefine((vals, ctx) => {
  const primaries = vals.beneficiaries.filter((b) => b.role === "primary");
  const total = primaries.reduce((s, b) => s + b.share, 0);
  if (primaries.length === 0) {
    ctx.addIssue({ code: "custom", path: ["beneficiaries"], message: "At least one primary beneficiary is required" });
  } else if (Math.abs(total - 100) > 0.01) {
    ctx.addIssue({ code: "custom", path: ["beneficiaries"], message: `Primary shares must total 100% (currently ${total.toFixed(1)}%)` });
  }
});
```

### Steps

| # | Key | Title | `fields` | Notes |
|---|---|---|---|---|
| 1 | `beneficiaries` | Beneficiaries | `beneficiaries` | Table UI: add row, pick existing successor, role, share %. `onSubmitData` syncs assignments (create/remove) + create/update successors |
| 2 | `contacts` | Contact details | per-row email/phone paths | Require email **or** phone for each primary; set `Successor.verified = true` when saved |
| 3 | `__verification` | Verify estate plan | — | `VerificationStep`: title "Verify estate plan", declaration e.g. "I confirm this will or trust names the beneficiaries above for this property", `documentLabel: "Will or trust deed"`, `minFiles: 1`, `maxFiles: 3` |

### `loadInitial`

```ts
loadInitial: async ({ propertyId }) => {
  const data = await getEstateWizardInitialAction(propertyId);
  // map to form values + entityId: propertyId, verified: property.estateVerified
}
```

### `onSubmitData`

1. Diff beneficiaries vs current assignments (create successors, assign, remove stale assignments).
2. Patch successor email/phone; set `verified: true` when contact present.
3. Return `{ entityId: propertyId }`.

### `verification.onVerify`

```ts
onVerify: async ({ entityId, docIds }) => verifyEstate(entityId, docIds),
```

Optionally set uploaded doc `category: "Estate"` in `uploadDocument` follow-up or a post-upload patch (v1: patch in `verifyEstate` loop).

---

## Page integration — `SuccessionPage.tsx`

### UnlockState (per selected property)

Pass `estateVerified` from server — extend `EstateProperty` in `queries.ts`:

```ts
export type EstateProperty = {
  // ...existing fields
  estateVerified: boolean;
  hasAssignments: boolean;
};
```

```ts
const unlockState: UnlockState =
  property.estateVerified
    ? { kind: "edit", entityId: property.id }
    : property.hasAssignments
      ? { kind: "verify", entityId: property.id }
      : { kind: "unlock" };
```

### UI placement

- **UnlockButton** in the **right panel header** (next to "Add Beneficiary"), not the global portfolio header — CTA applies to the selected property.
- **Verified pill** beside `{property.name} Estate Plan` when `estateVerified`.
- **Revoke** — `DropdownMenu` + confirm `Dialog` → `revokeEstateVerification(property.id)` → `router.refresh()`.
- **`<EstateUnlockMount propertyId={property.id} ... />`** at bottom of page component.

### Query alignment

Update `getEstatePlanningPageData()`:

| Today | After |
|---|---|
| `deriveStatus(completionPct)` only | If `estateVerified` → treat as `complete` (or boost completion to 100%) |
| Fallback fake assignments when empty | Remove fallback once `EA-*` seed exists |
| `unverifiedCount` from `!successor.verified` | Keep; step 2 still drives this |
| Completion checks ignore `estateVerified` | Add `estateVerified` as a check (or replace "has activity" with "estate verified" for stronger signal) |

Expose `estateVerified` on each `EstateProperty` row for UnlockState without re-fetching.

---

## Documents tab chip

`PropertyDocumentsPage.tsx`:

```ts
"estate-plan": {
  label: "Verifies Estate",
  cls: "bg-emerald-50 text-emerald-700",
},
```

Estate panel on `/estate-planning` should also surface docs with `verifies.entityType === "estate-plan"` even if `category` is unset.

---

## Progress pillar

`lib/data/derivations/progress.ts` — estate checks for each property:

```ts
{ label: "Beneficiary assigned", done: successorAssign.filter(a => a.propertyId === pid).length > 0 },
{ label: "Estate plan verified", done: property.estateVerified === true },
```

Drop or soften the generic "Estate document uploaded" check if it duplicates verification evidence (optional: keep as "Supporting document on file" using `estateEvidenceDocIds.length > 0`).

---

## Seed data matrix

| Property | Assignments | Successors | `estateVerified` | Expected CTA |
|---|---|---|---|---|
| **PROP-0001** | EA-0001 → SUCC-0001 (primary 75%) + optional contingent | SUCC-0001 verified, email/phone filled | `true` + DOC-0009 evidence | **Edit data** + Verified pill |
| **PROP-0002** | EA-0002 → SUCC-0002 | SUCC-0002 assigned, `verified: false`, contact empty | omit | **Verify to unlock** (opens verification) |
| **PROP-0003** | none | — | omit | **Unlock feature** (opens step 1) |

Remove query fallback that fabricates assignments from successors when `assignmentsRaw.length === 0` (after seed lands).

---

## Implementation order

Each task touches 1–4 files.

1. **Types** — `estateVerified*` on `PropertyCoreSchema`; `email`/`phone` on `SuccessorSchema`; `"Estate"` on `Document.category`.
2. **`splitProperty()`** — route estate verification fields in `lib/data/db/properties.ts`.
3. **Seed** — `estate-assignments/`, property core fields, successor contacts, `DOC-0009` with `verifies.estate-plan`.
4. **Actions** — `verifyEstate`, `revokeEstateVerification`, `getEstateWizardInitialAction` in `properties.actions.ts`.
5. **Assignment actions** — new `lib/actions/estate-assignments.actions.ts`.
6. **Hydration** — `lib/data/estate-wizard.ts`.
7. **Pillar config** — `components/feature-unlock/pillars/EstateUnlock.tsx`.
8. **Queries** — `estate-planning/queries.ts`: expose `estateVerified`, `hasAssignments`, remove fallback assignments, align status/completion.
9. **Page wiring** — `SuccessionPage.tsx`: UnlockButton, mount, pill, revoke.
10. **Documents chip** — `PropertyDocumentsPage.tsx`.
11. **Progress** — `lib/data/derivations/progress.ts` estate checks.
12. **Update `docs/feature-unlock/framework.md` See Also** — link `plan-estate.md`; remove "(future)" from Estate in file layout if present.
13. **Polish** — `/impeccable` + `/ui-ux-pro-max` on `EstateUnlock.tsx` and panel header (match `ProgressModal` / other pillars).
14. **Smoke test** (below).

---

## Smoke test checklist

1. **PROP-0001** — Select property. Panel shows **Edit data** + emerald **Verified** pill. Wizard opens prefilled with SUCC-0001. Documents list shows DOC-0009. `/property/PROP-0001/documents` shows **Verifies Estate** chip on evidence doc.
2. **PROP-0002** — **Verify to unlock**. Wizard opens at verification step (assignments + beneficiaries exist). Complete verify → pill appears.
3. **PROP-0003** — **Unlock feature**. Step 1: add primary beneficiary 100%. Step 2: email + phone. Step 3: upload PDF + declaration → verify.
4. **Revoke on PROP-0001** — Clears `estateVerified*` on core; clears `verifies` on linked docs; assignments and successors remain; CTA returns to **Verify to unlock**.
5. **Primary share validation** — On PROP-0003, two primaries totaling 110% → inline error on Next.
6. **Activity timeline** — Verify and revoke each append an `estate-activity-events` row.
7. **Portfolio KPIs** — Plan Completion / Pending Reviews update after verify and revoke (`router.refresh()`).
8. **Other property tabs** — Unaffected; no `headerSlot` on `PropertyLayout` required for this pillar.

---

## Out of scope (v2+)

- Portfolio-wide single verification (all properties at once)
- Solicitor / probate document tier
- `Generate Portfolio Report` / `Download Summary` implementation
- Beneficiary portal access / permissions
- Separate `EstatePlan` entity (per `.claude/data-audit/pages/estate-planning/plan.md` deferral)
- Property tab `/property/[id]/estate` — estate stays on `/estate-planning` only
- Auto-delete documents on revoke

---

## See also

- [`../feature-requirements.md`](../feature-requirements.md) — §7 Estate Planning
- [`framework.md`](framework.md) — wizard primitive contract
- [`.claude/data-audit/pages/estate-planning/plan.md`](../../.claude/data-audit/pages/estate-planning/plan.md) — page wiring audit (pre-unlock)
- [`plan-rental.md`](plan-rental.md) — reference for property-level verification fields + multi-entity submit patterns
