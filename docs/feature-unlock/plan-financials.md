# Plan: Feature Unlock Wizard — Financials Pillar (with Valuation merge)

> **Note on scope:** This plan is the **Financials** pillar implementation, second after Ownership. The previously approved Ownership plan is preserved as **Appendix A** below so the implementer can archive both plans into `docs/feature-unlock/` as project documentation.

---

## Context

This plan builds on the Ownership pillar work. The Ownership pillar plan (Appendix A) and the framework doc (`docs/feature-unlock/framework.md`) are assumed implemented:
`<FeatureUnlockWizard>`, `<UnlockButton>`, `<VerificationStep>`, `<WizardProgress>`, `components/feature-unlock/types.ts`, `PropertyLayout.headerSlot`.

**Product decision baked into this plan:** the previously separate **Financials** and **Valuation History** pillars are merged into a single pillar called **Financials**. The tab is renamed from "Valuation" to "Financials" and the route from `/valuation` to `/financials`. The pillar count drops 8 → 7. Combined weight: 30% (= 20% prior Financials + 10% prior Valuation).

### What the user gets after this work
- A renamed tab (Valuation → **Financials**, icon: `Coins`) at `/property/[id]/financials`
- Legacy `/valuation` route redirects to `/financials` so bookmarks don't break
- Header "Unlock feature / Verify to unlock / Edit data" button on the Financials tab, dispatched by the same wizard framework Ownership uses
- A multi-step wizard capturing purchase, current value, mortgage, and annual costs, with optional verification
- Verification flips three namespaced fields on the **Property entity itself** (`financialsVerified`, `financialsVerifiedAt`, `financialsEvidenceDocIds`) and creates reverse links on the uploaded Documents
- An "Equity & Financial Position" card lives on the Financials page (copied — not yet removed — from Ownership)
- "Valgate Verified" pill + Revoke menu on the Financials page
- Combined progress pillar (30%) replaces the two old pillars on the home progress modal
- Both the Ownership plan AND this Financials plan archived into `docs/feature-unlock/` as MD files

### Design decisions already locked
- **Verification fields are namespaced on Property:** `financialsVerified`, `financialsVerifiedAt`, `financialsEvidenceDocIds`. This pattern scales — future pillars on Property can add `locationVerified`, etc., without colliding.
- **PropertyValuation records do NOT get individual `verified` fields.** Property-level verification covers "the financial picture is verified." The valuation collection grows independently.
- **No new entity collection.** All financial fields already live on Property.
- **`Document.verifies.entityType` is `"financials"`** with `entityId = propertyId`. The enum already includes `"financials"`.
- **Tab rename and route rename happen together.** Internal `activeTab` key changes from `"valuation"` to `"financials"`.
- **Old route stays as a thin redirect**, never removed (avoids 404s from external links/bookmarks).
- **Equity card on the Ownership page is NOT removed in this plan** — a copy is added on Financials. Cleanup deferred to a follow-up.
- **`Property.outstandingMortgage` is shared** between Ownership wizard and Financials wizard. It's literally one field — either wizard reads/writes it. No conflict resolution needed.
- **Tab icon: `Coins`** (from `lucide-react`).
- **`logAsValuation` default:** checked when latest valuation is older than 30 days; unchecked otherwise.

### UI design standard
All new UI must be created with **`/impeccable`** and **`/ui-ux-pro-max`** skills invoked. Specifically:
- `/impeccable:polish` on the renamed `PropertyFinancialsPage.tsx` after wiring
- `/impeccable:layout` on the new 5-card KPI row (verify 5-col → 2-col responsive collapse)
- `/impeccable:animate` on the wizard step transitions
- `/ui-ux-pro-max` for the revoke confirm dialog copy + structure
- Match `ProgressModal.tsx` visual language: `var(--val-primary-dark)`, emerald accents on verified states, 220–300ms ease-out

---

## Architecture

```
Server
├─ lib/data/types/property.ts                        + financialsVerified, financialsVerifiedAt, financialsEvidenceDocIds
├─ lib/data/db/properties.ts                         splitProperty() routes the 3 new fields into the finance shard
├─ lib/actions/properties.actions.ts                 + verifyFinancials, revokeFinancialsVerification
└─ lib/data/financials-wizard.ts                     NEW — wizard hydration helper

Client (reusable framework — already exists from Ownership work)
└─ components/feature-unlock/
   ├─ types.ts                                       (unchanged — already supports "financials" pillarKey)
   ├─ FeatureUnlockWizard.tsx                        (unchanged)
   ├─ WizardProgress.tsx                             (unchanged)
   ├─ VerificationStep.tsx                           (unchanged)
   ├─ UnlockButton.tsx                               (unchanged)
   └─ pillars/
      └─ FinancialsUnlock.tsx                        NEW

Client (page rename + wiring)
├─ components/property/PropertyLayout.tsx                                    tab[5]: "valuation"→"financials", "Valuation"→"Financials", TrendingUp→Coins
├─ app/(shell)/property/[id]/financials/                                     NEW (renamed from valuation/)
│   ├─ page.tsx                                                              activeTab="financials", getFinancialsPageData
│   └─ queries.ts                                                            renamed
├─ app/(shell)/property/[id]/valuation/page.tsx                              REWRITTEN — single-line redirect()
├─ app/(shell)/property/[id]/_components/PropertyFinancialsPage.tsx          renamed from PropertyValuationPage.tsx; +KPI row, equity card, wizard wiring
└─ app/(shell)/property/[id]/_components/PropertyDocumentsPage.tsx           + chip mapping for verifies.entityType === "financials"

Derivations
├─ lib/data/derivations/progress.ts                                          merge pillars (drop valuation; financials weight 30, href, +2 checks)
└─ lib/data/derivations/property-financials.ts                               NEW — move buildPropertyFinancials here for shared use

Docs
└─ docs/feature-unlock/
   ├─ framework.md                                                           (exists)
   ├─ plan-ownership.md                                                      NEW — from Appendix A
   └─ plan-financials.md                                                     NEW — from this plan body
```

