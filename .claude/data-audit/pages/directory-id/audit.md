---
revision: 1
date: 2026-05-07
route: /directory/[id]
slug: directory-id
phase: 8.4b
---

# Page Audit — `/directory/[id]`

> Surface inventory for the Professional profile route. All surfaces are direct reads from the `Professional` entity — already fully audited by `directory--professional-card-direct-reads.md`. This is a lite audit.

---

## Summary

| | |
|---|---|
| **Route** | `/directory/[id]` |
| **Audit date** | 2026-05-07 |
| **Phase** | 8.4b |
| **Component** | `app/(shell)/directory/[id]/_components/ProfessionalProfilePage.tsx` |
| **Queries** | `app/(shell)/directory/[id]/queries.ts` → `getProfessionalProfileData()` |
| **Total surfaces** | ~15 (11 unique Professional fields · 2 CHROME · 2 repeated-field occurrences) |
| **WIRED** | 11 unique data fields |
| **HARDCODED** | 0 |
| **CHROME** | 2 (back link + header gradient band) |
| **Findings** | 0 new — PF6 (linkedProperties scalar) already filed in main /directory audit |

---

## Surface Inventory

| # | Element | Value / Source | Status | Notes |
|---|---|---|---|---|
| 1 | Back link "← Back to Directory" | Static href="/directory" | CHROME | Navigation chrome |
| 2 | Header gradient band | CSS gradient (Tailwind) | CHROME | Decorative |
| 3 | Avatar circle color | `data.avatarBg` | WIRED | Tailwind bg class from seed |
| 4 | Avatar circle initials | `data.initials` | WIRED | Derived from name at seed time |
| 5 | Available dot (avatar overlay) | `data.available` | WIRED | Green dot shown when true |
| 6 | Verified badge (avatar overlay) | `data.verified` | WIRED | Blue BadgeCheck icon when true |
| 7 | Email button (header) | `data.email` → `mailto:` | WIRED | Disabled state when absent |
| 8 | Phone/Call button (header) | `data.phone` → `tel:` | WIRED | Disabled state when absent |
| 9 | Name (h1) | `data.name` | WIRED | |
| 10 | Verified badge (inline name) | `data.verified` | WIRED | Second render of same field |
| 11 | Company | `data.company` | WIRED | |
| 12 | Category badge | `data.category` | WIRED | Color driven by `CATEGORY_BADGE` map |
| 13 | Rating stars | `data.rating` | WIRED | `StarRating` component |
| 14 | Review count | `data.reviewCount` | WIRED | In `StarRating` + Reviews stat card |
| 15 | Status stat card | `data.available` | WIRED | Second render of same field |
| 16 | Properties stat card | `data.linkedProperties` | WIRED | PF6 — scalar, no actual relation |
| 17 | Reviews stat card | `data.reviewCount` | WIRED | Third render of same field |
| 18 | Contact section — email link | `data.email` | WIRED | Conditionally rendered |
| 19 | Contact section — phone link | `data.phone` | WIRED | Conditionally rendered |

---

## Page-wide Findings

**None new.** The only carryover finding is:

**PF6 — `linkedProperties` is a scalar** (deferred): `data.linkedProperties` is a static integer on the `Professional` entity — it has no backing relation to actual `Property` records. Filed in the main `/directory` audit (`directory--professional-card-direct-reads.md`). Deferred to a future entity-design decision. Not a wiring blocker.

---

## Source files

| File | Role |
|---|---|
| `app/(shell)/directory/[id]/_components/ProfessionalProfilePage.tsx` | UI component |
| `app/(shell)/directory/[id]/queries.ts` | Data query (`getProfessionalProfileData`) |
| `app/(shell)/directory/[id]/page.tsx` | Server page (passes `ProfessionalProfileData` to component) |
| `lib/data/types/professional.ts` | `ProfessionalSchema` (entity type) |
| `public/data/users/demo-user/professionals/` | Seed data (PROF-0001–PROF-0009) |

---

## Verdict

✅ **Phase 8.4b — audit complete.** All ~11 unique Professional fields are WIRED. 0 HARDCODED surfaces. PF6 (linkedProperties scalar) deferred from the main /directory audit — no new findings on this route.
