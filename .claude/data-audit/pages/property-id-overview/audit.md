---
slug: property-id-overview
route: /property/[id]/overview
revision: 2
date: 2026-05-05
verdict: "⚠️ 5 WIRED · 1 PARTIAL · 10 HARDCODED · 4 PFn — top entity to land: Lease"
---

# Page Audit — /property/[id]/overview
_Last revised: 2026-05-05 · Revision 2_

_See [plan.md](./plan.md) for the action items derived from this audit._

## TL;DR
- ✅ 6 of 16 audit-relevant surfaces are real data (5 WIRED + 1 PARTIAL); the rest are placeholders
- ⚠️ 10 HARDCODED surfaces — top entity to land is **Lease** (unlocks rows 8, 13, 14, 16 — half the placeholders)
- 🔧 4 page-wide findings filed (PF1–PF4); per-datapoint audits should cite instead of restating

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Surface Inventory | What's on the page and what powers each thing? | 24 rows |
| 2 | Page-wide findings | What systemic problems span the whole page? | 4 PFn |

## Glossary
- **WIRED / HARDCODED / PARTIAL / CHROME / DECORATIVE** — see `.claude/skills/audit-page-datapoints/SKILL.md` § "Surface classification".
- **PFn** — Page-wide finding number (PF1, PF2, …). Filed once at the page level; per-datapoint audits cite instead of restating.
- **Lite template** — 4-section per-datapoint report for trivial direct-reads. Full template stays at 9 sections for derivations.
- **PII / IDOR** — sensitive fields exposed to the browser; ownership not enforced.

---

## 1. Surface Inventory

> **Plain opener:** The page shows 24 distinct things. 6 are connected to real database data (5 direct reads + 1 partly-real badge with hardcoded green styling). 10 are fake numbers typed directly into the code, 5 are static labels/buttons, and 3 are purely visual decoration.

| # | Element | Class | Source / Constant | File:line |
|---|---|---|---|---|
| 1 | Header `{property.code} {property.type}` ("PROP-0001 commercial") | WIRED | `property.code` + `property.type` | `PropertyLayout.tsx:49-51` |
| 2 | Header health-score badge ("92% health score") | WIRED | `property.health` | `PropertyLayout.tsx:59` |
| 3 | Hero status badge "RENTED" | PARTIAL | `property.status` text + hardcoded emerald CSS | `PropertyOverviewPage.tsx:157-159` |
| 4 | Hero province text | WIRED | `property.province` | `PropertyOverviewPage.tsx:160-162` |
| 5 | Hero "Purchased $X" subtitle | WIRED | `property.buyNumeric` via `formatCurrency` | `PropertyOverviewPage.tsx:164-166` |
| 6 | Hero property name heading | WIRED | `property.name` | `PropertyOverviewPage.tsx:171` |
| 7 | Key Metrics: Property Valuation $24,850,000 | HARDCODED | `metrics[0]` constant | `PropertyOverviewPage.tsx:53` |
| 8 | Key Metrics: Monthly Income $312,400 +12% | HARDCODED | `metrics[1]` constant | `PropertyOverviewPage.tsx:54` |
| 9 | Key Metrics: Occupancy Rate 94.8% | HARDCODED | `metrics[2]` constant | `PropertyOverviewPage.tsx:55` |
| 10 | Financials: NOI $184.2k + 72% progress bar | HARDCODED | inline literals | `PropertyOverviewPage.tsx:230,235` |
| 11 | Financials: Expenses $42.5k | HARDCODED | inline literal | `PropertyOverviewPage.tsx:241` |
| 12 | Financials: Gross Income $226.7k | HARDCODED | inline literal | `PropertyOverviewPage.tsx:245` |
| 13 | Tenant Mix donut + labels (85% commercial, 12 / 4 / 2 unit counts) | HARDCODED | inline SVG dasharray + literals | `PropertyOverviewPage.tsx:266-294` |
| 14 | Active Leaseholders table (3 tenant rows) | HARDCODED | `tenants` constant | `PropertyOverviewPage.tsx:31-35` |
| 15 | Activity Feed items (5 events) | HARDCODED | `activityItems` constant | `PropertyOverviewPage.tsx:37-43` |
| 16 | Action strip alerts (2 actions + "2 actions pending" count) | HARDCODED | `alerts` constant | `PropertyOverviewPage.tsx:12-29` |
| 17 | Quick Actions (4 buttons: New Lease / Work Order / Invoice / Notify All) | CHROME | `quickActions` const — labels with no data, no behavior | `PropertyOverviewPage.tsx:45-50` |
| 18 | Layout header chrome (back, "Property /", Share, Get directions, MoreVertical) | CHROME | static labels/icons | `PropertyLayout.tsx:39-73` |
| 19 | Tab nav (7 tabs: Overview, Documents, Safety, Ownership, Rental, Valuation, Location) | CHROME | `tabs` constant | `PropertyLayout.tsx:8-16, 77-94` |
| 20 | Hero buttons (Edit Profile, Export Data) | CHROME | static labels, no handlers | `PropertyOverviewPage.tsx:175-185` |
| 21 | "View All" links (Active Leaseholders + Activity Feed) and "Dismiss all" (alerts) | CHROME | static labels | `PropertyOverviewPage.tsx:305,361,408` |
| 22 | Hero image + gradient overlay | DECORATIVE | `/property-hero.jpg` + tailwind gradient | `PropertyOverviewPage.tsx:138-152` |
| 23 | Animations (count-up, fade-in, scale, ping, sliding tab indicator) | DECORATIVE | various transitions / `useCountUp` / `requestAnimationFrame` | various |
| 24 | Card icons (FileText, Wrench, Receipt, Bell, Pencil, Download, MoreHorizontal, etc.) | DECORATIVE | `lucide-react` | various |

