# Plan: Feature Unlock Wizard — Rental Pillar

> **Note on scope:** This plan is the **Rental** pillar implementation, fourth after Ownership, Financials, and Location.

---

## Context

Rental is the most complex pillar to date — multi-entity (Lease + Tenant + Payment) and conditional (skipped for non-investment properties). The framework (`components/feature-unlock/*`) is mature; this plan exercises two new patterns:

1. **`propertyUse` gating** — a new field on Property determines whether the Rental pillar applies at all. When `propertyUse !== "investment"`, the Rental tab page is replaced with a "Mark as investment" prompt.
2. **Multi-entity submit** — the wizard creates/updates a Lease + Tenant + optionally a Payment in one submit cycle.

### What the user gets after this work
- A new `propertyUse` field on Property (`"investment" | "personal" | "holiday"`) — defaults to `"investment"` for backward-compat with existing properties
- Header "Unlock feature / Verify to unlock / Edit data" button on the Rental tab (when applicable)
- A 4-step wizard: Active lease → Primary tenant → Recent payment (optional) → Verify
- Verification flips three namespaced fields on Property: `rentalVerified`, `rentalVerifiedAt`, `rentalEvidenceDocIds`
- A clean replacement state when the property is marked personal/holiday — centered card with "Mark as investment property" CTA
- "Verifies Rental" chip on documents linked as evidence
- Inline "Valgate Verified" pill + Revoke menu on the Rental page

### Design decisions locked
- **Verification fields namespaced on Property** (PropertyCoreSchema): `rentalVerified`, `rentalVerifiedAt`, `rentalEvidenceDocIds`. Persists across lease renewals.
- **New entityType `"rental"` added to `Document.verifies.entityType` enum** (with `entityId = propertyId`). The existing `"lease"` value stays unused.
- **`propertyUse` field on PropertyCoreSchema:** `z.enum(["investment", "personal", "holiday"]).optional()`. Defaults to undefined → treated as "investment" for backward compat.
- **When `propertyUse !== "investment"`:** `PropertyRentalPage` renders a centered "Not available" card with "Mark as investment property" CTA.
- **No yield calculation** in this plan — out of scope.
- **Tab stays in PropertyLayout** even for non-investment properties (the page itself handles the empty state).

---

## Architecture

```
Server
├─ lib/data/types/property.ts                + propertyUse, rentalVerified, rentalVerifiedAt, rentalEvidenceDocIds in PropertyCoreSchema
├─ lib/data/types/document.ts                + "rental" added to verifies.entityType enum
├─ lib/data/db/properties.ts                 splitProperty() routes the 4 new fields into the core shard
├─ lib/data/db/payments.ts                   (existing) — has create/list/get/remove
├─ lib/actions/properties.actions.ts         + verifyRental, revokeRentalVerification, getRentalWizardInitialAction
├─ lib/actions/payments.actions.ts           NEW — createPayment (no update; payments are immutable)
└─ lib/data/rental-wizard.ts                 NEW — wizard hydration helper

Client (reusable framework — already exists)
└─ components/feature-unlock/pillars/
   └─ RentalUnlock.tsx                       NEW — schema, 4 steps, loadInitial, onSubmitData, verification

Client (page wiring)
├─ app/(shell)/property/[id]/_components/PropertyRentalPage.tsx              + propertyUse gating, headerSlot, wizard mount, verified pill, revoke menu
└─ app/(shell)/property/[id]/_components/PropertyDocumentsPage.tsx           + chip mapping for verifies.entityType === "rental"

Progress derivation
└─ lib/data/derivations/progress.ts          rental pillar: if not investment → single "Not applicable" auto-passing check

Seed data
├─ PROP-0001/core.json                       propertyUse: "investment", rentalVerified: true, rentalVerifiedAt, rentalEvidenceDocIds: ["DOC-0007"]
├─ PROP-0002/core.json                       propertyUse: "investment" (has LEASE-0004/TEN-0004, no verification → verify state)
├─ PROP-0003/core.json                       propertyUse: "personal" (gating test → shows "not applicable" card)
├─ documents/DOC-0007/core.json              NEW — Lease_Agreement_2025.pdf, verifies.entityType: "rental", entityId: "PROP-0001"
├─ leases/LEASE-0004/core.json               NEW — Signed lease for PROP-0002
└─ tenants/TEN-0004/core.json                NEW — tenant for PROP-0002

Docs archive
└─ docs/feature-unlock/plan-rental.md        (this file)
```

---

## Implementation order executed

1. Type fields: `propertyUse`, `rentalVerified`, `rentalVerifiedAt`, `rentalEvidenceDocIds` on `PropertyCoreSchema`
2. Route new fields through `splitProperty()` in `lib/data/db/properties.ts`
3. `"rental"` added to `verifies.entityType` enum in `lib/data/types/document.ts`
4. Seed data: PROP-0001 verified, PROP-0002 investment (verify state), PROP-0003 personal (gating)
5. `verifyRental` + `revokeRentalVerification` + `getRentalWizardInitialAction` added to `properties.actions.ts`
6. New `lib/actions/payments.actions.ts` with `createPayment`
7. New `lib/data/rental-wizard.ts` hydration helper
8. Progress derivation guard: non-investment → auto-pass single "Not applicable" check
9. `components/feature-unlock/pillars/RentalUnlock.tsx` — full 3-step wizard + verification
10. `components/feature-unlock/UnlockButton.tsx` — added `editLabel` prop (defaults to "Edit ownership")
11. `PropertyRentalPage.tsx` — propertyUse gating + wizard mount + verified pill + revoke dialog
12. `PropertyDocumentsPage.tsx` — "rental" chip added to `ENTITY_TYPE_CHIP`
