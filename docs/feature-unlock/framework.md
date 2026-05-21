# Feature Unlock Wizard — Framework

> The reusable system that lets users provide structured data and verification documents per pillar, earning "Valgate Verified" status and unlocking the full feature suite.
>
> This document describes the **framework itself**: its model, contracts, and conventions for adding new pillars.
> For the product feature/data spec per pillar, see [`../feature-requirements.md`](../feature-requirements.md).

---

## Mental Model

Valgate has **two layers of data quality** per property:

1. **Added** — user enters whatever they know in the add-property wizard. No accuracy required.
2. **Verified** — user goes through a per-pillar verification process, uploading supporting documents. Features unlock as pillars are verified. When all required pillars are verified, the property earns **Valgate Verified** status.

This framework powers Layer 2 — the per-pillar verification UX.

---

## The Three Building Blocks

```
┌─────────────────────────────────────────────────────────────────┐
│  PropertyLayout header                                          │
│  ┌──────────┐                                                   │
│  │ Unlock   │ ← UnlockButton (3 states, dispatched by tab)      │
│  └──────────┘                                                   │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼ click
┌─────────────────────────────────────────────────────────────────┐
│  FeatureUnlockWizard (shadcn Dialog)                            │
│  ┌─────────────┬─────────────────────────────────────────────┐  │
│  │             │                                              │  │
│  │  Step 1     │   ← Step body (config.steps[stepIndex])      │  │
│  │  Step 2     │     Rendered from per-pillar config          │  │
│  │  Step 3     │     react-hook-form + Zod                    │  │
│  │  Verify   ◀ │   ← VerificationStep (shared)                │  │
│  │             │     Upload + declaration + onVerify          │  │
│  └─────────────┴─────────────────────────────────────────────┘  │
│  WizardProgress (left rail)                                     │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼ on verify
┌─────────────────────────────────────────────────────────────────┐
│  Server: verifyOwnership(entityId, docIds)                      │
│    • Documents.update(verifies = { entityType, entityId })      │
│    • Entity.update(verified=true, verifiedAt, evidenceDocIds)   │
└─────────────────────────────────────────────────────────────────┘
```

### 1. UnlockButton (the trigger)
A small presentational component in the page header. Three states:

| State | Trigger | Label | Action |
|---|---|---|---|
| `unlock` | No entity exists for this pillar | **Unlock feature** | Open wizard at step 1 |
| `verify` | Entity exists, `verified !== true` | **Verify to unlock** | Open wizard at verification step |
| `edit` | Entity exists, `verified === true` | **Edit data** + Verified pill | Open wizard at step 1, prefilled |

### 2. FeatureUnlockWizard (the shell)
A reusable shadcn Dialog containing:
- `WizardProgress` — vertical step rail (left)
- The active step body (right)
- Footer navigation (Back / Next / Verify)

State managed via `react-hook-form` with `zodResolver(config.schema)`. No localStorage drafts — wizard state is in-memory only; re-opening hydrates from server state via `config.loadInitial`.

### 3. VerificationStep (the optional final step)
A shared upload + declaration UI. Same UX across every pillar:
- File input (multiple)
- Staged files list with size + remove
- Checkbox for the pillar's declaration text
- "Verify" button (disabled until min files + declaration)

On submit: sequentially uploads files via `uploadDocument(propertyId, formData)`, then calls `config.verification.onVerify({ entityId, docIds, propertyId })`.

---

## Verification Data Model

### Entity-side (the truth)
Every verifiable entity gains three optional fields:
```ts
verified?: boolean;
verifiedAt?: string;        // ISO timestamp
evidenceDocIds?: string[];  // Document IDs proving verification
```

Verification lives on the entity. There is **no separate Verification collection**. This keeps verification colocated with the data it certifies and avoids joins on every read.

### Document-side (the reverse link)
Every Document gains an optional reverse pointer:
```ts
verifies?: {
  entityType: "ownership-record" | "co-owner" | "inspection"
            | "lease" | "valuation" | "estate-plan"
            | "location-identity" | "financials";
  entityId: string;
}
```

This makes it possible to render "Verifies Ownership" chips on documents and to clean up reverse links during revoke without re-querying.

### Uploaded files
Verification uploads land in the **central `documents/` collection**, not in pillar-specific document collections (e.g., `ownership-documents/`). Pages that need to display pillar-specific evidence query the central collection filtered by `verifies.entityType`.

---

## The WizardConfig Contract

Every pillar provides a typed config object that the shell consumes:

