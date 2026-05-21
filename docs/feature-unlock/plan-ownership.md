# Plan: Feature Unlock Wizard — Ownership Pillar

> First pillar implementation + the reusable wizard primitive. The framework was the central deliverable; Ownership is the proof of concept.

## Context

Valgate's product model has two layers: (1) frictionless add-property wizard, and (2) per-pillar **verification process** earning "Valgate Verified" status. Features unlock when data is verified.

### Design decisions
- **Verification on the entity** (`OwnershipRecord.verified, verifiedAt, evidenceDocIds`) — not a separate collection
- **Reverse link on Document** (`Document.verifies: { entityType, entityId }`)
- **Reusable wizard primitive** — shared shell, per-pillar config
- **CRUD semantics:** "Edit data" reopens wizard; "Revoke verification" clears verification fields, keeps data
- **Three-state button:** Unlock feature / Verify to unlock / Edit data + Verified badge
- **Evidence docs:** central `documents/` collection only
- **Wizard patches both** `OwnershipRecord.loanAmount` and `Property.outstandingMortgage`
- **Skipped steps remain visible** in progress rail, greyed out with "Skipped" badge

## Type changes

`lib/data/types/ownership-record.ts`:
```ts
verified: z.boolean().optional(),
verifiedAt: timestampSchema.optional(),
evidenceDocIds: z.array(idSchema).optional(),
```

`lib/data/types/document.ts`:
```ts
verifies: z.object({
  entityType: z.enum([
    "ownership-record", "co-owner", "inspection", "lease",
    "valuation", "estate-plan", "location-identity", "financials",
  ]),
  entityId: idSchema,
}).optional(),
```

## CRUD layer

- `lib/data/db/co-owners.ts` — add `update`
- `lib/actions/co-owners.actions.ts` — NEW: createCoOwner, updateCoOwner, removeCoOwner
- `lib/actions/ownership-records.actions.ts` — add `verifyOwnership`, `revokeOwnershipVerification`
- `lib/data/ownership-wizard.ts` — NEW: getOwnershipWizardInitial, listCoOwnersForProperty

## Wizard primitive

`components/feature-unlock/types.ts`:
```ts
export type WizardConfig<TSchema extends ZodTypeAny> = {
  pillarKey: "ownership" | "financials" | "rental" | "safety"
           | "location" | "valuation" | "estate" | "documents";
  title: string;
  schema: TSchema;
  loadInitial: (args: { propertyId: string })
    => Promise<{ values: Partial<z.infer<TSchema>>; entityId: string | null; verified: boolean }>;
  onSubmitData: (args: WizardSubmitArgs<TSchema>)
    => Promise<ActionResult<{ entityId: string }>>;
  verification?: { ... };
  steps: ReadonlyArray<WizardStepDef<TSchema>>;
};

export type UnlockState =
  | { kind: "unlock" }
  | { kind: "verify"; entityId: string }
  | { kind: "edit"; entityId: string };
```

`<FeatureUnlockWizard>`: shadcn Dialog, max-w-2xl, two-column. react-hook-form + zodResolver. Step machine over `config.steps` filtered through `shouldSkip`, then verification. `startAt` prop. No localStorage drafts.

`<WizardProgress>`: renders all steps; active = `var(--val-primary-dark)`, completed = emerald check, skipped = grey + "Skipped" badge.

`<VerificationStep>`: file input, staged list, declaration checkbox, "Verify" button. Sequential `uploadDocument`, then `config.verification.onVerify`.

`<UnlockButton>`: 3 states (unlock = primary gradient, verify = amber outline, edit = secondary outline + emerald Verified pill).

## Ownership pillar config

Schema:
```ts
const OwnershipWizardSchema = z.object({
  holdingType: HoldingTypeSchema,
  distributionMethod: DistributionMethodSchema.optional(),
  loanType: z.string().optional(),
  lenderName: z.string().optional(),
  loanAmount: z.coerce.number().nonnegative().optional(),
  loanTermYears: z.coerce.number().int().positive().optional(),
  interestRate: z.coerce.number().nonnegative().optional(),
  originationDate: z.string().optional(),
  maturityDate: z.string().optional(),
  downPayment: z.coerce.number().nonnegative().optional(),
  closingCosts: z.coerce.number().nonnegative().optional(),
  coOwners: z.array(z.object({ ... })).default([]),
}).superRefine((vals, ctx) => {
  // co-owner shares must total 100% if not Sole Ownership
});
```

Steps: (1) Structure, (2) Loan/financing, (3) Co-owners [skip if Sole], (4) Verification (Title Deed, declaration "I confirm I am the legal owner...").

## PropertyLayout integration

Add `headerSlot?: React.ReactNode` prop. Render between progress pill and Bell icon.

## PropertyOwnershipPage updates

1. Remove "Add Owner" button
2. Add wizard state, compute UnlockState, pass headerSlot
3. Mount `<OwnershipUnlockMount>`
4. Inline Verified pill near "Ownership Documents" heading
5. Revoke menu (DropdownMenu + confirmation Dialog + toast)

## Ownership documents table refactor

`app/(shell)/property/[id]/ownership/queries.ts`:
1. Continue fetching from `ownership-documents/`
2. Additionally fetch from `documents/` filtered by `verifies.entityType === "ownership-record"`
3. Merge into one list

## Documents tab chip

`PropertyDocumentsPage.tsx`: chip "Verifies Ownership" when `verifies?.entityType === "ownership-record"`.

## Testing

1. Verified state — PROP-0001 ownership: "Edit data" + Verified pill.
2. Verify-to-unlock — PROP-0003 ownership: "Verify to unlock".
3. Unlock — delete OREC-0001, refresh.
4. Sole Ownership flow: step 3 grey + Skipped badge.
5. Tenancy in Common: add 2 co-owners 60/40; submit 60/30 → error.
6. Verify uploads create Document with `verifies` set.
7. Documents tab — "Verifies Ownership" chip.
8. Revoke — fields cleared, doc still exists.
