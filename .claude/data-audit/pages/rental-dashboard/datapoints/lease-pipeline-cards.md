---
slug: rental--lease-pipeline-cards
data_point: "Lease Renewal Pipeline — 4 stage columns (label, count badge, ≤2 cards each) — ~14 surfaces, rows 42–43"
route: /rental
revision: 1
date: 2026-05-07
verdict: "✅ All wired via computePipeline · no blocking Q-numbers"
---

# Audit — Lease Renewal Pipeline on /rental
_Last revised: 2026-05-07 · Revision 1. Bundled lite report — rows 42–43 of the page inventory (~14 surfaces)._

## TL;DR
- ✅ All 4 stage columns (label, count badge, card unit name, card detail) live from DB
- ✅ Was wired before Phase 8.2 — `computePipeline` drives the entire section
- 🔧 No fix needed; P3 nit: cards show ≤2 per stage regardless of count — truncation is silent (no "+N more" affordance)

_Reads from `Lease` (§4) via `computePipeline` → `pipelineStages` prop. Page audit: see [pages/rental-dashboard/audit.md](pages/rental-dashboard/audit.md)._

| Surface | Source | Status |
|---|---|---|
| Stage label ("Approaching" / "Offered" / "Signed" / "Declined") | `STAGE_CONFIG` key — static labels on live data | ✅ WIRED |
| Stage count badge | `inStage.length` per stage | ✅ WIRED |
| Card unit name | `Lease.unit` | ✅ WIRED |
| Card detail (days to expiry / sent / effective date / move-out) | derived from `Lease.endDate` / `Lease.startDate` | ✅ WIRED |
| Stage badge colour | `STAGE_CONFIG[stage].countBg` — static by stage name (CHROME) | — |
| Card faded state (Declined) | `stage === "Declined"` | ✅ WIRED |

**Formula summary (`lib/data/derivations/rental.ts:72–104`):**
- Stages ordered: `["Approaching", "Offered", "Signed", "Declined"]`
- Cards: `leases.filter(l => l.stage === stage).slice(0, 2)`
- Detail string varies per stage: Approaching → days until `endDate`; Offered → days since `startDate`; Signed → effective date label; Declined → move-out date

## §8 Findings

### 🔵 F1 — Card list silently truncates after 2 items per stage
**P3 nit · confidence: high · `[render]`**

**Where:** `lib/data/derivations/rental.ts:78` — `.slice(0, 2)`.

**Problem:** A stage with 5 leases shows only 2 cards with no count or "View all" affordance. The badge count is correct, so the mismatch is visible (e.g. badge shows "5", 2 cards shown).

**Fix:** Either raise the cap or add a `"+N more"` stub card when `inStage.length > 2`. Low priority — no data is lost, just not shown.

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
sources:
  - path: lib/data/derivations/rental.ts
    sha: 4c9a0524455ab818872169de7e42d0825a008d5e
  - path: app/(shell)/rental/queries.ts
    sha: 74f0e3654b89f6273ed39832efa6f2cd6fccb9c2
  - path: app/(shell)/rental/_components/RentalDashboardPage.tsx
    sha: aa661a28ef303d4f4762cfe662275b3855edeeec
  - path: lib/data/types/lease.ts
    sha: 942c1004d68e0924237bf2e05b137160c8091887
```

</details>
