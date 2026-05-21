---
slug: directory--contact-buttons
data_point: "Contact buttons bundle — Email × 9 + Phone × 9 (rows 28–29)"
route: /directory
revision: 1
date: 2026-05-07
verdict: "✅ PF1 resolved — email/phone schema added; all 18 contact buttons wired with mailto/tel + disabled state"
---

# Audit — Contact Buttons on /directory
_Last revised: 2026-05-07 · Revision 1_
_Full template — PF1 was a schema gap (highest-priority finding in Phase 8.4-audit). Records the fix and verifies the wiring._

📄 Page audit: see [pages/directory/audit.md](pages/directory/audit.md) — **PF1 resolved in Phase 8.4-Wiring.**

## TL;DR
- ✅ PF1 resolved: `email` + `phone` + `verified` added to `ProfessionalSchema`; all 9 seed records updated
- ✅ Email button: `onClick={() => window.open(\`mailto:${pro.email}\`, "_self")}` when email present; `disabled` + `opacity-40 cursor-not-allowed` when absent
- ✅ Phone button: same pattern with `tel:` protocol
- ✅ All 9 seed records have email and phone — all 18 buttons are active in the demo
- 0 findings

## Contents
| # | Section | Result |
|---|---|---|
| 1 | Snapshot | WIRED — PF1 resolved |
| 2 | Entity | ✅ schema + seed verified |
| 3 | Formula | N/A — direct reads |
| 4 | Render | ✅ disabled state verified |
| 5 | Consistency | ✅ |
| 6 | Missing safeties | 0 gaps |
| 7 | Meaning | ✅ |
| 8 | Findings | None |
| 9 | Fix Log | PF1 resolved |

## Glossary
- **PF1** — Page-wide finding: Email and Phone buttons were HARDCODED stubs with no schema backing. Resolved Phase 8.4-Wiring.
- **Q5.V** — Schema question that blocked PF1. Resolved: option (a) two optional fields.
- **disabled state** — When `pro.email` is `undefined`, the button is rendered with HTML `disabled` attribute + `opacity-40 cursor-not-allowed` classes; `onClick` is only assigned when email is present.

---

## 1. Snapshot — ✅ PF1 RESOLVED

> **Plain opener:** Before Phase 8.4-Wiring, the directory had Email and Phone buttons on every professional card — but clicking them did nothing, because the Professional entity had no email or phone fields at all. The fix added these two fields to the database schema, populated them in all seed records, and wired the buttons so they open the user's email client or phone app when clicked. If a professional has no contact info, the button dims and is disabled.

| | Before | After |
|---|---|---|
| Schema | No `email`, no `phone` in `ProfessionalSchema` | `email: z.string().email().optional()` + `phone: z.string().optional()` |
| Seed records | PROF-0001/0002/0003 had no contact fields | All 9 records have email + phone |
| Button action | No `onClick` | `window.open('mailto:...', '_self')` / `window.open('tel:...', '_self')` |
| Missing state | No styling difference | `disabled` + `opacity-40 cursor-not-allowed` |

---

## 2. Entity — ✅

> **Plain opener:** The contact buttons read from two new optional fields on the Professional entity: `email` and `phone`. Both are optional — a professional might not have contact info on file. The schema uses Zod validation on the email field to reject malformed addresses.

| Field | Schema | Seeds | Required? |
|---|---|---|---|
| `email` | `z.string().email().optional()` | All 9 records populated | No — optional |
| `phone` | `z.string().optional()` | All 9 records populated | No — optional |

**Seed contact data sample:**

| Professional | Email | Phone |
|---|---|---|
| Sok Dara (PROF-0001) | sokdara@pnnotary.kh | +855 23 456 789 |
| Sarah Mitchell (PROF-0004) | sarah.mitchell@luxerealty.kh | +855 23 789 456 |
| Chan Piseth (PROF-0007) | piseth@mekongplumbing.kh | +855 16 543 210 |

All 9 records have both fields populated — 18/18 buttons are active in the current demo.

---

## 3. Formula — N/A

Direct reads. No derivation required. `email` and `phone` are passed through `getDirectoryPageData()` as-is from the DB record to the `Professional` view type.

---

## 4. Render — ✅

> **Plain opener:** Each button reads the contact field and behaves differently depending on whether data exists. When email is present, clicking opens the system's default email client pre-addressed to that address. When absent, the button is faded and clicking has no effect.

**Email button logic (ProfessionalDirectoryPage.tsx:126–138):**
```tsx
<button
  onClick={pro.email ? () => window.open(`mailto:${pro.email}`, "_self") : undefined}
  disabled={!pro.email}
  className={cn(
    "size-8 bg-white rounded-full ...",
    pro.email
      ? "hover:bg-slate-50 hover:scale-110 active:scale-95"
      : "opacity-40 cursor-not-allowed",
  )}
  title={pro.email ?? "No email on record"}
>
```

- `disabled={!pro.email}` — blocks keyboard/programmatic interaction when no email
- `onClick={undefined}` when no email — belt-and-suspenders (disabled already prevents it)
- `title` fallback — tooltip says "No email on record" for accessibility when disabled

Phone button is identical in structure, using `tel:` protocol.

---

## 5. Consistency — ✅

> **Plain opener:** The contact buttons on the directory card and the contact links on the profile page (`/directory/[id]`) should show the same information. They do — both read from the same DB record.

| | Directory card (ProfessionalDirectoryPage) | Profile page (ProfessionalProfilePage) |
|---|---|---|
| Email source | `pro.email` from `Professional` view type | `data.email` from `ProfessionalProfileData` |
| DB read | `db.professionals.list(userId)` | `db.professionals.get(userId, id)` |
| Wiring | `mailto:` onClick | `<a href="mailto:...">` link |
| Consistency | ✅ same field, same seed value | ✅ |

---

## 6. Missing safeties — 0 gaps

| Scenario | Handled? |
|---|---|
| `email` is `undefined` | ✅ — `disabled` + dimmed; `onClick` is `undefined` |
| `phone` is `undefined` | ✅ — same pattern |
| Malformed email in seed | ✅ — `z.string().email()` rejects at DB parse time |
| `window.open` in SSR | ✅ — button is in a `"use client"` component; `window` is available |

---

## 7. Meaning — ✅

> The Email and Phone buttons communicate "contact this professional directly." The mailto/tel protocol hands off to the user's OS default app — standard web pattern. The dimmed disabled state clearly communicates "no contact info on file" without error messaging.

```
Label:      Mail icon / Phone icon
Action:     Opens email client / phone dialer via OS protocol
User reads: "I can contact this person directly"
Match?      ✅ — the action fulfills the label's promise when data exists
```

---

## 8. Findings — None

_All surfaces WIRED. PF1 resolved. No open findings._

---

## 9. Fix Log

| Rev | Date | Finding | What changed |
|---|---|---|---|
| 1 | 2026-05-07 | PF1 — Email/Phone schema gap | Added `email`, `phone`, `verified` to `ProfessionalSchema`. Updated PROF-0001/0002/0003 with contact fields. Created PROF-0004–0009 with contact fields. Email/phone buttons wired with `window.open(mailto/tel)` + disabled state. |

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
- Initial audit written post Phase 8.4-Wiring.
- PF1 (schema gap — no email/phone fields) resolved: fields added to schema + all 9 seeds updated + buttons wired.
- 18 contact surfaces (Email × 9 + Phone × 9) all WIRED. 0 findings.

</details>
