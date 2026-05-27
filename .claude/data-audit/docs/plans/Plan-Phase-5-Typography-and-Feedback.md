# Phase 5 — Mobile Typography Polish + Page-Specific Feedback Fixes

## Context

Phase 3 (main app pages) and Phase 4 (property detail pages) shipped. Visual review at 484×1005 surfaced two categories of work:

1. **Specific feedback** on the Ownership and Overview pages — header items not vertically centered, right cluster too crowded, MetricCell cramped, the financials+ownership 2-col grid too narrow at 484px.
2. **A broader typography pass** — across the 13 pages we've touched, the same hierarchical level (H1, section header, KPI label, KPI value) uses 3+ different sizes. The result is hierarchy confusion on mobile and visual noise on desktop.

**Goal:** Establish one type scale and apply it consistently across all pages, then ship the specific fixes. /impeccable principles guide the tighter pairings (hero / section / card-title / label / value / body / caption).

**Out of scope:** Convex/data, route changes, new features. This is pure visual polish.

---

## 1. Recommended type scale (apply everywhere)

| Tier | Use | Class | Weight | Notes |
|---|---|---|---|---|
| **H1 Hero** | Page titles | `text-[28px] sm:text-[40px]` | `font-extrabold` `tracking-tight` `leading-tight` | Replaces the current 3 variants (`clamp(...)`, `text-3xl sm:text-4xl`, custom). |
| **H2 Section** | Section headers above multi-card areas | `text-[18px] sm:text-[24px]` | `font-bold` | Replaces text-base / text-xl / text-[20px] mess. |
| **H3 Card** | Individual card titles | `text-[15px] sm:text-[18px]` | `font-semibold` | Card-level inside a section. |
| **Eyebrow** | Small uppercase context label (breadcrumb-style) | `text-[11px] uppercase tracking-[0.05em]` | `font-semibold` | `text-[--val-primary-dark]` or `text-slate-400`. |
| **Stat Label** | KPI/metric labels (above values) | `text-[11px] uppercase tracking-[0.05em]` | `font-semibold` | `text-slate-500`. Replaces `text-[10px]`/`text-sm` outliers. |
| **Stat Value** | KPI/metric numbers | `text-[22px] sm:text-[26px]` | `font-bold` | `text-val-heading` `leading-none`. Replaces 20–26px spread. |
| **Body** | Paragraphs, descriptions | `text-[14px] sm:text-[15px]` | `font-normal` | `text-slate-600` or `text-slate-700`. |
| **Caption** | Dates, captions, helper text | `text-[12px]` | `font-normal` | `text-slate-400`. |
| **Table Head** | Column headers | `text-[11px] uppercase tracking-[0.05em]` | `font-semibold` | `text-slate-500`. Same as Stat Label. |

**Approach:** apply the scale via **inline class strings** on each element (no abstraction, no shared CSS classes, no component wrapper). User preference is "long simple readable code over short clever code", and the scale is small enough that find-and-replace per page is mechanical.

The Overview hero (full-bleed map + huge title with `clamp(28px, 5vw, 58px)`) is the **only intentional exception** — it's a deliberate immersive hero, separate from standard page titles.

---

## 2. Specific feedback fixes

### 2A. PropertyLayout chrome header (`components/property/PropertyLayout.tsx:63–165`)

**Issues from feedback:**
- Right cluster items aren't vertically centered (mixed `p-2` button padding vs `py-1` badge padding).
- Right cluster is crowded at 484px: progress badge + bell + more dropdown.

**Fix — vertical center:**
- Wrap the entire header content in `flex items-center` (already does) but ensure every right-cluster child uses the same `h-9` (36px) target so baselines line up. Progress badge currently `py-1` → switch to `h-7 px-3 inline-flex items-center`. Bell + More buttons normalize to `inline-flex h-9 w-9 items-center justify-center`.

**Fix — mobile dropdown consolidation:**
- On mobile (`sm:hidden`), replace the bell + the existing More dropdown with **one** consolidated `DropdownMenu`. The single trigger is the More icon. Menu items in order:
  1. Notifications (with unread indicator) → opens existing `NotificationsPanel`.
  2. Edit property.
  3. Archive property.
