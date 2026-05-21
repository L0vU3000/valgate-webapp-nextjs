# Plan: Feature Unlock Wizard — Location Pillar

> Third pillar after Ownership and Financials.

## Context

Location is the simplest pillar:
- Tab already exists at `/property/[id]/location`
- Single entity: Property itself (no sub-records)
- All required fields already exist on the Property schema (`PropertyLocationSchema` + lat/lng + type + title)
- Mapbox is fully integrated — `LocationPickerModal` and `MapView` are battle-tested in the add-property flow
- The `entityType` enum already includes `"location-identity"` for `Document.verifies` (reserved during Ownership round)

### Design decisions locked
- **Verification fields namespaced on Property** (`PropertyLocationSchema`): `locationVerified`, `locationVerifiedAt`, `locationEvidenceDocIds`
- **`Document.verifies.entityType = "location-identity"`** with `entityId = propertyId`
- **Map step reuses `LocationPickerModal`** as a sub-modal launched from inside the wizard step
- **Address & Identity card added** to `PropertyLocationPage.tsx` at top, above parcel map
- **Title field allows "—" placeholder** — wizard does NOT force Hard/Soft selection
- **No tab rename, no route migration** — `activeTab="location"` is already correct

## Architecture

```
Server
├─ lib/data/types/property.ts                     + locationVerified, locationVerifiedAt, locationEvidenceDocIds in PropertyLocationSchema
├─ lib/data/db/properties.ts                      splitProperty() routes the 3 new fields into the location shard
├─ lib/actions/properties.actions.ts              + verifyLocation, revokeLocationVerification, getLocationWizardInitialAction
└─ lib/data/location-wizard.ts                    NEW — wizard hydration helper

Client (reusable framework — already exists)
└─ components/feature-unlock/pillars/
   └─ LocationUnlock.tsx                          NEW — schema, 4 steps, loadInitial, onSubmitData, verification

Client (page wiring)
├─ app/(shell)/property/[id]/_components/PropertyLocationPage.tsx   + Address & Identity card, headerSlot, wizard mount, verified pill, revoke menu
└─ app/(shell)/property/[id]/_components/PropertyDocumentsPage.tsx  + chip for verifies.entityType === "location-identity"

Seed data
├─ PROP-0001/location.json   full address + locationVerified true + DOC-0005
├─ PROP-0002/location.json   full address, no verification fields
├─ PROP-0003/location.json   province only (unlock state)
└─ DOC-0005/core.json        utility bill — verifies location-identity PROP-0001
```

## Type changes

### `lib/data/types/property.ts` — `PropertyLocationSchema`
```ts
locationVerified: z.boolean().optional(),
locationVerifiedAt: timestampSchema.optional(),
locationEvidenceDocIds: z.array(idSchema).optional(),
```

### `lib/data/types/document.ts` — confirm
`verifies.entityType` already includes `"location-identity"`. No edit needed.

## Seed data

- PROP-0001: full address + `locationVerified: true`, `locationVerifiedAt: 1736000000000`, `locationEvidenceDocIds: ["DOC-0005"]`
- PROP-0002: full address, no verification fields (verify-to-unlock state)
- PROP-0003: province only, no addressLine/city (unlock state)
- DOC-0005: utility bill PDF, `verifies: { entityType: "location-identity", entityId: "PROP-0001" }`

## Actions

```ts
verifyLocation(propertyId, evidenceDocIds)       → sets locationVerified + links docs
revokeLocationVerification(propertyId)            → clears fields + unlinks docs
getLocationWizardInitialAction(propertyId)        → returns { property }
```

## Wizard steps

1. **Address** — addressLine, addressLine2, city, province, zip, country
2. **Identity** — name (property label), type (8-option grid), title (3-option radio)
3. **Map pin** — static preview from Mapbox static API + "Adjust pin on map" button → opens LocationPickerModal sub-modal
4. **Verification** (VerificationStep) — "Proof of address", minFiles: 1, maxFiles: 5

## UnlockState logic

```ts
const unlockState =
  property.locationVerified
    ? { kind: "edit", entityId: property.id }
    : (property.addressLine && property.city)
      ? { kind: "verify", entityId: property.id }
      : { kind: "unlock" };
```

## Smoke test checklist

1. PROP-0001 location: header "Edit data" + emerald Verified pill. Address & Identity card shows full address.
2. PROP-0002 location: header "Verify to unlock". Wizard opens at verification step.
3. PROP-0003 location: header "Unlock feature". Wizard opens at step 1 with empty fields.
4. Full flow on PROP-0003: fill all steps, pin adjustment works, verify uploads → page shows Verified pill.
5. LocationPickerModal opens inside wizard, focus trap restored on close.
6. PROP-0001 Documents tab: DOC-0005 shows "Verifies Location" chip.
7. Revoke on PROP-0001: clears verification, DOC-0005 verifies removed, header reverts.
8. Other tabs unaffected.
