---
revision: 1
date: 2026-05-07
route: /directory/[id]
slug: directory-id--professional-profile-direct-reads
template: bundled-lite
verdict: "✅ All ~11 unique fields WIRED · PF6 deferred (linkedProperties scalar)"
---

# Audit — `/directory/[id]` Professional Profile — Direct Reads

> **TL;DR:** The professional profile page is a single-entity read. All 11 unique `Professional` fields rendered are WIRED to the local-db layer. No HARDCODED surfaces. The only carryover finding (PF6 — `linkedProperties` scalar) was already filed in the main `/directory` audit and is deferred.
>
> 📄 Page audit: see `pages/directory-id/audit.md`
> 📄 Underlying entity: see `directory--professional-card-direct-reads.md` (the main `/directory` bundle that established this entity's audit baseline)

---

## §1 — What is this surface?

The `/directory/[id]` route renders a full-page profile for a single `Professional` record. Every visible data point is a direct read from `ProfessionalProfileData`, which is a narrow projection of the `Professional` entity returned by `getProfessionalProfileData(id)` in `app/(shell)/directory/[id]/queries.ts`.

The component (`ProfessionalProfilePage.tsx`) renders 19 surface instances covering 11 unique Professional fields. All fields were added or confirmed in Phase 8.4-Wiring.

---

## §2 — Source trace

| Field | Component reads | Seed value (PROF-0001) |
|---|---|---|
| `name` | `data.name` (h1) | "Sophea Chanto" |
| `company` | `data.company` | "Khmer Realty Co." |
| `category` | `data.category` (badge) | "Agent" |
| `rating` | `data.rating` (StarRating) | 4.8 |
| `reviewCount` | `data.reviewCount` (StarRating + Reviews stat) | 127 |
| `linkedProperties` | `data.linkedProperties` (Properties stat) | 14 |
| `available` | `data.available` (dot + Status stat) | true |
| `initials` | `data.initials` (avatar text) | "SC" |
| `avatarBg` | `data.avatarBg` (avatar bg class) | "bg-blue-500" |
| `email` | `data.email` (Email button + contact section) | "sophea@khmerrealty.com" |
| `phone` | `data.phone` (Call button + contact section) | "+855 12 345 678" |
| `verified` | `data.verified` (avatar badge + name badge) | true |

**12 fields in type, 11 rendered as data surfaces** (`id` is consumed by the router, not rendered directly).

---

## §3 — Verdict by surface

| Surface | Field | Status |
|---|---|---|
| Avatar circle color | `avatarBg` | ✅ WIRED |
| Avatar circle initials | `initials` | ✅ WIRED |
| Available dot (avatar overlay) | `available` | ✅ WIRED |
| Verified badge (avatar overlay) | `verified` | ✅ WIRED |
| Email button | `email` | ✅ WIRED |
| Phone/Call button | `phone` | ✅ WIRED |
| Name (h1) | `name` | ✅ WIRED |
| Company | `company` | ✅ WIRED |
| Category badge | `category` | ✅ WIRED |
| Rating stars | `rating` | ✅ WIRED |
| Review count | `reviewCount` | ✅ WIRED |
| Properties stat card | `linkedProperties` | ✅ WIRED · 🔵 PF6 deferred |
| Status stat card | `available` | ✅ WIRED (second render) |
| Verified badge (name) | `verified` | ✅ WIRED (second render) |
| Reviews stat card | `reviewCount` | ✅ WIRED (second render) |
| Contact section email link | `email` | ✅ WIRED (second render) |
| Contact section phone link | `phone` | ✅ WIRED (second render) |
| Back link | — | CHROME |
| Header gradient | — | CHROME |

**0 HARDCODED · 0 PARTIAL · 11 unique WIRED fields · 2 CHROME**

---

## §4 — Findings

No new findings.

**🔵 PF6 (deferred, carried from `/directory`)** — `linkedProperties` is a static integer scalar on the `Professional` entity. It has no backing relation to actual `Property` records, so the "14 linked" stat on the profile card cannot be drilled into. Filed in `directory--professional-card-direct-reads.md`; deferred to a future entity-design decision. Not a wiring blocker for this phase.

---

<details>
<summary>📜 Revision history</summary>

**Revision 1 — 2026-05-07**
Initial audit written as Phase 8.4b close-out. All 11 unique Professional fields confirmed WIRED. No new findings.

</details>