**Tally:** WIRED **5** · PARTIAL **1** · HARDCODED **10** · CHROME **5** · DECORATIVE **3**

**Audit-relevant rows (WIRED + PARTIAL + HARDCODED):** 16. CHROME and DECORATIVE rows are listed for completeness and intentionally excluded from the Audit Roadmap.

## 2. Page-wide findings (4 PFn)

> **Plain opener:** Four problems affect the whole page rather than any single number, so they get filed once here and per-datapoint audits will cite them instead of rediscovering them.

**Severity:** 🔴 PF P0 ship-blocker · 🔴 PF P1 robustness · 🟡 PF P2 schema smell · 🔵 PF P3 nit
**Confidence:** high (verified) · medium (inferred) · low (subjective)
**Tags:** `[schema]` · `[logic]` · `[render]` · `[consistency]` · `[negative-space]` · `[semantic]` · `[styling]`

---

### 🔴 PF1 — No `queries.ts` narrowing layer; full `Property` (incl. finance fields) shipped to Client Components
**PF P1 robustness · confidence: high · `[render]`**

**Where:** `app/(shell)/property/[id]/overview/page.tsx:11` (passes raw `Property` to `<PropertyOverviewPage>`); applies to inventory rows **1, 2, 3, 4, 5, 6**.

**Problem:** `page.tsx` calls `getPropertyByIdParam(id)` and passes the full `Property` object — the merge of `PropertyCore` + `PropertyLocation` + `PropertyFinance` + `PropertyMedia` (~37 typed fields) — directly to `<PropertyOverviewPage>` (line 1: `"use client"`). `<PropertyLayout>` (also `"use client"`) further serializes the same object. Of the 37 fields, only 8 are read on this page: `id`, `code`, `type`, `health`, `status`, `province`, `buyNumeric`, `name`.

**Verified leak today** (against PROP-0001 seed): 7 unused fields ship to the browser: `userId`, `lat`, `lng`, `createdAt`, `updatedAt`, `title`, `totalArea`. **Structural leak** (would activate as the seed gets richer): every field on `PropertyFinance` — `outstandingMortgage`, `monthlyPayment`, `interestRate`, `annualPropertyTax`, `taxAssessmentValue`, `annualInsurance`, `currentMarketValue`, `purchasePrice`, etc. — would leak the moment any property record gets those values populated. The type signature accepts them; only the sparse seed prevents the leak today.

**Why it matters:** Sensitive financial data that a server component should keep private leaks into the network response and the JS heap on every page load. Violates the CLAUDE.md rule: *"Never send full DB objects as props — `select` only what the UI renders."* The same gap was found and fixed in the portfolio route via the `PropertyListItem` type (`lib/data/types/property.ts:76-87`).

