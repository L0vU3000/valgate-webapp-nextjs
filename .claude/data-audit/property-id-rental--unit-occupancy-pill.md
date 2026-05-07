---
slug: property-id-rental--unit-occupancy-pill
data_point: "Unit header pill — occupancy status badge (\"Occupied\" / \"Vacant\")"
route: /property/[id]/rental
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 1 finding (1 P1)"
---

# Audit — Unit Occupancy Pill on /property/[id]/rental
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Correct — shows "Occupied" (emerald pill) for PROP-0001, matching active LEASE-0001
- ⚠️ 1 finding · 1 P1 (Lease[] + Tenant[] userId to browser)
- 🔧 Top fix: narrow Lease[] + Tenant[] server-side (F1)
- 📄 Page audit: see [pages/property-id-rental/audit.md](pages/property-id-rental/audit.md)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What triggers "Occupied" vs "Vacant"? | — |
| 2 | Entity | Is the data well-organised? | ✅ |
| 3 | Formula | Does the boolean match the label? | ✅ |
| 4 | Render | How does the pill reach the user? | ⚠️ |
| 5 | Consistency | Do related strings agree? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 1 gap |
| 7 | Meaning | Does the pill promise what the logic delivers? | ✅ |
| 8 | Findings | What to fix | 1 item |
| 9 | Fix Log | What has been fixed since the initial audit? | — |

---

## 1. Snapshot — ✅

> **Plain opener:** The unit header card shows a small pill badge that reads "Occupied" in green when there is an active lease, and "Vacant" in grey when there is none. For PROP-0001 with LEASE-0001 active, the badge shows "Occupied" with an emerald dot.

| | |
|---|---|
| Where | `/property/PROP-0001/rental`, Unit header card (second row), right-side pill |
| Label | _none — the pill text is self-labeling_ |
| Main formula | `isOccupied = activeLease !== null; occupancyValue = isOccupied ? "Occupied" : "Vacant"` |
| Reads from | presence of active LEASE-0001 |
| Canonical home | client (derived in PropertyRentalPage from `leases` prop) |
| Edge cases | no active lease → "Vacant" (slate-100/slate-500 pill) |

## 2. Entity — ✅

| Field | Notes |
|---|---|
| `Lease.stage` | must be `"Signed"` — used in the active-lease filter upstream |
| `Lease.startDate` | Unix ms — `≤ now` in the active-lease filter |
| `Lease.endDate` | Unix ms — `≥ now` in the active-lease filter |

No Lease field is rendered directly; only the presence/absence of `activeLease` is used.

## 3. Formula — ✅

**Formula (verbatim):**
```ts
const isOccupied = activeLease !== null;
const occupancyValue = isOccupied ? "Occupied" : "Vacant";
// JSX pill:
// className={isOccupied ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}
// dot:
// className={isOccupied ? "bg-emerald-500" : "bg-slate-400"}
```

**Active-lease filter:** `stage === "Signed" && startDate <= now && endDate >= now` (same filter used by all rental surfaces — consistent).

**Two-edge test:**
- activeLease = LEASE-0001 → `isOccupied = true` → "Occupied" (emerald) ✅
- activeLease = null → `isOccupied = false` → "Vacant" (slate) ✅

**Golden-value check**

| Source | Value |
|---|---|
| LEASE-0001 active? | ✅ (stage=Signed, Oct 2025 – Oct 2026, both in range for May 2026) |
| `isOccupied` | `true` |
| `occupancyValue` | `"Occupied"` |
| pill class | `bg-emerald-50 text-emerald-700` |
| Match? | ✅ |

## 4. Render — ⚠️

| | |
|---|---|
| Component | `<PropertyRentalPage>` Unit header card |
| Prop chain | `leases[]` → `activeLease` → `isOccupied` → pill text + CSS class |
| Empty state | "Vacant" — same JSX element with different Tailwind classes |
| Animation | parent card fades in via `style={fade(60)}` |

**PII / IDOR**
- `Lease[]` + `Tenant[]` carry `userId` to browser. See **PF1** in [pages/property-id-rental/audit.md](pages/property-id-rental/audit.md).
- Auth shim: see **PF2** in [pages/property-id-rental/audit.md](pages/property-id-rental/audit.md).

## 5. Consistency — ✅

| Identity | Verification | Holds? |
|---|---|---|
| Pill "Occupied" = Occupancy KPI "Occupied" | Both use `occupancyValue` derived from the same `isOccupied` boolean | ✅ |
| Pill "Occupied" = page subtitle "Occupied" | Subtitle also tests `activeLease !== null` inline | ✅ |

## 6. Missing safeties — 1 gap

| Gap | Status | Link |
|---|---|---|
| `userId` in `Lease[]` + `Tenant[]` shipped to browser | ❌ | F1 |

## 7. Meaning — ✅

```
Label rendered:           "Occupied" / "Vacant"
Formula chosen:           activeLease !== null
User's likely inference:  is this unit currently rented?
Match?                    ✅
```

## 8. Findings — 1 item

---

### 🔴 F1 — `userId` shipped to browser in `Lease[]` + `Tenant[]`
**P1 robustness · confidence: high · `[render]`**

Same systemic finding as `property-id-rental--page-subtitle` F1. Narrow both arrays in `rental/queries.ts`.

## 9. Fix Log

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| — | — | — | _No fixes yet._ | — |

---

<details>
<summary>🔍 Source files & hashes</summary>

```yaml
sources:
  - path: lib/data/types/lease.ts
    sha: 942c1004d68e0924237bf2e05b137160c8091887
  - path: lib/data/db/leases.ts
    sha: a598d563f156c57ca11d2055c59ba201b75c91e5
  - path: app/(shell)/property/[id]/rental/queries.ts
    sha: 3a3603e8108b9326f109a45784f8e4eb1b2c5727
  - path: app/(shell)/property/[id]/rental/page.tsx
    sha: a77c6477c66eeecfcd9f844a2dd138ccdc49c0e0
  - path: app/(shell)/property/[id]/_components/PropertyRentalPage.tsx
    sha: bfb87b4668543208b609974be41d8ec214f1cdd8
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-06
- Initial audit. Surface wired in Phase 6.1.
- Golden-value check ✅: LEASE-0001 active → "Occupied" emerald pill.
- 1 finding: F1 (userId leak).

</details>
