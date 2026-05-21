---
slug: property-id-ownership--split-donut
route: /property/[id]/ownership
data_point: "Ownership Split donut — row 18 (SVG arc geometry + center text percentage labels)"
verdict: "✅ Wired — 2 findings (1 P1 systemic, 1 P3 edge case)"
revision: 1
date: 2026-05-06
template: full
---

# property-id-ownership--split-donut

📄 Page audit: [pages/property-id-ownership/audit.md](pages/property-id-ownership/audit.md)

**TL;DR:** Donut arcs are now dynamically rendered from `sortedOwners` — N arcs for N co-owners, each at `sharePercent * 2.51` dash length with cumulative offset. Center text shows all share percentages joined by " · ". Share values sum to 100 for all 3 test properties (PROP-0001: 60+40, PROP-0002: 100, PROP-0006: 40+30+30). Arc colors rotate through a deterministic 4-value palette by index — not role-based.

---

## §1 — What it shows

The donut SVG renders N arcs (one per co-owner in share-descending order) on a circle of radius 40 (circumference ≈ 251.3, approximated as `100 × 2.51`). Each arc is `sharePercent × 2.51` units long, offset by the cumulative share of preceding arcs. Center text: `sortedOwners.map(o => `${o.sharePercent}%`).join(" · ")`. For PROP-0001: "60% · 40%".

## §2 — Source

- `app/(shell)/property/[id]/_components/PropertyOwnershipPage.tsx` — `sortedOwners.map((owner, i) => <circle ...>)` + `strokeDasharray` + `strokeDashoffset`
- `lib/data/db/co-owners.ts` — data source
- `app/(shell)/property/[id]/ownership/queries.ts` — fetches + filters by propertyId

## §3 — Formula verification (Rule 3 — sum-to-100 walk)

| Property | Owners | Shares | Sum |
|---|---|---|---|
| PROP-0001 | James Smith + Maria Jones | 60 + 40 | 100 ✓ |
| PROP-0002 | David Chen | 100 | 100 ✓ |
| PROP-0006 | Sarah Williams + Robert Kim + Lisa Park | 40 + 30 + 30 | 100 ✓ |

Arc geometry is rendered as-is — no rebalancing if sum ≠ 100. That is a data-quality concern, not a render concern.

## §4 — Golden value check

PROP-0001: previous hardcoded values were "60% · 40%" — real seed data matches. Visual output is identical to the hardcoded version.

## §5 — Adjacent hardcode scan (Rule 1)

Arc colors: `["var(--val-primary-dark)", "#38bdf8", "#818cf8", "#a3e635"]` by index — neutral palette, no role-based color claim. Background ring: `#e4efff` — static, correct. No adjacent claim-strings near the SVG.

## §6 — Missing-safeguards check (Rule 2)

Empty state: if `sortedOwners.length === 0`, center text shows "—" and no arcs render (only the background ring). No crash.

## §7 — Meaning / labelling

"Ownership Split" heading is accurate. Center text format `X% · Y%` matches mock convention. Legend (row 19) co-rendered in same panel — both are bundled as direct reads in the co-owner-cards report.

## §8 — Findings

### 🔴 F1 — userId leak via full Property prop chain
Systemic — see PF1 in [pages/property-id-ownership/audit.md](pages/property-id-ownership/audit.md).

### 🟡 F2 — 3-owner center text may overflow narrow donut
PROP-0006 center text: "40% · 30% · 30%" is 15 chars. At `text-[13px]` in a 140×140 px container, this may clip or wrap. Not a data correctness issue. **Fix:** truncate to first 2 + "…" for 3+ owners, or reduce font size. **Deferred:** multi-owner UI polish phase.