**Fix:** Add `app/(shell)/property/[id]/overview/queries.ts` exporting:
```ts
export type PropertyOverviewItem = Pick<
  Property,
  "id" | "status" | "province" | "buyNumeric" | "name" | "code" | "type" | "health"
>;

export async function getOverviewPageData(id: string): Promise<PropertyOverviewItem | null> {
  const p = await getPropertyByIdParam(id);
  if (!p) return null;
  return { id: p.id, status: p.status, province: p.province, buyNumeric: p.buyNumeric,
           name: p.name, code: p.code, type: p.type, health: p.health };
}
```
Update `page.tsx` to call `getOverviewPageData(id)` and update both `<PropertyOverviewPage>` and `<PropertyLayout>` props to accept `PropertyOverviewItem` instead of `Property`. (This was already filed at the per-datapoint level as `property-id-overview--rental-status.md` F1 — that finding is now superseded by this PFn; the per-datapoint report should cite PF1 going forward.)

---

### 🟡 PF2 — Multi-tenant isolation pending — auth path uses `getCurrentUserId()` shim
**PF P2 schema smell · confidence: high · `[negative-space]`** — _see Q4.M_

**Where:** `lib/data/auth-shim.ts` → `getCurrentUserId()` returns hardcoded `"demo-user"`; consumed by `lib/data/properties.ts` → `getPropertyByIdParam`. Applies to all WIRED rows (**1–6**).

**Problem:** Every read on this page implicitly trusts the auth shim. There is no actual ownership check between the requested `id` (URL parameter) and the current user — the FS layer's per-user folder isolates by file path alone. If the shim returns a real Clerk subject in production but two users own properties with the same id under different paths, an IDOR crossover is possible.

**Why it matters:** Tracked as Q4.M. Multi-tenant isolation must be enforced before real auth lands, otherwise the whole property route family inherits the IDOR risk silently.

**Fix:** Replace `getCurrentUserId()` with a real Clerk auth call (`auth().userId`). In every db read, assert `record.userId === auth().userId` and `notFound()` on mismatch. Audit this once at the `lib/data/db/_fs.ts` boundary — the fix lands across every entity at the same time.

---

### 🟡 PF3 — No audit log of property mutations
**PF P2 schema smell · confidence: high · `[negative-space]`** — _see Q4.P_

**Where:** No write path is currently exposed on this route, but `property.status` (row 3) and `property.health` (row 2) are obvious editable surfaces. Applies to all WIRED rows (**1–6**) once write paths exist.

**Problem:** The seed JSON has no `auditLog` field on Property, and no separate `propertyAudit` collection exists. When a user changes `status` from `Rented` → `Vacant`, there is no record of who/when/why. The same gap will affect every editable surface on every other property tab.

**Why it matters:** Tracked as Q4.P. Compliance-relevant for property records (especially financial fields). Must exist before any mutation UI lands.

**Fix:** Define a `propertyAuditEvents` collection in `ref/00-entity-catalog.md` (currently absent) with `userId`, `propertyId`, `field`, `oldValue`, `newValue`, `at`, `actor`. Wire it into every write path at the `lib/data/db/properties.ts` boundary so it's impossible to mutate without logging.

---

### 🟡 PF4 — Hero status badge styling locked to emerald regardless of `status` value
**PF P2 schema smell · confidence: high · `[styling]`**

**Where:** `app/(shell)/property/[id]/_components/PropertyOverviewPage.tsx:157-159`. Applies to inventory row **3** (PARTIAL split-finding: text is correct, signal is wrong).

**Problem:** The hero badge `<span>` uses `className="bg-emerald-50 border border-emerald-200 text-emerald-700 ..."` hardcoded. This renders a green badge for **all five** valid `PropertyStatus` values (`"Rented"`, `"Vacant"`, `"For Sale"`, `"Sold"`, `"Archived"`). A property with `status: "Vacant"` would show as if it were "Rented".

**Why it matters:** The badge text + color combination is what users actually read. Mismatched signal + value is worse than no signal — it actively misleads. `statusBadgeClasses()` in `lib/property-helpers.ts:59` already handles all five values exhaustively (built for this purpose after `portfolio--rental-status` Rev 2). Per the page-audit convention, the value-level finding for this PARTIAL row stays in the per-datapoint audit (`property-id-overview--rental-status.md` F2); this **styling/signal** half is filed page-wide because it's a recurring class of bug to watch for across all status-style badges on this page family.

**Fix:**
```tsx
import { statusBadgeClasses } from "@/lib/property-helpers";

// before:
<span className="bg-emerald-50 border border-emerald-200 text-emerald-700 ...">
// after:
<span className={`${statusBadgeClasses(property.status)} text-[11px] font-semibold tracking-[0.05em] uppercase px-2.5 py-0.5 rounded-full`}>
```

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
walked:
  - app/(shell)/property/[id]/overview/page.tsx
  - app/(shell)/property/[id]/_components/PropertyOverviewPage.tsx
  - components/property/PropertyLayout.tsx
  - lib/data/types/property.ts
  - lib/data/properties.ts
  - lib/data/db/properties.ts