- On `sm:` and above, keep the existing two-button layout (bell + more).
- The progress badge stays visible on mobile (it's small and informative).

### 2B. PropertyOverviewPage MetricCell (`PropertyOverviewPage.tsx:218–234`)

**Issue:** `px-6 py-4` + `text-[26px]` value + `text-[15px]` badge wrapping → cramped at 484px when the KPI strip is 2-col (line 537 uses `grid-cols-2 sm:flex`).

**Fix:**
- Padding: `px-4 sm:px-6 py-3 sm:py-4`.
- Value size: standardize to the new Stat Value tier — `text-[22px] sm:text-[26px]`.
- Badge size: `text-[13px] sm:text-[15px]`.
- Gap: `gap-1.5 sm:gap-2`.
- Label: align to new Stat Label tier (`text-[11px] uppercase tracking-[0.05em] text-slate-500`).

### 2C. PropertyOverviewPage "grid grid" — Financials + Ownership cards (line 559)

**Issue:** `grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4` activates 2-col at the `xs:` (480px) breakpoint, so at 484px both cards sit at ~230px wide — too narrow for the Financials card's chart and the Ownership card's owner list.

**Fix:** Change `xs:grid-cols-2` → `sm:grid-cols-2`. The two cards stack vertically below 640px and become side-by-side on tablet+. Both cards get full viewport width on phones, the chart and owner names breathe.

### 2D. UnlockButton consistency across all property pages

**Audit findings:**
- PropertyFinancialsPage.tsx:288 — inline at page header (right of h1).
- PropertyOwnershipPage.tsx:246 — inline at page header.
- PropertyRentalPage.tsx:419 — inline at page header.
- PropertyLocationPage.tsx:341 — inline at page header (wrapped in `<div className="shrink-0">`).
- PropertyOverviewPage.tsx — no UnlockButton (Overview is the summary view; uses different "Edit profile" / "Export Data" buttons in the hero).
- PropertyDocumentsPage.tsx — no UnlockButton.
- PropertySafetyPageFull.tsx — placeholder, no UnlockButton.

**Fix:**
- Standardize the 4 pages that DO use UnlockButton to share the **exact same wrapper pattern**:
  - Container: page-header row, `flex items-start justify-between gap-3 flex-wrap`.
  - UnlockButton wrapped in `<div className="shrink-0">` so it sits on the right and never wraps under the title.
  - All four use `editLabel` set to the page-relevant verb: `"Edit financials"`, `"Edit ownership"`, `"Edit rental"`, `"Edit location"`.
- No change to the UnlockButton component itself — the wrapper consistency is the fix.
- Document the convention in a one-line comment above each instance so future pages follow suit.
- Overview, Documents, and Safety stay as-is (they don't have feature lock states).

---

## 3. Per-page typography application

Mechanical pass — find each tier on each page and swap to the new scale's class string. Files:

**Main pages:**
- `app/(shell)/_components/HomePage.tsx` — search bar placeholder (Body), quick-action chips (Body), legend (Stat Label/Value).
- `app/(shell)/portfolio/_components/PortfolioPage.tsx` — H1, KPI strip (Stat Label/Value), table headers (Table Head).
- `app/(shell)/rental/_components/RentalDashboardPage.tsx` — H1, section H2s, KPI strip, pipeline stage labels (Eyebrow).
- `app/(shell)/analytics/_components/AnalyticsPage.tsx` — H1, KPI cards (Stat Label/Value), filter labels.
- `app/(shell)/estate-planning/_components/SuccessionPage.tsx` — H1, stat cards (lift label from text-sm to Stat Label), section H2s, beneficiary card.
- `app/(shell)/settings/_components/SettingsPage.tsx` — H1, section H2s (currently `text-[20px]` → H2 Section tier).

**Property pages:**
- `app/(shell)/property/[id]/_components/PropertyOverviewPage.tsx` — H1 in hero stays as `clamp(...)` (intentional exception). MetricCell + grid fix covered in §2B/2C. Card titles (Financials, Ownership) → H3 Card. Attribute chips already small.
- `app/(shell)/property/[id]/_components/PropertyFinancialsPage.tsx` — H1, KpiCard padding/label/value (covered in Phase 4 already; verify it matches the new scale), section card titles → H3 Card.
- `app/(shell)/property/[id]/_components/PropertyOwnershipPage.tsx` — H1, KPI row labels/values, card titles → H3 Card.
- `app/(shell)/property/[id]/_components/PropertyRentalPage.tsx` — H1, KPI row, lease summary card title → H3 Card.
- `app/(shell)/property/[id]/_components/PropertyLocationPage.tsx` — H1, MetaCell labels/values, comparables table header → Table Head.
- `app/(shell)/property/[id]/_components/PropertyDocumentsPage.tsx` — H1, file count caption, folder labels → consistent Caption tier.
- `app/(shell)/property/[id]/_components/PropertySafetyPageFull.tsx` — H1 (currently `text-[24px] sm:text-[32px]` → H1 Hero), section H2s, metric cells.

**Shared components touched:**
- `components/property/PropertyLayout.tsx` — header text already styled OK; no typography change here (covered in §2A).
- `components/portfolio/PropertyMobileCard.tsx`, `PropertyTable.tsx` — verify card title size matches H3 Card / table head Table Head.
- `components/rental/KpiCards.tsx`, `LeaseTable.tsx`, `HeatmapGrid.tsx` — KPI label/value, card titles.

---

## Critical files

| File | Purpose |
|---|---|
| `components/property/PropertyLayout.tsx` | Vertical-center header items + consolidate mobile dropdown |
| `app/(shell)/property/[id]/_components/PropertyOverviewPage.tsx` | MetricCell layout + grid `xs:` → `sm:` fix + Card H3 standardization |
| `app/(shell)/property/[id]/_components/PropertyFinancialsPage.tsx` | UnlockButton wrapper standardization + typography pass |
| `app/(shell)/property/[id]/_components/PropertyOwnershipPage.tsx` | UnlockButton wrapper standardization + typography pass |
| `app/(shell)/property/[id]/_components/PropertyRentalPage.tsx` | UnlockButton wrapper standardization + typography pass |
| `app/(shell)/property/[id]/_components/PropertyLocationPage.tsx` | UnlockButton wrapper standardization + typography pass |
| `app/(shell)/property/[id]/_components/PropertyDocumentsPage.tsx` | Typography pass |
| `app/(shell)/property/[id]/_components/PropertySafetyPageFull.tsx` | H1 alignment + typography pass |
| `app/(shell)/_components/HomePage.tsx` | Typography pass |
| `app/(shell)/portfolio/_components/PortfolioPage.tsx` | Typography pass |
| `app/(shell)/rental/_components/RentalDashboardPage.tsx` | Typography pass |
| `app/(shell)/analytics/_components/AnalyticsPage.tsx` | Typography pass |
| `app/(shell)/estate-planning/_components/SuccessionPage.tsx` | Typography pass |
| `app/(shell)/settings/_components/SettingsPage.tsx` | Typography pass |

---

## Reusable utilities / patterns

- `cn()` from `components/ui/utils.ts` — for conditional class joins.
- Existing `DropdownMenu` primitives (`components/ui/dropdown-menu.tsx`) — reuse for the mobile-consolidated chrome menu.
- Existing `UnlockButton` (`components/feature-unlock/UnlockButton.tsx`) — no change to the component; only the wrapper standardizes.
- Existing `NotificationsPanel` (`components/layout/NotificationsPanel.tsx`) — still triggered from inside the consolidated mobile dropdown.

No new components, no new CSS files. The scale lives in commented class strings.

---

## Implementation order

1. PropertyLayout header — vertical center + consolidated mobile dropdown (affects every property page, so it lands first).
2. PropertyOverviewPage — MetricCell + grid `xs:` → `sm:` fix + H3 card titles.
3. UnlockButton wrapper standardization across the 4 pages that use it.
4. Typography pass — go page by page, mechanical find-and-replace. Property pages first (Overview, Financials, Ownership, Rental, Location, Documents, Safety), then main pages (Home, Portfolio, Rental, Analytics, Estate Planning, Settings).
5. Final TS check + Mobbin spot-check for typography references.

---

## Verification

For each page, smoke-test at **375×812**, **484×1005**, **1024×768**, **1496×804**:

- Chrome header items align on a single visual baseline (no items popping above/below).
- Mobile dropdown opens, shows Notifications/Edit/Archive, dismisses cleanly. Notifications still works.
- MetricCell values don't wrap awkwardly. Badges sit in line at every width.
- Financials + Ownership cards stack on phone, sit side-by-side on tablet+.
- UnlockButton sits in the same position across all 4 pages that use it.
- H1 sizes feel the same across pages. Section headers feel uniform. KPI labels uniform.
- No new TypeScript errors: `npx tsc --noEmit`.
- No desktop regressions.

---

## User decisions (confirmed)

1. **Type scale approach:** inline class strings everywhere. No shared CSS utilities, no typed component wrappers. The class strings in §1 are applied directly to each element.
2. **Mobile chrome dropdown:** consolidate Notifications + Edit property + Archive into ONE dropdown menu on mobile. The bell and the existing More menu disappear below `sm:`; the consolidated trigger is a single `MoreVertical` icon.
3. **Overview hero:** keep the existing `clamp(28px, 5vw, 58px)` immersive hero on Overview as-is. It's the only intentional exception to the new H1 Hero tier.
4. **Overview hero buttons:** leave "Edit profile" + "Export Data" alone. Overview is a summary view, not a feature with lock state.