```ts
type WizardConfig<TSchema extends ZodTypeAny> = {
  pillarKey:
    | "ownership" | "financials" | "rental" | "safety"
    | "location" | "valuation" | "estate" | "documents";

  /** Title shown in dialog header */
  title: string;

  /** Master Zod schema spanning all steps */
  schema: TSchema;

  /** Hydrate the form when the wizard opens */
  loadInitial: (args: { propertyId: string }) => Promise<{
    values: Partial<z.infer<TSchema>>;
    entityId: string | null;
    verified: boolean;
  }>;

  /** Called on Next from the last data step */
  onSubmitData: (args: {
    values: z.infer<TSchema>;
    propertyId: string;
    entityId: string | null;
    setEntityId: (id: string) => void;
  }) => Promise<ActionResult<{ entityId: string }>>;

  /** Optional final verification step */
  verification?: {
    title: string;
    declaration: string;
    documentLabel: string;
    minFiles: number;
    maxFiles: number;
    onVerify: (args: {
      entityId: string;
      docIds: string[];
      propertyId: string;
    }) => Promise<ActionResult<void>>;
  };

  /** Data-capture steps (before verification) */
  steps: ReadonlyArray<WizardStepDef<TSchema>>;
};
```

### Step Definition

```ts
type WizardStepDef<TSchema extends ZodTypeAny> = {
  key: string;                          // stable identifier
  title: string;                        // shown in progress rail
  description?: string;
  fields: ReadonlyArray<string>;        // RHF field paths for validation on Next
  render: (ctx: WizardStepRenderCtx<TSchema>) => React.ReactNode;
  shouldSkip?: (values: z.infer<TSchema>) => boolean;
};
```

### Skipped Steps
Steps with a truthy `shouldSkip(values)` are bypassed during navigation **but still rendered in the progress rail**, greyed out with a "Skipped" badge. This makes the full flow visible to the user — they can see what they're not doing and why.

---

## CRUD Semantics

| Action | What happens | Where it lives |
|---|---|---|
| **Create** | Wizard creates underlying entities through existing server actions | `onSubmitData` in the pillar config |
| **Read** | Tab pages read normally — unchanged | Existing queries.ts files |
| **Update** | Wizard re-opens prefilled via `loadInitial`; submit writes patches | `onSubmitData` (detects `entityId !== null`) |
| **Revoke verification** | Clears `verified`, `verifiedAt`, `evidenceDocIds` on entity; clears `Document.verifies` on linked docs. **Data is kept.** | Dedicated server action (e.g., `revokeOwnershipVerification`) |
| **Delete data** | Separate operation — not part of the wizard | Existing remove actions |

**Important:** Revoke is **not** the same as delete. Revoke clears the verified state while keeping the entity and the documents. Delete removes the entity entirely — handled outside this framework.

---

## Server Action Patterns

Each pillar's verification adds two server actions to its existing `*-actions.ts` file:

### `verify<Pillar>(entityId, evidenceDocIds)`
1. Validate `evidenceDocIds` non-empty.
2. For each docId: `documents.update(userId, docId, { verifies: { entityType, entityId } })`.
3. Update entity: `{ verified: true, verifiedAt: Date.now(), evidenceDocIds }`.
4. `revalidateTag(<pillar-tag>)` and `revalidateTag("documents")`.

### `revoke<Pillar>Verification(entityId)`
1. Read entity to find `evidenceDocIds`.
2. For each docId: `documents.update(userId, docId, { verifies: undefined })`.
3. Update entity: clear `verified`, `verifiedAt`, `evidenceDocIds`.
4. Revalidate same tags. **Do not delete the documents.**

Both follow the existing `ActionResult<T>` pattern.

---

## File Layout

```
components/feature-unlock/
├── types.ts                       Config contract + UnlockState type
├── FeatureUnlockWizard.tsx        Dialog shell + RHF + step machine
├── WizardProgress.tsx             Vertical step rail
├── VerificationStep.tsx           Upload + declaration UI
├── UnlockButton.tsx               3-state button + Verified pill
└── pillars/
    ├── OwnershipUnlock.tsx        First pillar (reference impl)
    ├── FinancialsUnlock.tsx       (future)
    ├── RentalUnlock.tsx
    ├── LocationUnlock.tsx
    ├── FinancialsUnlock.tsx
    ├── EstateUnlock.tsx           Portfolio route (/estate-planning)
    ├── SafetyUnlock.tsx           (future)
    └── ...                        One file per pillar
```

Each pillar file exports:
- `<pillar>WizardConfig` — the typed config object
- `<Pillar>UnlockMount` — a thin wrapper component around `<FeatureUnlockWizard config={...} />` for clean page integration

---

## Page Integration

### PropertyLayout
The layout exposes a `headerSlot?: React.ReactNode` prop. Pages opt in by passing an `<UnlockButton>`:

```tsx
<PropertyLayout
  activeTab="ownership"
  property={property}
  headerSlot={<UnlockButton state={unlockState} onClick={openWizard} />}
>
  …
</PropertyLayout>
```

Non-participating tabs simply don't pass the slot — nothing renders. No "Coming soon" stubs.

### Page-level UI additions
A page that wires a pillar typically adds:
1. **State:** `wizardOpen`, `wizardStartAt`
2. **Computed UnlockState** from the entity's `verified` field
3. **`headerSlot` prop** on PropertyLayout
4. **Mount** of the pillar's `<*UnlockMount>` component
5. **Inline verified pill** near the relevant data section (in addition to the header pill)
6. **Revoke menu** (DropdownMenu + confirmation Dialog) next to the inline pill