---

## A. Type changes

### `lib/data/types/property.ts` — extend `PropertyFinanceSchema`

Add three namespaced optional fields:
```ts
financialsVerified: z.boolean().optional(),
financialsVerifiedAt: timestampSchema.optional(),
financialsEvidenceDocIds: z.array(idSchema).optional(),
```

All additive; no migration needed because every existing field in `PropertyFinanceSchema` is optional except `buyNumeric`.

### `lib/data/db/properties.ts` — extend `splitProperty()`

The `finance` shard branch must include the three new fields when present. `stripUndefined()` already filters absent fields, so revoke-by-undefining works cleanly.

### `lib/data/types/document.ts` — confirm
`verifies.entityType` already includes `"financials"` (added in Ownership round). No edit needed.

### `lib/data/types/progress.ts` — confirm
`ProgressPillar.key` is `z.string()`, not an enum. Removing `"valuation"` does not break the schema.

---

## B. Seed data updates

**PROP-0001 — Verified state (Edit data button):**
File: `public/data/users/demo-user/properties/PROP-0001/finance.json`
Add:
```json
"financialsVerified": true,
"financialsVerifiedAt": 1736000000000,
"financialsEvidenceDocIds": ["DOC-0001"]
```
(Use any existing DOC id under `public/data/users/demo-user/documents/`.)

**PROP-0002 — Verify-to-unlock state:** leave as-is (has partial financial data, no verification fields).

**PROP-0003 — Unlock state:** clear `currentMarketValue` and `outstandingMortgage` from `finance.json` so the page reads as "no financial data yet."

---

## C. Route migration (rename)

### Move directory
`app/(shell)/property/[id]/valuation/` → `app/(shell)/property/[id]/financials/`

Inside the new directory:
- `page.tsx` — update import to `PropertyFinancialsPage`, call `getFinancialsPageData(id)`
- `queries.ts` — rename exported function to `getFinancialsPageData`. Keep returning `{ valuations }` (Property comes in as a prop).

### Recreate old route as redirect
Replace `app/(shell)/property/[id]/valuation/page.tsx` with:
```ts
import { redirect } from "next/navigation";

export default async function Page({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/property/${id}/financials`);
}
```

### Rename component file
`app/(shell)/property/[id]/_components/PropertyValuationPage.tsx` → `PropertyFinancialsPage.tsx`. Export `PropertyFinancialsPage`.

Inside:
- Line 185: `<PropertyLayout activeTab="valuation">` → `activeTab="financials"`
- Breadcrumb (line 196) and `<h1>` (line 200): "Valuation" → "Financials"
- Subtitle (line 201–203): update to describe the merged scope

### PropertyLayout tab key + label + icon
File: `components/property/PropertyLayout.tsx`
Line 18:
```ts
{ key: "valuation", label: "Valuation", icon: TrendingUp },
```
becomes
```ts
{ key: "financials", label: "Financials", icon: Coins },
```
Add `Coins` to the `lucide-react` import (line 5).

---

## D. Page content additions

### D.1 Top KPI row — 5 cards
Replace the existing 3-card row with 5 KPI cards (5 columns on desktop, 2 on mobile):

| KPI | Source | Format |
|---|---|---|
| Purchase Price | `property.buyNumeric` | `$1,278,000` |
| Current Value | latest valuation, fallback `property.currentMarketValue` | `$1,450,000` |
| Outstanding Mortgage | `property.outstandingMortgage` | `$760,000` |
| Equity | `currentValue − outstandingMortgage` | `$690,000` |
| Annual Holding Cost | `(annualPropertyTax ?? 0) + (annualInsurance ?? 0)` | `$24,200` |

Reuse existing `KpiCard`, `useCountUp`, `fade` already in the file.

### D.2 Equity & Financial Position card (copy from Ownership)
Copy the JSX from `PropertyOwnershipPage.tsx` lines 154–199 into the Financials page below the KPI row (above the chart).

Move the helper `buildPropertyFinancials` from `app/(shell)/property/[id]/ownership/queries.ts` lines 58–78 to a new file `lib/data/derivations/property-financials.ts`. Update both call sites (ownership queries.ts and the new financials page) to import from there.

**Do not remove the card from Ownership in this plan** — cleanup is a follow-up.

### D.3 Header slot
```tsx
<PropertyLayout
  activeTab="financials"
  property={property}
  headerSlot={<UnlockButton state={unlockState} onClick={openWizard} />}
