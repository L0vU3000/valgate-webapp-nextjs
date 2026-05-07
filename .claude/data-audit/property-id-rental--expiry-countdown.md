---
slug: property-id-rental--expiry-countdown
data_point: "Lease Summary card — expiry countdown banner (\"Expires in N days\")"
route: /property/[id]/rental
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 1 finding (1 P1)"
---

# Audit — Expiry Countdown on /property/[id]/rental
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Correct — shows "Expires in 150 days" for PROP-0001, matching LEASE-0001 endDate vs May 6 2026
- ⚠️ 1 finding · 1 P1 (Lease[] + Tenant[] userId to browser)
- 🔧 Top fix: narrow Lease[] + Tenant[] server-side (F1)
- 📄 Page audit: see [pages/property-id-rental/audit.md](pages/property-id-rental/audit.md)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What triggers the countdown banner? | — |
| 2 | Entity | Is the data well-organised? | ✅ |
| 3 | Formula | Does the day count match the label? | ✅ |
| 4 | Render | How does the banner reach the user? | ⚠️ |
| 5 | Consistency | Do related dates agree? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 1 gap |
| 7 | Meaning | Does the banner promise what the math delivers? | ✅ |
| 8 | Findings | What to fix | 1 item |
| 9 | Fix Log | What has been fixed since the initial audit? | — |

---

## 1. Snapshot — ✅

> **Plain opener:** Below the Lease Summary field table, an amber banner shows how many days remain until the lease expires. For PROP-0001 on May 6 2026, LEASE-0001 expires Oct 2 2026 — 150 days away — so the banner reads "Expires in 150 days". If there is no active lease the banner is hidden entirely.

| | |
|---|---|
| Where | `/property/PROP-0001/rental`, Lease Summary card, amber banner below field table |
| Label | _none — banner text is the message_ |
| Main formula | `daysUntilExpiry = Math.ceil((activeLease.endDate − now) / 86400000)` → `expiryText` |
| Reads from | LEASE-0001 (endDate=1790985600000) |
| Canonical home | client (derived in PropertyRentalPage from `leases` prop) |
| Edge cases | no active lease → `expiryText = null` → banner not rendered; expired lease → `"Expired N days ago"` |

## 2. Entity — ✅

| Field | Notes |
|---|---|
| `Lease.endDate` | Unix ms — subtracted from `Date.now()` to get remaining time |

## 3. Formula — ✅

**Formula (verbatim):**
```ts
const daysUntilExpiry = activeLease ? Math.ceil((activeLease.endDate - now) / 86400000) : null;
const expiryText =
  daysUntilExpiry === null    ? null
  : daysUntilExpiry < 0      ? `Expired ${Math.abs(daysUntilExpiry)} days ago`
  : daysUntilExpiry === 0    ? "Expires today"
  : `Expires in ${daysUntilExpiry} days`;

// JSX: {expiryText && <div className="mt-4 p-2.5 bg-amber-50 ...">...</div>}
```

**Four-branch test:**

| Condition | `daysUntilExpiry` | `expiryText` |
|---|---|---|
| No active lease | `null` | `null` → banner hidden |
| endDate in past | `< 0` | `"Expired N days ago"` |
| endDate = today | `0` | `"Expires today"` |
| endDate in future | `> 0` | `"Expires in N days"` |

**Note on `Math.ceil`:** If `endDate` and `now` are both stored at midnight UTC (which they are in the seed), `(endDate − now)` is exactly divisible by 86400000 and `Math.ceil` returns the exact integer. For sub-day precision `Math.ceil` rounds up — correct behaviour for "how many days until expiry".

**Golden-value check**

| Source | Value |
|---|---|
| LEASE-0001.endDate | 1790985600000 (Oct 2, 2026) |
| now (May 6, 2026) | 1778025600000 |
| `endDate − now` | 12,960,000,000 ms |
| `12960000000 / 86400000` | 150.0 |
| `Math.ceil(150.0)` | 150 |
| `expiryText` | `"Expires in 150 days"` |
| Match? | ✅ |

## 4. Render — ⚠️

| | |
|---|---|
| Component | `<PropertyRentalPage>` Lease Summary card — conditional amber `<div>` |
| Prop chain | `leases[]` → `activeLease` → `daysUntilExpiry` → `expiryText` → banner text |
| Hidden state | `expiryText === null` → banner not mounted |
| Animation | parent card fades in via `style={fade(140)}` |

**PII / IDOR**
- `Lease[]` + `Tenant[]` carry `userId` to browser. See **PF1** in [pages/property-id-rental/audit.md](pages/property-id-rental/audit.md).
- Auth shim: see **PF2** in [pages/property-id-rental/audit.md](pages/property-id-rental/audit.md).

## 5. Consistency — ✅

| Identity | Verification | Holds? |
|---|---|---|
| Countdown uses same endDate as Lease Summary "Lease End" field | Both use `activeLease.endDate` | ✅ |
| Countdown uses same endDate as page subtitle | Subtitle uses `formatDate(activeLease.endDate)`; countdown uses date arithmetic on the same field | ✅ |

## 6. Missing safeties — 1 gap

| Gap | Status | Link |
|---|---|---|
| `userId` in `Lease[]` + `Tenant[]` shipped to browser | ❌ | F1 |

## 7. Meaning — ✅

```
Banner rendered:          "Expires in 150 days"
Formula chosen:           Math.ceil((endDate − now) / 86400000) — days remaining
User's likely inference:  time left before lease renewal is needed
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
- Golden-value check ✅: 150 days remaining — (1790985600000 − 1778025600000) / 86400000 = 150.
- Four-branch test verified (null/past/today/future).
- 1 finding: F1 (userId leak).

</details>