---

## Adding a New Pillar — Checklist

Use this when implementing a new pillar after Ownership.

1. **Add verification fields to the pillar's primary entity type.**
   `verified?, verifiedAt?, evidenceDocIds?` — all optional, additive, backward-compatible.

2. **Add the entity type to `Document.verifies.entityType` enum** if not already present.

3. **Confirm the pillar's primary entity has full CRUD in `lib/data/db/`.**
   If not (like CoOwners missing `update`), add the missing function.

4. **Confirm server actions exist** for the entity (create/update/remove). Add them if missing — follow the `ActionResult<T>` + `revalidateTag()` pattern.

5. **Add verify and revoke actions** to the pillar's action file.

6. **Create a server-side hydration helper** (`lib/data/<pillar>-wizard.ts`) for `loadInitial`. Keep it separate from page queries that bundle unrelated data.

7. **Create the pillar config file** `components/feature-unlock/pillars/<Pillar>Unlock.tsx`:
   - Master Zod schema
   - Step definitions (with `fields`, `render`, optional `shouldSkip`)
   - `loadInitial`
   - `onSubmitData`
   - `verification` config (if applicable)
   - Export `<*UnlockMount>` wrapper

8. **Wire the pillar's tab page:**
   - State for wizard open + startAt
   - Compute UnlockState from the entity's verified field
   - Pass `headerSlot` to PropertyLayout
   - Mount the pillar's `<*UnlockMount>`
   - Add inline verified pill + revoke menu

9. **If documents land in a pillar-specific collection (legacy)**, refactor that page's queries to also read from central Documents where `verifies.entityType === "<pillar>-record"`.

10. **Add the "Verifies <Pillar>" chip** mapping in `PropertyDocumentsPage`.

11. **Update seed data** so all three header button states are reachable across different properties.

12. **Smoke test:** unlock (empty) → verify (data exists, not verified) → edit (verified) → revoke (back to verify state). Confirm documents land in the documents tab with the right chip.

---

## UI Design Standard

All UI in this framework must be created with the **`/impeccable`** and **`/ui-ux-pro-max`** skills invoked. These elevate baseline design quality and ensure the interface avoids generic AI aesthetics.

Specifically:
- Invoke `/impeccable` (or relevant sub-skills like `/impeccable:layout`, `/impeccable:animate`, `/impeccable:polish`, `/impeccable:delight`) on each new component once its data wiring is correct
- Use `/ui-ux-pro-max` for guidance on wizard/modal interaction patterns, accessibility, micro-interactions, and color/typography decisions
- Match the visual language of `components/portfolio/ProgressModal.tsx` (font tokens, `var(--val-primary-dark)`, emerald accents for verified states, 220–300ms ease-out animations)

---

## Conventions

### Visual
- **Primary CTA:** `var(--val-primary-dark)` (the brand blue)
- **Verified state:** emerald (`bg-emerald-50 text-emerald-700`)
- **Verify-to-unlock state:** amber outline
- **Modal max width:** `max-w-2xl` (~672px)
- **Step transitions:** 200–300ms ease-out, respect `prefers-reduced-motion`

### Code
- **No localStorage drafts in the wizard.** Hydrate from server state on open.
- **Sequential file uploads** in `VerificationStep` (avoids `_fs.ts:nextId` race).
- **Documents are never auto-deleted on revoke.** Only the reverse link clears.
- **Pillar configs are pure data + a render function.** No domain logic in the shell.
- **All server actions return `ActionResult<T>`.**
- **All entity reads go through Zod parse.**

### Accessibility
- Dialog uses Radix primitives (focus trap, escape to close, restore focus)
- Each form field has an associated `<Label>`
- Skipped steps in the progress rail include `aria-label="Skipped — <reason>"`
- Animations respect `@media (prefers-reduced-motion: reduce)`

---

## Why This Architecture

| Decision | Why |
|---|---|
| Verification on the entity (not separate collection) | Simpler reads; verification is colocated with the data it certifies |
| Document reverse link | Enables "Verifies X" UI without joins; enables clean revoke |
| Single reusable wizard shell | 8 pillars × bespoke wizards = high cost. Shell + config = additive |
| `loadInitial` server helper per pillar | Keeps wizard hydration decoupled from page queries (which bundle extra concerns) |
| Documents land only in central `documents/` | One source of truth; pages filter by `verifies` instead of duplicating records |
| Revoke ≠ delete | Verification state is reversible; data is precious |
| Skipped steps stay visible in rail | UX clarity — user sees the full flow, knows what was skipped and why |
| No autosave / localStorage drafts | Wizard is short and idempotent; complexity not worth it for the user value |

---

## See Also

- [`../feature-requirements.md`](../feature-requirements.md) — Per-pillar feature promises and verification requirements
- [`plan-estate.md`](plan-estate.md) — Estate planning pillar (portfolio route `/estate-planning`)
- `components/feature-unlock/types.ts` — Live source of the config contract
- `components/feature-unlock/pillars/OwnershipUnlock.tsx` — Reference implementation