sources:
  - path: app/(shell)/property/[id]/overview/page.tsx
    sha: 8672e2f36bdd9c8ca4832fbde629fa9978250e61
  - path: app/(shell)/property/[id]/_components/PropertyOverviewPage.tsx
    sha: c8a424f4ee41979a94966b4126ecc8b379e0be90
  - path: components/property/PropertyLayout.tsx
    sha: 543f6dc98c411c84cfe562855b487a2146fa48e0
  - path: lib/data/types/property.ts
    sha: cbae0e53b355f40c4a5e9083806c6f3e39a632e6
  - path: lib/data/properties.ts
    sha: 4f231bfe5ffcd4192bd038e4d044ea0fd2fea807
  - path: lib/data/db/properties.ts
    sha: 091d5f6ef310175bce8e679d5006607b4965508d
```

</details>

<details>
<summary>📋 Manual verification commands</summary>

```bash
# Confirm the route resolves to the expected entry file
ls 'app/(shell)/property/[id]/overview/page.tsx'

# Count fields shipped to the browser vs fields actually used (validates PF1)
node -e "
const used = ['id','status','province','buyNumeric','name','code','type','health'];
const c = require('./public/data/users/demo-user/properties/PROP-0001/core.json');
const f = require('./public/data/users/demo-user/properties/PROP-0001/finance.json');
const l = require('./public/data/users/demo-user/properties/PROP-0001/location.json');
const m = require('./public/data/users/demo-user/properties/PROP-0001/media.json');
const merged = {...c, ...f, ...l, ...m};
const unused = Object.keys(merged).filter(k => !used.includes(k));
console.log('fields shipped to browser but unused:', unused.length);
console.log(unused);
"

# Verify all 5 PropertyStatus values would render correctly with statusBadgeClasses (validates PF4)
grep -n 'statusBadgeClasses' lib/property-helpers.ts

# Verify currentMarketValue exists on PROP-0001 seed (validates row 7 'partial-blocked' status)
node -e "
const f = require('./public/data/users/demo-user/properties/PROP-0001/finance.json');
console.log('currentMarketValue:', f.currentMarketValue);
"
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-04
- Initial audit (fresh write). Verdict: ⚠️ 5 WIRED · 1 PARTIAL · 10 HARDCODED · 4 PFn — top entity to land: Lease.
- 24-row inventory walked across `page.tsx` + `PropertyOverviewPage.tsx` + `PropertyLayout.tsx`.
- 4 PFn filed: queries.ts narrowing (PF1), multi-tenant shim (PF2), audit log (PF3), hero badge styling (PF4).
- 6 entities in backlog, prioritized: Lease (4 rows) > Tenant (1 row, paired with Lease) > Payment+Expense (3 rows) > PropertyValuation (1 row) > RentalEvent (1 row) > Notification+MaintenanceItem (1 row).
- 5 rows ready for `/audit-datapoint` lite-template runs immediately (rows 1, 2, 4, 5, 6).
- 1 existing per-datapoint audit cross-linked: `property-id-overview--rental-status` (row 3). Back-link added to that report's TL;DR.
- **Verification-driven corrections during this revision:**
  - PF1 narrative initially claimed "30 unused fields" / leaked finance fields; manual count against PROP-0001 seed showed only 7 fields ship today (`userId`, `lat`, `lng`, `createdAt`, `updatedAt`, `title`, `totalArea`) because the seed is sparse. Corrected to distinguish "verified leak today" (7 fields) from "structural leak" (the type accepts ~30 fields and would activate as the seed is enriched).
  - Row 7 initially marked `partial-blocked` ("just wire `property.currentMarketValue`"); verification showed PROP-0001's `finance.json` has `currentMarketValue: undefined`. Corrected to `blocked on seed backfill or PropertyValuation`.
- No new open questions filed yet — Q4.Q (RentalEvent: store vs derive), Q5.<next> (Property.units), and Expense entity in `ref/00` are deferred to the wiring PRs.

### Revision 2 — 2026-05-05
- Structural reformat. Split into `audit.md` + `plan.md` per skill update; no source SHA changes.
- `audit.md` contains §1 Surface Inventory + §2 Page-wide findings.
- `plan.md` contains §3 Entity Backlog + §4 Audit Roadmap + §5 Fix Log.

</details>
