# Plan: Ownership Page Redesign → /ownership2

## Context

The current `/property/[id]/ownership` page has several UX issues identified in a research pass using Mobbin (Cake Equity, Origin, PandaDoc) and UI/UX Pro Max:

- KPI row shows low-signal stats (Ownership Type, Total Owners) instead of actionable figures
- Ownership split donut uses initials only (bug) and cramped center text
- Co-owner cards mix contact info and tax/legal fields at equal visual weight
- History timeline uses a brittle `absolute left-[107px]` vertical line
- Documents table has no per-row actions and only one status variant
- Income Distribution shows "shared costs" instead of computed dollar amounts
- Distribution method rendered as fake (non-interactive) radio buttons
- Excessive scroll depth — Documents and History are far below the fold

**Approach**: Build the redesign as `/ownership2` (shadow route, same data layer). Swap into `/ownership` when confirmed by user.

---

## Files to Create

### 1. `app/(shell)/property/[id]/ownership2/page.tsx`
Server component — identical to `ownership/page.tsx` but imports `PropertyOwnershipPage2`.

```typescript
import { notFound } from "next/navigation";
import { PropertyOwnershipPage2 } from "../_components/PropertyOwnershipPage2";
import { getPropertyByIdParam } from "@/lib/data/properties";
import { getOwnershipPageData } from "../ownership/queries";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await getPropertyByIdParam(id);
  if (!property) notFound();
  const ownershipData = await getOwnershipPageData(id, property);
  return <PropertyOwnershipPage2 property={property} {...ownershipData} />;
}
```

### 2. `app/(shell)/property/[id]/_components/PropertyOwnershipPage2.tsx`
The redesigned client component. Props are identical to `PropertyOwnershipPage` — no changes to the data layer.

---

## Files to Modify (on confirmed swap only)

- `app/(shell)/property/[id]/ownership/page.tsx` — change one import line:
  - From: `import { PropertyOwnershipPage } from "../_components/PropertyOwnershipPage";`
  - To: `import { PropertyOwnershipPage2 } from "../_components/PropertyOwnershipPage2";`
  - And render `<PropertyOwnershipPage2 .../>` in place of `<PropertyOwnershipPage .../>`

---

## Seed Data Additions

### Extend `lib/data/types/ownership-document.ts`
Add `expiryDate?: string` to the type (pre-formatted string, same convention as `date`).
Add `"Expiring Soon" | "Pending Signature"` to the `status` union.

### New ownership document seed files for PROP-0001:

**`public/data/users/demo-user/ownership-documents/ODOC-0004/core.json`**
```json
{
  "id": "ODOC-0004", "userId": "demo-user", "propertyId": "PROP-0001",
  "name": "Mortgage Agreement — ACLEDA Bank",
  "type": "Loan Agreement", "date": "Mar 04, 2022",
  "expiryDate": "Mar 04, 2042",
  "owner": "Chan Sophea", "status": "Current"
}
```

**`public/data/users/demo-user/ownership-documents/ODOC-0005/core.json`**
```json
{
  "id": "ODOC-0005", "userId": "demo-user", "propertyId": "PROP-0001",
  "name": "Property Insurance Certificate",
  "type": "Insurance", "date": "Jul 15, 2024",
  "expiryDate": "Jul 15, 2025",
  "owner": "Chan Family Trust", "status": "Expiring Soon"
}
```

### New history events for PROP-0001:

**`public/data/users/demo-user/ownership-history/OWNH-0004/core.json`**
```json
{
  "id": "OWNH-0004", "userId": "demo-user", "propertyId": "PROP-0001",
  "date": "Mar 04, 2022",
  "text": "Mortgage registered with ACLEDA Bank — $828,000 at 6.5% fixed over 20 years.",
  "color": "#f59e0b"
}
```

**`public/data/users/demo-user/ownership-history/OWNH-0005/core.json`**
```json
{
  "id": "OWNH-0005", "userId": "demo-user", "propertyId": "PROP-0001",
  "date": "Sep 01, 2022",
  "text": "Chan Ratha added as 30% co-owner. Ownership split: 70/30.",
  "color": "#818cf8"
}
```

