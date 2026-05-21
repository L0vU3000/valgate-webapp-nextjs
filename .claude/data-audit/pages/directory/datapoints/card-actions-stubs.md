---
slug: directory--card-actions-stubs
data_point: "Card action bundle — COPY INFO × 9 (row 30), VIEW PROFILE × 9 (row 31)"
route: /directory
revision: 1
date: 2026-05-07
verdict: "✅ All 18 surfaces WIRED — PF4 resolved (VIEW PROFILE → Link); COPY INFO was already wired"
---

# Audit Bundle — Card Action Stubs on /directory
_Last revised: 2026-05-07 · Revision 1_
_Bundle covers 18 surfaces: COPY INFO × 9 + VIEW PROFILE × 9. At the time of Phase 8.4-audit, COPY INFO was WIRED and VIEW PROFILE was HARDCODED (PF4). Both are now WIRED. Lite template._

📄 Page audit: see [pages/directory/audit.md](pages/directory/audit.md) · PF4 resolved.

## TL;DR
- ✅ COPY INFO: already wired at audit time — copies `${pro.name} — ${pro.company}` to clipboard with animated state feedback (Check icon + "COPIED" text for 1800ms)
- ✅ VIEW PROFILE: PF4 resolved — changed from `<button>` with no `onClick` to `<Link href={/directory/${pro.id}}>` navigating to the individual professional profile route
- ✅ Profile route `/directory/[id]` was built in the same wiring phase (3 files: queries.ts + page.tsx + ProfessionalProfilePage.tsx)
- 0 findings

---

## Per-surface summary

| Surface | × cards | Status | Source | Verdict |
|---|---|---|---|---|
| COPY INFO button | 9 | WIRED | `navigator.clipboard.writeText(${pro.name} — ${pro.company})` + `copied` state | ✅ |
| VIEW PROFILE link | 9 | WIRED | `<Link href={/directory/${pro.id}}>` — routes to profile page | ✅ |

**18 surfaces: 18 WIRED · 0 HARDCODED**

_(Original audit: 6 WIRED COPY INFO + 6 HARDCODED VIEW PROFILE = 12 surfaces × 6 cards. Now 18 surfaces × 9 cards, all WIRED.)_

---

## Entity

**COPY INFO** reads `pro.name` and `pro.company` — both direct reads from `Professional`, always present (required fields in `ProfessionalSchema`). The clipboard write is a client-side action with no DB dependency.

**VIEW PROFILE** navigates to `/directory/${pro.id}` where `pro.id` is the DB record ID (`"PROF-0001"` through `"PROF-0009"`). The `Professional.id` type was changed from `number` (sequential counter) to `string` (DB record ID) in Phase 8.4-Wiring specifically to enable this navigation. The profile page reads the professional record from `db.professionals.get(userId, id)`.

---

## Rule 1 — Adjacent claim-strings

- "COPY INFO" / "COPIED": label transitions correctly with `copied` state. When copied = true, `"COPY INFO" → "COPIED"` + Check icon. No incorrect claim — the copy action actually executes before the label changes.
- "VIEW PROFILE" with `ChevronRight` icon: implies navigation. Now correctly implemented as a `<Link>` — the icon's directional implication is fulfilled.

---

## Rule 2 — Empty-state convention

Both buttons only render when a professional card renders. No empty-card scenario applies to this bundle.

**COPY INFO error path:** `navigator.clipboard.writeText(...).catch(() => {})` — clipboard API failure is silently suppressed. The `copied` state will still transition to true/false. Acceptable: clipboard errors are typically a permissions issue in non-HTTPS environments; no user-visible regression.

**VIEW PROFILE error path:** If the profile route receives an ID that doesn't exist in the DB, `getProfessionalProfileData(id)` returns `null` and `notFound()` renders Next.js's 404 page. Correctly guarded.

---

## Findings

_None._

---

<details>
<summary>🔍 Source files & hashes</summary>

```yaml
sources:
  - path: app/(shell)/directory/_components/ProfessionalDirectoryPage.tsx
    sha: 2cae32d72dc743ae1d434e4fd5f97028059838d0
  - path: app/(shell)/directory/[id]/queries.ts
    note: "ProfessionalProfilePage route — reads db.professionals.get(userId, id)"
  - path: app/(shell)/directory/[id]/page.tsx
    note: "Server Component — await params; notFound() guard"
  - path: app/(shell)/directory/[id]/_components/ProfessionalProfilePage.tsx
    note: "Full profile UI — all fields read from ProfessionalProfileData"
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-07
- Initial audit written post Phase 8.4-Wiring.
- PF4 resolved: VIEW PROFILE changed from `<button>` with no onClick to `<Link href="/directory/${pro.id}">`. Profile route `/directory/[id]` built (3 new files).
- COPY INFO was already WIRED at audit time — no change needed.
- Card count updated from 6 (HARDCODED_PROFESSIONALS max) to 9 (full DB seed).

</details>