>
```

### D.4 Inline Verified pill + Revoke menu
Near the KPI row's heading, render an emerald "Valgate Verified" pill when `property.financialsVerified === true`, with a `…` `DropdownMenu` containing "Revoke verification" (destructive). On confirm → shadcn `Dialog` confirmation → `revokeFinancialsVerification(property.id)` → toast.

### D.5 Hardcoded sections — leave as-is
Comparable Sales, Investment Performance, Value Drivers, Professional Appraisal CTA, Market Insight — all stay hardcoded. Out of scope for this plan.

---

## E. Progress pillar update

### `lib/data/derivations/progress.ts`

Remove the **"valuation"** pillar block (current lines 120–128).

Rewrite the **"financials"** pillar:
```ts
{
  key: "financials",
  name: "Financials",
  weight: 30,                                          // was 20
  href: `/property/${pid}/financials`,                 // was /ownership
  checks: [
    { label: "Purchase price set", done: p.buyNumeric > 0 },
    { label: "Purchase date set", done: !!p.purchaseDate },
    { label: "Market value recorded", done: !!p.currentMarketValue && p.currentMarketValue > 0 },
    { label: "Mortgage / debt recorded", done: p.outstandingMortgage !== undefined },
    { label: "Annual property tax", done: !!p.annualPropertyTax && p.annualPropertyTax > 0 },
    { label: "Annual insurance", done: !!p.annualInsurance && p.annualInsurance > 0 },
    { label: "Valuation on file", done: valuations.length > 0 },
    { label: "6+ months of history", done: valuations.length >= 6 },
  ],
},
```

Verify weights still sum to 100: `15 + 30 + 20 + 15 + 10 + 5 + 5 = 100`. ✅

ProgressModal iterates the returned pillars — no UI changes needed.

---

## F. CRUD layer additions

### `lib/actions/properties.actions.ts` — add two actions

```ts
export async function verifyFinancials(
  propertyId: string,
  evidenceDocIds: string[],
): Promise<ActionResult<Property>> {
  const userId = getCurrentUserId();
  if (evidenceDocIds.length === 0) {
    return { ok: false, error: "At least one evidence document is required." };
  }
  const updated = await db.update(userId, propertyId, {
    financialsVerified: true,
    financialsVerifiedAt: Date.now(),
    financialsEvidenceDocIds: evidenceDocIds,
  });
  if (!updated) return { ok: false, error: "Property not found" };

  const docsDb = await import("@/lib/data/db/documents");
  for (const docId of evidenceDocIds) {
    await docsDb.update(userId, docId, {
      verifies: { entityType: "financials", entityId: propertyId },
    });
  }
  revalidateTag("properties");
  revalidateTag("documents");
  return { ok: true, data: updated };
}

export async function revokeFinancialsVerification(
  propertyId: string,
): Promise<ActionResult<Property>> {
  const userId = getCurrentUserId();
  const current = await db.get(userId, propertyId);
  if (!current) return { ok: false, error: "Property not found" };

  const previousDocIds = current.financialsEvidenceDocIds ?? [];

  const updated = await db.update(userId, propertyId, {
    financialsVerified: undefined,
    financialsVerifiedAt: undefined,
    financialsEvidenceDocIds: undefined,
  });
  if (!updated) return { ok: false, error: "Property not found" };

  const docsDb = await import("@/lib/data/db/documents");
  for (const docId of previousDocIds) {
    await docsDb.update(userId, docId, { verifies: undefined });
  }
  revalidateTag("properties");
  revalidateTag("documents");
  return { ok: true, data: updated };
}
```

**Note on undefined-write:** confirm during implementation that setting the namespaced fields to `undefined` results in the keys being absent on disk. If they end up as `null`, post-process by deleting them before `PropertySchema.parse`.

---

## G. Wizard hydration helper

### `lib/data/financials-wizard.ts` — NEW

```ts
import "server-only";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import * as db from "@/lib/data/db";
import type { Property } from "@/lib/data/types/property";
import type { PropertyValuation } from "@/lib/data/types/property-valuation";