### Add contact fields to CO-0001 and CO-0002:
Extend `public/data/users/demo-user/co-owners/CO-0001/core.json` with `email`, `phone`, `address`.
Extend `public/data/users/demo-user/co-owners/CO-0002/core.json` with `email`, `phone`.

---

## PropertyOwnershipPage2 Layout Structure

```
[Page Header — same as current]
[Summary Bar — 3 stat cards]
[grid-cols-12]
  [Equity & Financial Position — col-span-7]
  [Ownership Split (stacked bar) — col-span-5]
[grid-cols-2: Owner Card | Owner Card]
[In-page tab strip: Details | Documents | History]
[Tab content]
```

---

## Component Design Details

### Summary Bar (replaces 4 KPI cards)

Three cards in a `grid-cols-3` row:

| Card | Label | Value | Sub |
|---|---|---|---|
| 1 | Primary Share | `{topOwner.name} · {sharePercent}%` | `= {equityValue}` equity |
| 2 | Net Equity | `{equityAmount}` | `▲ {appreciationPct}` since purchase (emerald) |
| 3 | Next Payment | formatted date | `in N days` — amber tint if ≤ 14 days |

```typescript
// Days-to-payment helper
function daysUntil(ts?: number): number | null {
  if (!ts) return null;
  return Math.ceil((ts - Date.now()) / 86_400_000);
}
```

### Ownership Split Card — horizontal stacked bar

Replace the SVG donut:
```tsx
{/* Stacked bar */}
<div className="h-5 rounded-full overflow-hidden flex w-full mb-4">
  {sortedOwners.map((o, i) => (
    <div key={o.id} style={{ width: `${o.sharePercent}%`, background: OWNER_COLORS[i] }} />
  ))}
</div>

{/* Legend — full names + % + equity $ (fixes initials bug) */}
{sortedOwners.map((o, i) => (
  <div key={o.id} className="flex items-center gap-2.5">
    <span className="w-2.5 h-2.5 rounded-full" style={{ background: OWNER_COLORS[i] }} />
    <span className="text-sm text-val-heading flex-1">{o.name}</span>
    <span className="text-sm font-semibold text-val-heading">{o.sharePercent}%</span>
    <span className="text-xs text-slate-400 w-24 text-right">
      {propertyValue > 0 ? formatCurrencyFull(Math.round(o.sharePercent * propertyValue / 100)) : "—"}
    </span>
  </div>
))}
```

### Co-owner Card — two-tier

```tsx
// State per card (pass as prop or lift into parent array)
const [taxOpen, setTaxOpen] = useState(false);

// Always visible tier
<Avatar name={name} color={OWNER_COLORS[ownerIndex]} />
<h3>{name}</h3>
<RoleBadge role={badge} />  {/* "Primary Owner" / "Minor Owner" */}
<ShareBar share={share} color={OWNER_COLORS[ownerIndex]} mounted={mounted} />
<p>Equity Value: {equity}</p>
<ContactRow icon={Mail} value={email} />
<ContactRow icon={Phone} value={phone} />

// Collapsible tax section
<button onClick={() => setTaxOpen(v => !v)}>
  Tax & Legal Details <ChevronDown className={taxOpen ? "rotate-180" : ""} />
</button>
{taxOpen && (
  <div>
    {/* address, SSN, taxEntity, 1099 status */}
  </div>
)}
```

### Equity bar improvement
- Change `h-1.5` → `h-3`
- Move appreciation line to directly under market value, size `text-sm font-semibold`

### In-page tabs

```tsx
type Section = "details" | "documents" | "history";
const [section, setSection] = useState<Section>("details");
```

Tab strip: three buttons with bottom-border active indicator (`border-b-2 border-[--val-primary-dark]` on active).

