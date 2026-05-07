---
slug: directory--professional-card-direct-reads
data_point: "Professional card bundle — 11 direct-read fields × 9 cards (rows 18–27 + verified badge)"
route: /directory
revision: 1
date: 2026-05-07
verdict: "✅ All 99 surfaces WIRED — 11 fields × 9 cards; verified badge added in Phase 8.4-Wiring"
---

# Audit Bundle — Professional Card Direct Reads on /directory
_Last revised: 2026-05-07 · Revision 1_
_Bundle covers 99 surfaces (11 direct-read fields × 9 cards). All read from the same `Professional` entity via `db.professionals.list(userId)`. Lite template — derivation depth is trivially shallow (every field is a direct read, no formula)._

📄 Page audit: see [pages/directory/audit.md](pages/directory/audit.md)

## TL;DR
- ✅ All 11 card fields correctly wired to DB — zero HARDCODED surfaces in this section
- ✅ The original audit counted 10 fields × 6 cards = 60 surfaces; wiring added `verified` badge (11th field) + 6 Valgate-verified seed records (9 cards total) → 99 surfaces
- ✅ Verified badge (`<BadgeCheck>` on avatar, blue dot) correctly reads `pro.verified: boolean`; PROF-0001/0002/0003 show no badge (`verified: false`); PROF-0004–0009 show badge (`verified: true`)
- 🔵 1 open finding: F1 (P3 nit — `linkedProperties` is a bare scalar count with no navigation to which properties are linked — pre-existing PF6, deferred)

---

## Per-surface summary

| Field | Surface | Status | Source | Verdict |
|---|---|---|---|---|
| Avatar initials | `pro.initials` | WIRED | DB read | ✅ |
| Avatar background | `pro.avatarBg` | WIRED | DB read | ✅ |
| Available dot | `pro.available` boolean | WIRED | DB read | ✅ |
| Verified badge | `pro.verified` boolean — NEW field (Phase 8.4) | WIRED | DB read | ✅ |
| Category badge text | `pro.category` | WIRED | DB read | ✅ |
| Professional name | `pro.name` | WIRED | DB read | ✅ |
| Company name | `pro.company` | WIRED | DB read | ✅ |
| Star rating arc (5 icons) | `Math.floor(pro.rating)` → filled vs unfilled | WIRED | DB read + floor | ✅ |
| Rating value text | `pro.rating.toFixed(1)` | WIRED | DB read + format | ✅ |
| Review count | `pro.reviewCount` | WIRED | DB read | ✅ |
| Linked Properties count | `pro.linkedProperties` | WIRED | DB read — scalar only, see F1 | ✅ |

**All 11 fields × 9 cards = 99 surfaces: 99 WIRED · 0 HARDCODED · 0 CHROME**

---

## Entity

All 11 fields are direct reads from `Professional` records loaded by `getDirectoryPageData()` in `app/(shell)/directory/queries.ts`. The function calls `db.professionals.list(userId)`, which reads JSON from `public/data/users/demo-user/professionals/PROF-NNNN/core.json`, Zod-parses against `ProfessionalSchema`, and maps to the `Professional` view type.

**Seed population (Phase 8.4-Wiring):**

| ID | Name | verified | available |
|---|---|---|---|
| PROF-0001 | Sok Dara | false | true |
| PROF-0002 | Chea Sophal | false | true |
| PROF-0003 | Heng Virak | false | false |
| PROF-0004 | Sarah Mitchell | true | true |
| PROF-0005 | Noun Sreymom | true | true |
| PROF-0006 | Ly Bopha | true | false |
| PROF-0007 | Chan Piseth | true | true |
| PROF-0008 | Pheng Sokha | true | true |
| PROF-0009 | Kem Dara | true | true |

---

## Rule 1 — Adjacent claim-strings

- Available green dot: implies the professional is currently accepting work. No misleading copy — the dot is a boolean indicator with no text claim.
- Verified badge: implies Valgate has vetted this professional. Only PROF-0004–0009 (Valgate seed records) carry `verified: true` — claim is accurate for the seed data.
- Category badge (e.g. "AGENT"): displays `pro.category` as uppercase via CSS — no claim beyond professional specialty.
- Star arc: `Math.floor(rating)` fills whole stars only; a 4.9 rating fills 4 stars, not 5. The adjacent `rating.toFixed(1)` text corrects this — the visual is slightly pessimistic but the text is exact. P3 nit, no action required.

---

## Rule 2 — Empty-state convention

The card list is conditioned on `paginated` (slice of `filtered`). When `filtered.length === 0`, the `<EmptyState>` component renders instead of cards. When `paginated` is non-empty, all cards render. No per-field empty guard is needed — if `Professional` records exist, all 11 fields are present (Zod validates at DB boundary).

---

## Findings

### 🔵 F1 — `linkedProperties` is a scalar count with no navigation
_Pre-existing PF6 · P3 nit · deferred_

**Where:** `ProfessionalDirectoryPage.tsx:184` — `<span>{pro.linkedProperties}</span>`

**Problem:** "Linked Properties: N" displays a bare integer. There is no link or tooltip showing which properties are linked, nor a way to navigate from a professional to their associated properties. This is a product scope gap, not a data correctness bug — the value itself is correct.

**Fix (future):** Add `propertyIds: string[]` to `ProfessionalSchema`; render a "View linked" link navigating to a filtered `/portfolio?professional=PROF-NNNN` view. Deferred to a post-Phase-9 feature phase.

---

<details>
<summary>🔍 Source files & hashes</summary>

```yaml
sources:
  - path: app/(shell)/directory/_components/ProfessionalDirectoryPage.tsx
    sha: 2cae32d72dc743ae1d434e4fd5f97028059838d0
  - path: app/(shell)/directory/queries.ts
    sha: 1135ecb083c4f4ffacc0f2079e0cb4a19cf77c67
  - path: lib/data/types/professional.ts
    sha: efe238179884db0eb205059f9f5f9d80d4e9574b
  - path: lib/data/db/professionals.ts
    sha: 1db37d8f68e8d9bc8cc30aacf22fe1ba329ca882
  - path: public/data/users/demo-user/professionals/PROF-0001/core.json
    sha: b63bea9f5d237f487117137ad96fdc542e24a29c
  - path: public/data/users/demo-user/professionals/PROF-0004/core.json
    sha: 83049736917b4f1af23a348dd8d0845f88fc2094
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-07
- Initial audit written post Phase 8.4-Wiring. All 99 surfaces WIRED.
- Note: original audit (Phase 8.4-audit) counted 10 fields × 6 cards = 60 surfaces. Wiring phase added `verified` field (11th) + 6 Valgate-verified seed records (9 cards total).
- F1 (PF6 linkedProperties scalar) noted as pre-existing deferred finding.

</details>