export async function getFinancialsWizardInitial(propertyId: string): Promise<{
  property: Property | null;
  latestValuation: PropertyValuation | null;
}> {
  const userId = getCurrentUserId();
  const property = await db.properties.get(userId, propertyId);
  const allVals = await db.propertyValuations.list(userId);
  const sorted = allVals
    .filter((v) => v.propertyId === propertyId)
    .sort((a, b) => a.recordedAt - b.recordedAt);
  return { property, latestValuation: sorted.at(-1) ?? null };
}
```

---

## H. Financials pillar config

### `components/feature-unlock/pillars/FinancialsUnlock.tsx` — NEW

Exports `financialsWizardConfig` and `<FinancialsUnlockMount propertyId open onOpenChange startAt />`.

### Master Zod schema
```ts
const FinancialsWizardSchema = z.object({
  // Step 1 — Acquisition
  purchasePrice: z.coerce.number().nonnegative().optional(),
  purchaseDate: z.string().optional(),        // yyyy-mm-dd
  downPayment: z.coerce.number().nonnegative().optional(),
  closingCosts: z.coerce.number().nonnegative().optional(),

  // Step 2 — Current value
  currentMarketValue: z.coerce.number().nonnegative().optional(),
  logAsValuation: z.boolean().default(false),

  // Step 3 — Mortgage & debt
  outstandingMortgage: z.coerce.number().nonnegative().optional(),
  monthlyPayment: z.coerce.number().nonnegative().optional(),
  interestRate: z.coerce.number().nonnegative().optional(),

  // Step 4 — Annual costs
  annualPropertyTax: z.coerce.number().nonnegative().optional(),
  taxAssessmentValue: z.coerce.number().nonnegative().optional(),
  annualInsurance: z.coerce.number().nonnegative().optional(),
});
```

### Steps

1. **Acquisition** — `purchasePrice`, `purchaseDate`, `downPayment`, `closingCosts`. Hint: "What you paid and when."
2. **Current value** — `currentMarketValue` + `logAsValuation` checkbox ("Also record this as a new valuation entry for the current month"). Show latest valuation as a hint. Default `logAsValuation` to checked when latest valuation is older than 30 days (computed in `loadInitial`).
3. **Mortgage & debt** — `outstandingMortgage`, `monthlyPayment`, `interestRate`. Hint: "Loan principal still owed and current payment." Loan structure fields (lender, term) remain on Ownership wizard.
4. **Annual costs** — `annualPropertyTax`, `taxAssessmentValue`, `annualInsurance` in two-column grid.
5. **Verification** (handled by `<VerificationStep>`):
   - Title: "Verify financials"
   - Body: "Upload a mortgage statement, insurance schedule, or completion statement."
   - documentLabel: "Mortgage statement"
   - Declaration: "I confirm these financial figures are accurate to the best of my knowledge and the uploaded documents are authentic."
   - minFiles: 1, maxFiles: 5

No `shouldSkip` rules needed.

### `loadInitial`
```ts
async loadInitial({ propertyId }) {
  const { property, latestValuation } = await getFinancialsWizardInitial(propertyId);
  if (!property) return { values: {}, entityId: null, verified: false };

  const purchaseDateStr = property.purchaseDate
    ? new Date(property.purchaseDate).toISOString().slice(0, 10)
    : undefined;
  const stale = !latestValuation
    || (Date.now() - latestValuation.recordedAt) > 30 * 24 * 60 * 60 * 1000;

  return {
    entityId: property.id,
    verified: property.financialsVerified === true,
    values: {
      purchasePrice: property.buyNumeric || undefined,
      purchaseDate: purchaseDateStr,
      currentMarketValue: property.currentMarketValue,
      logAsValuation: stale,
      outstandingMortgage: property.outstandingMortgage,
      monthlyPayment: property.monthlyPayment,
      interestRate: property.interestRate,
      annualPropertyTax: property.annualPropertyTax,
      taxAssessmentValue: property.taxAssessmentValue,
      annualInsurance: property.annualInsurance,
    },
  };
}
```

### `onSubmitData`
```ts
async onSubmitData({ values, propertyId }) {
  const patch: Partial<Property> = {
    buyNumeric: values.purchasePrice ?? 0,
    purchasePrice: values.purchasePrice?.toString(),
    purchaseDate: values.purchaseDate
      ? new Date(values.purchaseDate).getTime()
      : undefined,
    currentMarketValue: values.currentMarketValue,
    outstandingMortgage: values.outstandingMortgage,
    monthlyPayment: values.monthlyPayment,
    interestRate: values.interestRate,
    annualPropertyTax: values.annualPropertyTax,
    taxAssessmentValue: values.taxAssessmentValue,
    annualInsurance: values.annualInsurance,
  };
  const propRes = await updateProperty(propertyId, patch);
  if (!propRes.ok) return propRes;

  if (values.logAsValuation && values.currentMarketValue) {
    const now = new Date();
    const month = `${now.toLocaleString("en-US", { month: "short" })} ${now.getFullYear()}`;
    await createPropertyValuation({
      propertyId,
      month,
      price: values.currentMarketValue,
      recordedAt: Date.now(),
    });
  }
  return { ok: true, data: { entityId: propertyId } };
}
```

### `verification.onVerify`
```ts
onVerify: async ({ entityId, docIds }) => verifyFinancials(entityId, docIds),
```

---

## I. Page wiring — `PropertyFinancialsPage.tsx`

After rename, add wizard wiring:
```tsx
const unlockState: UnlockState = property.financialsVerified
  ? { kind: "edit", entityId: property.id }
  : (property.currentMarketValue || property.outstandingMortgage)
    ? { kind: "verify", entityId: property.id }
    : { kind: "unlock" };

const [wizardOpen, setWizardOpen] = useState(false);
const [wizardStartAt, setWizardStartAt] = useState<"data" | "verification">("data");

function openWizard() {
  setWizardStartAt(unlockState.kind === "verify" ? "verification" : "data");
  setWizardOpen(true);
}
```

Pass `headerSlot={<UnlockButton state={unlockState} onClick={openWizard} />}` to PropertyLayout.

Mount the wizard:
```tsx
<FinancialsUnlockMount
  open={wizardOpen}
  onOpenChange={setWizardOpen}
  propertyId={property.id}
  startAt={wizardStartAt}