#### Details tab
- Acquisition Details card: show top 4 rows by default (`Purchase Price`, `Down Payment`, `Loan Amount`, `Total Cash Deployed`); toggle remainder with `ChevronDown` accordion
- Distribution card: replace fake radio buttons with a static pill badge showing current method; show rent income split with **dollar amounts per owner** (`formatCurrencyFull(sharePercent * monthlyRentIncome / 100) + "/mo"`); fix "shared costs" → same dollar computation for expense responsibility

#### Documents tab
```tsx
// Status badge variants
const STATUS_STYLE: Record<string, string> = {
  "Current":           "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Expiring Soon":     "bg-amber-50 text-amber-700 border-amber-200",
  "Pending Signature": "bg-blue-50 text-blue-700 border-blue-200",
  "Superseded":        "bg-slate-50 text-slate-500 border-slate-200",
  "Archived":          "bg-slate-50 text-slate-400 border-slate-200",
};
```
- Table columns: **Name · Type · Issued · Expires · Owner (avatar chip) · Status · (Download icon on hover)**
- `expiryDate` from seed data; render "—" if absent

#### History tab
```tsx
// Group by year extracted from date string
const byYear = ownershipHistory.reduce<Record<string, OwnershipHistory[]>>((acc, item) => {
  const year = item.date.match(/\d{4}/)?.[0] ?? "—";
  (acc[year] ??= []).push(item);
  return acc;
}, {});
const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a)); // newest first
```
- Year separator: subtle `─── 2024 ───` divider line
- Event dot: use `item.color` directly (already typed-colored in seed data)
- Timeline line: CSS `border-l border-slate-200` on the container column, no absolute positioning

---

## Reused from existing code (no changes needed)

| Item | Source |
|---|---|
| `fade()` animation helper | Copy from `PropertyOwnershipPage.tsx:18-26` |
| `OWNER_COLORS` | Copy from `PropertyOwnershipPage.tsx:28` |
| `ownerInitials()` | Copy from `PropertyOwnershipPage.tsx:58-60` |
| `formatDate()` | Copy from `PropertyOwnershipPage.tsx:30-32` |
| `getOwnershipPageData` | Import from `../ownership/queries` (no changes) |
| `PropertyFinancials` type | Import from `../ownership/queries` |
| `PropertyLayout` | `components/property/PropertyLayout.tsx` — use `activeTab="ownership"` |
| `EmptyState` | `components/ui/EmptyState.tsx` |
| `formatCurrencyFull` | `lib/format.ts` |
| All data types | `lib/data/types/co-owner`, `ownership-record`, etc. |

---

## Bugs fixed in the redesign

| Bug | Location | Fix |
|---|---|---|
| Initials in split legend instead of full names | `PropertyOwnershipPage.tsx:269` | Use `owner.name` |
| Fake radio buttons (display-only) | Lines 337-347 | Static pill badge |
| "shared costs" — no dollar amounts | Lines 383-389 | Compute `sharePercent × monthlyRentIncome / 100` |
| Brittle `absolute left-[107px]` timeline line | Lines 480-481 | CSS `border-l` on flex column |

---

## Verification

1. Navigate to `/property/PROP-0001/ownership2` — page renders with all 3 summary stats, stacked bar, two owner cards, and tabs
2. Click "Tax & Legal Details" on each owner card — section expands/collapses
3. Click Documents tab — table shows 3 documents (ODOC-0001, ODOC-0004, ODOC-0005), insurance row shows amber "Expiring Soon" badge
4. Click History tab — 5 events grouped under 2022 and 2024 year separators, dots colored by event type
5. Details tab — distribution shows dollar amounts per owner; distribution method shows as a static pill; acquisition accordion works
6. Navigate to original `/property/PROP-0001/ownership` — unchanged, still works

**Swap confirmation**: User confirms → edit one import line in `ownership/page.tsx`.

---

## Archive note
Per project memory: after implementation, copy this plan to `.claude/data-audit/docs/plans/Plan-Ownership2-Redesign.md`.