/>
```

Add inline emerald "Valgate Verified" pill above the KPI row when `property.financialsVerified === true`. Add the `…` DropdownMenu with destructive "Revoke verification" → confirmation Dialog → `revokeFinancialsVerification`.

---

## J. Documents tab chip

Extend `app/(shell)/property/[id]/_components/PropertyDocumentsPage.tsx` chip lookup:
```ts
const VERIFIES_LABEL: Record<string, string> = {
  "ownership-record": "Verifies Ownership",
  "financials": "Verifies Financials",
};
```

For Financials, `entityId === propertyId` — no filtering quirk; the chip renders on any document attached to the property with the right `verifies.entityType`.

---

## K. Implementation order

Each task touches 1–3 files.

1. **Archive both plans into the repo** — create `docs/feature-unlock/plan-ownership.md` (full content from Appendix A below) and `docs/feature-unlock/plan-financials.md` (full content from this plan's main body, sections A–N, excluding Appendix A).
2. **Type fields** — add three namespaced verification fields to `PropertyFinanceSchema` in `lib/data/types/property.ts`. Route them through `splitProperty()` in `lib/data/db/properties.ts`.
3. **Seed data** — PROP-0001 verified (add 3 fields to `finance.json`); PROP-0003 unlocked (remove `currentMarketValue` + `outstandingMortgage` from `finance.json`); PROP-0002 left as-is.
4. **Verification actions** — add `verifyFinancials` + `revokeFinancialsVerification` to `lib/actions/properties.actions.ts`.
5. **Wizard hydration helper** — new `lib/data/financials-wizard.ts`.
6. **Move `buildPropertyFinancials`** — from `app/(shell)/property/[id]/ownership/queries.ts` to `lib/data/derivations/property-financials.ts`. Update both import sites.
7. **Progress merge** — edit `lib/data/derivations/progress.ts`: drop valuation pillar; reshape financials (weight 30, href to `/financials`, +2 valuation checks).
8. **Pillar config** — new `components/feature-unlock/pillars/FinancialsUnlock.tsx`.
9. **PropertyLayout tab rename** — `components/property/PropertyLayout.tsx` line 18: key `"valuation"` → `"financials"`, label `"Valuation"` → `"Financials"`, icon `TrendingUp` → `Coins` (update lucide-react import).
10. **Directory rename** — move `app/(shell)/property/[id]/valuation/` → `app/(shell)/property/[id]/financials/`. Rename `getValuationPageData` → `getFinancialsPageData`. Update page.tsx import + activeTab.
11. **Rename component file** — `PropertyValuationPage.tsx` → `PropertyFinancialsPage.tsx`. Update export name, `activeTab`, breadcrumb, page title, subtitle. Wire `headerSlot`, `<FinancialsUnlockMount>`, inline verified pill, revoke menu.
12. **Equity & Financial Position card** — copy JSX from Ownership page (lines 154–199) into Financials page below the KPI row.
13. **5-KPI row** — add at the top of `PropertyFinancialsPage.tsx`. Reuse `KpiCard`, `useCountUp`, `fade`.
14. **Recreate `/valuation` as redirect** — rewrite `app/(shell)/property/[id]/valuation/page.tsx` to single-line `redirect(...)`.
15. **Documents tab chip** — extend `PropertyDocumentsPage.tsx` chip mapping with `"financials": "Verifies Financials"`.
16. **/impeccable + /ui-ux-pro-max polish pass** on `PropertyFinancialsPage.tsx`, `FinancialsUnlock.tsx`, the inline verified pill area, and the revoke confirm dialog.
17. **Smoke test** (see L below).

---

## L. Verification / testing

1. **Start dev:** `bun dev`. Run from project root.
2. **State: Verified (Edit data)** — Visit `/property/PROP-0001/financials`. Header shows **"Edit data"** + emerald **Verified** pill. Wizard opens prefilled.
3. **State: Verify (data exists, not verified)** — Visit `/property/PROP-0002/financials`. Header shows **"Verify to unlock"**. Wizard opens directly at verification step.
4. **State: Unlock (empty)** — Visit `/property/PROP-0003/financials`. Header shows **"Unlock feature"**. Wizard opens at step 1 with empty fields.
5. **Full unlock flow on PROP-0003:**
   - Step 1: purchase price $850,000, date 2020-06-15.
   - Step 2: current value $980,000, check "log as valuation" → submit creates a new `VAL-XXXX` for current month with price 980000.
   - Step 3: outstandingMortgage 420000, monthlyPayment 2100, interestRate 4.2.
   - Step 4: annualPropertyTax 8800, annualInsurance 2400.
   - Verification: upload PDF, check declaration, click Verify.
   - Wizard closes; page shows "Edit data" + Verified pill.
   - Disk: `properties/PROP-0003/finance.json` has `financialsVerified: true`, `financialsVerifiedAt`, `financialsEvidenceDocIds: ["DOC-XXXX"]`.
   - Disk: `documents/DOC-XXXX/core.json` has `verifies: { entityType: "financials", entityId: "PROP-0003" }`.
6. **Equity card** — Confirm the "Equity & Financial Position" card displays on the Financials tab for all three properties.
7. **KPI row** — Confirm 5 KPI cards animate up; "Annual Holding Cost" = tax + insurance (PROP-0003 post-flow: 11,200).
8. **Old `/valuation` redirect** — Visit `/property/PROP-0001/valuation`. Should redirect to `/property/PROP-0001/financials`.
9. **Tab name + active state** — On the Financials page, tab strip shows "Financials" with active indicator.
10. **Documents tab chip** — Visit `/property/PROP-0003/documents`. New mortgage statement DOC shows **"Verifies Financials"** emerald chip.
11. **Revoke verification** — On PROP-0001 Financials, click `…` next to Verified pill → "Revoke verification" → Confirm. Disk: `finance.json` no longer has the three `financials*` fields; linked doc no longer has `verifies`. Header reverts to "Verify to unlock". Doc still exists.
12. **Progress modal merger** — From `/portfolio`, open progress modal for PROP-0001. Shows **7 pillars** instead of 8; "Financials" weight 30, 8 checks total; standalone "Valuation History" pillar is gone. Weights sum to 100.
13. **Ownership page unchanged** — Visit `/property/PROP-0001/ownership`. Still shows its Equity & Financial Position card (duplicate, intentional). Ownership header still shows its own Unlock button + Verified pill (separate verification).
14. **Other tabs unaffected** — `/safety`, `/rental`, `/location`, `/overview`, `/documents` work as before.
15. **Shared mortgage field** — Edit mortgage in Ownership wizard step 2 → Financials KPI updates. Edit mortgage in Financials wizard step 3 → Ownership "Remaining Mortgage" KPI updates. Same field, both wizards read/write it.

---

## M. Existing functions/utilities to reuse

| Need | Reuse from |
|---|---|
| Wizard framework | `components/feature-unlock/*` (all already built in Ownership round) |
| ActionResult wrapper | existing in `lib/actions/properties.actions.ts` |
| Auth | `getCurrentUserId()` |
| Cache invalidation | `revalidateTag("properties")`, `revalidateTag("documents")` |
| Property update | existing `updateProperty` in `lib/actions/properties.actions.ts` |
| Property CRUD | `lib/data/db/properties.ts` (full CRUD already exists) |
| Document upload | `uploadDocument` in `lib/actions/documents.actions.ts` |
| Document update | `documents.update` in `lib/data/db/documents.ts` |
| PropertyValuation create | `createPropertyValuation` in `lib/actions/property-valuations.actions.ts` |
| Dialog shell | `components/ui/dialog.tsx` |
| Form primitives | `components/ui/{form,input,label}.tsx` |
| Dropdown menu | `components/ui/dropdown-menu.tsx` |
| KPI card + animations | already in current `PropertyValuationPage.tsx` (`KpiCard`, `useCountUp`, `fade`) |
| Property financials helper | `buildPropertyFinancials` (moving to `lib/data/derivations/property-financials.ts`) |

---

## N. Risks / things to watch

- **Zod stripping `undefined` on revoke** — confirm in step 11 of smoke test that the three `financials*` fields are absent (not `null`) after revoke. If `null`, post-process by deleting keys.
- **Hardcoded sections** on the Financials page (Investment Performance, Comparable Sales) stay as-is. Not a regression, but follow-ups should wire them with real data.
- **`/valuation` redirect** — does not preserve query strings. Acceptable.
- **Duplicate Equity card** between Ownership and Financials pages — intentional v1 state; cleanup is a follow-up.
- **Ownership wizard's mortgage patch** — Ownership step 2 still writes `Property.outstandingMortgage`. Financials wizard step 3 also writes it. Same field — last-write-wins, but since both wizards READ the same field, the data is consistent. No conflict.
- **Progress modal pillar count** — drops 8 → 7. Confirm the modal doesn't have a hard-coded count anywhere.

---

# Appendix A — Ownership Pillar Plan

> This is the previously approved Ownership pillar plan. Implementation task 1 above copies this entire appendix verbatim to `docs/feature-unlock/plan-ownership.md`. Trim the leading "Appendix A" header and this note when copying.

## Context

Valgate's product model has two layers: (1) a **frictionless wizard** to add a property with any data the user knows, and (2) a per-pillar **verification process** where users upload supporting documents to earn "Valgate Verified" status. Features only fully unlock when the underlying data has been verified — because some features (yield calc, lender share, estate summary) only have value if the numbers can be trusted.

The full feature/requirement spec lives in `docs/feature-requirements.md`. This plan implements the **first reference pillar (Ownership)** plus a **reusable wizard primitive** that all 8 future pillars will plug into.

### What the user gets after this work
- An **"Unlock feature" button** in the property page header that dispatches by active tab (only Ownership is wired in this round)
- A **multi-step modal wizard** that captures ownership structure, loan, and co-owners, with an optional final verification step
- Verification uploads documents to the central `documents/` collection, links them via a new `Document.verifies` field, and sets `verified: true` on the OwnershipRecord
- A clean "Edit data" + "Revoke verification" lifecycle, both surfaced in the UI
- A reusable `<FeatureUnlockWizard>` shell with a typed config contract — adding the next pillar should require zero changes to the shell

### Design decisions already locked
- **Verification on the entity** (`OwnershipRecord.verified, verifiedAt, evidenceDocIds`) — not a separate collection
- **Reverse link on Document** (`Document.verifies: { entityType, entityId }`)
- **Reusable wizard primitive** — shared shell, per-pillar config
- **CRUD semantics:** "Edit data" reopens the wizard; "Revoke verification" is a separate action that clears verification fields but keeps data
- **Three-state button:** Unlock feature / Verify to unlock / Edit data + Verified badge
- **Ownership is the first pillar**
- **Evidence docs:** central `documents/` collection only; Ownership page reads from it (no duplication)
- **Wizard patches both** `OwnershipRecord.loanAmount` and `Property.outstandingMortgage`
- **Skipped steps remain visible** in the progress rail, greyed out with a "Skipped" badge

### UI design standard
All new UI in this plan (`FeatureUnlockWizard`, `WizardProgress`, `VerificationStep`, `UnlockButton`, and the inline verified pill / revoke menu inside `PropertyOwnershipPage`) must be created with the `/impeccable` and `/ui-ux-pro-max` skills invoked. The wizard's visual language should match the existing `ProgressModal` (font tokens, `var(--val-primary-dark)`, emerald accents for verified states).

## Architecture

```
Server
├─ lib/data/types/ownership-record.ts        + verified, verifiedAt, evidenceDocIds
├─ lib/data/types/document.ts                + verifies sub-object
├─ lib/data/db/co-owners.ts                  + update()
├─ lib/actions/co-owners.actions.ts          NEW — create/update/remove
├─ lib/actions/ownership-records.actions.ts  + verifyOwnership, revokeOwnershipVerification
├─ lib/actions/properties.actions.ts         (reuse existing updateProperty for outstandingMortgage patch)
└─ lib/data/ownership-wizard.ts              NEW — wizard hydration helper

Client (reusable framework)
└─ components/feature-unlock/
   ├─ types.ts                               NEW — WizardConfig contract
   ├─ FeatureUnlockWizard.tsx                NEW — Dialog + RHF + step machine
   ├─ WizardProgress.tsx                     NEW — left rail
   ├─ VerificationStep.tsx                   NEW — upload + declaration
   ├─ UnlockButton.tsx                       NEW — 3-state button + badge
   └─ pillars/
      └─ OwnershipUnlock.tsx                 NEW — config + mount component

Client (page wiring)
├─ components/property/PropertyLayout.tsx                                  + headerSlot prop
├─ app/(shell)/property/[id]/_components/PropertyOwnershipPage.tsx         wire wizard + slot + badge + revoke
├─ app/(shell)/property/[id]/ownership/queries.ts                          + read evidence docs from central Documents
└─ app/(shell)/property/[id]/_components/PropertyDocumentsPage.tsx         + "Verifies Ownership" chip
```

## Type changes

### `lib/data/types/ownership-record.ts`
Add three optional fields (between `distributionMethod` and `createdAt`):
```ts
verified: z.boolean().optional(),
verifiedAt: timestampSchema.optional(),
evidenceDocIds: z.array(idSchema).optional(),
```

### `lib/data/types/document.ts`
Add a reverse-link sub-object:
```ts
verifies: z.object({
  entityType: z.enum([
    "ownership-record", "co-owner", "inspection", "lease",
    "valuation", "estate-plan", "location-identity", "financials",
  ]),
  entityId: idSchema,
}).optional(),
```

### Seed data
`OREC-0001` and `OREC-0002`: set `verified: true` with `verifiedAt` and `evidenceDocIds`. Leave `OREC-0003` unverified.

## CRUD layer additions

### `lib/data/db/co-owners.ts` — add `update`
Mirror the pattern in `lib/data/db/ownership-records.ts`. CoOwners currently has list/get/create/remove but no update.

### `lib/actions/co-owners.actions.ts` — NEW
```ts
createCoOwner(data: Omit<CoOwner, "id">): Promise<ActionResult<CoOwner>>
updateCoOwner(id: string, patch: Partial<CoOwner>): Promise<ActionResult<CoOwner>>
removeCoOwner(id: string): Promise<ActionResult<void>>
```

### `lib/actions/ownership-records.actions.ts` — add two actions

```ts
verifyOwnership(id: string, evidenceDocIds: string[]): Promise<ActionResult<OwnershipRecord>>
```
1. Validate `evidenceDocIds` non-empty.
2. For each docId: `documents.update(userId, docId, { verifies: { entityType: "ownership-record", entityId: id } })`.
3. `ownership-records.update(userId, id, { verified: true, verifiedAt: Date.now(), evidenceDocIds })`.
4. Revalidate `ownership-records` and `documents` tags.

```ts
revokeOwnershipVerification(id: string): Promise<ActionResult<OwnershipRecord>>
```
1. Read current record to find `evidenceDocIds`.
2. For each docId: `documents.update(userId, docId, { verifies: undefined })`.
3. Update record: clear `verified`, `verifiedAt`, `evidenceDocIds`.
4. Revalidate same tags. Documents are NOT deleted.

### `lib/data/ownership-wizard.ts` — NEW
- `getOwnershipWizardInitial(propertyId)` → `{ record: OwnershipRecord | null, coOwners: CoOwner[] }`
- `listCoOwnersForProperty(propertyId)` → `CoOwner[]`

## Reusable wizard primitive

### `components/feature-unlock/types.ts`
```ts
export type WizardStepDef<TSchema extends ZodTypeAny> = {
  key: string;
  title: string;
  description?: string;
  fields: ReadonlyArray<keyof z.infer<TSchema> | string>;
  render: (ctx: WizardStepRenderCtx<TSchema>) => React.ReactNode;
  shouldSkip?: (values: z.infer<TSchema>) => boolean;
};

export type WizardConfig<TSchema extends ZodTypeAny> = {
  pillarKey: "ownership" | "financials" | "rental" | "safety"
           | "location" | "valuation" | "estate" | "documents";
  title: string;
  schema: TSchema;
  loadInitial: (args: { propertyId: string })
    => Promise<{ values: Partial<z.infer<TSchema>>; entityId: string | null; verified: boolean }>;
  onSubmitData: (args: WizardSubmitArgs<TSchema>)
    => Promise<ActionResult<{ entityId: string }>>;
  verification?: {
    title: string;
    declaration: string;
    documentLabel: string;
    minFiles: number;
    maxFiles: number;
    onVerify: (args: { entityId: string; docIds: string[]; propertyId: string })
      => Promise<ActionResult<void>>;
  };
  steps: ReadonlyArray<WizardStepDef<TSchema>>;
};

export type UnlockState =
  | { kind: "unlock" }
  | { kind: "verify"; entityId: string }
  | { kind: "edit"; entityId: string };
```

### `<FeatureUnlockWizard>`
- Shell: shadcn `Dialog`, `max-w-2xl`, two-column layout
- Form: `react-hook-form` with `zodResolver(config.schema)`, hydrated from `config.loadInitial`
- Step machine: `stepIndex` over `config.steps` (filtered through `shouldSkip`), then verification
- Navigation: `Next` calls `form.trigger(currentStep.fields)`; on last data step also calls `config.onSubmitData`
- `startAt` prop: `"data"` (default) or `"verification"`
- No localStorage drafts

### `<WizardProgress>`
- Renders all steps including skipped ones
- Active: `var(--val-primary-dark)` dot; Completed: emerald check; Skipped: grey dot + "Skipped" badge

### `<VerificationStep>`
- File input (multiple), staged list, declaration checkbox, "Verify" button
- Sequential `uploadDocument(propertyId, formData)`, then `config.verification.onVerify`

### `<UnlockButton>`
Three states by `UnlockState.kind`:
- `unlock` → primary gradient "Unlock feature"
- `verify` → amber outline "Verify to unlock"
- `edit` → secondary outline "Edit data" + emerald Verified pill

## Ownership pillar config — `components/feature-unlock/pillars/OwnershipUnlock.tsx`

Exports `ownershipWizardConfig` and `<OwnershipUnlockMount propertyId open onOpenChange startAt />`.

### Master Zod schema
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
  coOwners: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    role: CoOwnerRoleSchema,
    sharePercent: z.coerce.number().min(0).max(100),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
  })).default([]),
}).superRefine((vals, ctx) => {
  if (vals.holdingType !== "Sole Ownership") {
    if (vals.coOwners.length === 0) {
      ctx.addIssue({ code: "custom", path: ["coOwners"], message: "Add at least one co-owner" });
    }
    const total = vals.coOwners.reduce((s, c) => s + (c.sharePercent ?? 0), 0);
    if (Math.abs(total - 100) > 0.01) {
      ctx.addIssue({ code: "custom", path: ["coOwners"], message: `Shares must total 100% (currently ${total}%)` });
    }
  }
});
```

### Steps
1. **Structure** — `holdingType` radio, `distributionMethod` radio (only if not Sole)
2. **Loan / financing** — all fields optional
3. **Co-owners** *(skip if Sole Ownership)* — `useFieldArray` for dynamic rows
4. **Verification:** Title "Verify ownership", Declaration "I confirm I am the legal owner...", minFiles 1, documentLabel "Title Deed"

### `onSubmitData`
1. OwnershipRecord update or create
2. If `loanAmount` provided, also patch `Property.outstandingMortgage` via `updateProperty`
3. Co-owners diff: re-fetch existing, update existing rows by id, create rows without id, remove orphaned. If Sole, remove all co-owners.

### `verification.onVerify`
Calls `verifyOwnership(entityId, docIds)`.

## PropertyLayout integration
Add `headerSlot?: React.ReactNode` prop. Render between progress pill and Bell button.

## PropertyOwnershipPage updates
1. Remove non-functional "Add Owner" button at lines 116–125
2. Add wizard state, compute `UnlockState`, pass `headerSlot`
3. Mount `<OwnershipUnlockMount>`
4. Inline emerald Verified pill near "Ownership Documents" heading
5. Revoke verification menu (DropdownMenu + confirmation Dialog + toast)

## Ownership documents table refactor
`app/(shell)/property/[id]/ownership/queries.ts`:
1. Continue fetching from `ownership-documents/` (legacy)
2. Additionally fetch from central `documents/` filtered by `verifies.entityType === "ownership-record"`
3. Merge into one list

## Documents tab chip
`PropertyDocumentsPage.tsx`: chip "Verifies Ownership" when `doc.verifies?.entityType === "ownership-record"`.

## Implementation order (Ownership)
1. Type fields (ownership-record.ts, document.ts)
2. Seed data — OREC-0001, OREC-0002 verified
3. DB: add update to co-owners
4. Actions: co-owners.actions.ts (create, update, remove)
5. Actions: ownership verification (verifyOwnership, revokeOwnershipVerification)
6. Server helper: ownership-wizard.ts
7. Wizard types
8. WizardProgress
9. VerificationStep
10. FeatureUnlockWizard shell
11. UnlockButton
12. OwnershipUnlock pillar config
13. PropertyLayout slot
14. PropertyOwnershipPage wiring
15. Ownership documents table refactor
16. Documents tab chip
17. End-to-end smoke test

## Verification / testing (Ownership)
1. `bun dev`. Visit `/property/PROP-0001/overview`.
2. **Edit data state** — PROP-0001 ownership header shows "Edit data" + Verified pill (seeded).
3. **Verify-to-unlock state** — PROP-0003 ownership header shows "Verify to unlock".
4. **Unlock state** — delete OREC-0001, refresh; PROP-0001 shows "Unlock feature".
5. **Sole Ownership flow:** step 3 grey + Skipped badge; verify uploads create Document with `verifies` set.
6. **Tenancy in Common flow:** add 2 co-owners 60/40; submit 60/30 → superRefine error. Verify Property.outstandingMortgage updated.
7. **Documents tab** — newly uploaded deed shows "Verifies Ownership" chip.
8. **Ownership documents table** — uploaded deed appears with "Title Deed (Verified)" label.
9. **Revoke** — Record loses 3 fields; Document loses `verifies`; doc still exists.
10. **Edit existing** — wizard prefilled; switch to Tenancy in Common un-greys step 3.
11. **Other tabs unchanged**.

## Risks (Ownership)
- `_fs.ts:nextId` race on parallel uploads — mitigated by sequential upload in `<VerificationStep>`
- Zod stripping `undefined` on revoke — confirm absent (not `false`/`null`)
- Future pillars referencing co-owners — orphaning concern noted, not blocking
