# Settings Page Data Audit

## Expected surface tally (Revision 2 — post-wiring state, 2026-05-26)

| Class | Count |
|---|---|
| WIRED | 16 (profile header 4 fields + 3 notification row labels + 9 notification toggles + 3 preference selects) |
| PARTIAL | 1 (preference auto-save: silent, no toast — see PF5) |
| HARDCODED | 2 (MFA "Enabled & Verified", MFA "Not configured" — see PF6) |
| CHROME | 8 (Edit Profile btn, password form fields + Update Password btn, Manage/Setup btns, Export Data btn, Delete Account btn) |

### Page-wide findings (PFn)

---

**PF1 — Profile section entirely absent (P2) — ✅ RESOLVED Rev 1**

~~`UserProfile` entity exists, is seeded, and has all fields needed for a profile header. The page had no profile section.~~

**Resolved Rev 1:** Profile section added. Renders `firstName`, `lastName`, `email`, `jobTitle`, `role` badge from `data.profile` (sourced from `db.userProfiles.get(userId)`). "Edit Profile" button is intentionally disabled (CHROME stub).

---

**PF2 — Notification toggles write-path missing (P1) — ✅ RESOLVED Rev 1**

~~`toggleNotif()` updated local React state only. No Server Action. On next page load all toggles reset.~~

**Resolved Rev 1:** `toggleNotif()` now calls `saveNotificationPreference(key, updatedChannels)` inside `startTransition()`. `actions.ts` contains the wired server action. Persisted to `db.notificationPreferences`.

---

**PF3 — Notification seed data mismatch (P1) — ✅ RESOLVED Rev 1**

~~DB seed used keys `Maintenance / Payment / Compliance / Leasing`. UI used `valuationUpdates / teamComments / marketInsights`. Merge loop found zero matches.~~

**Resolved Rev 1:** Seed data updated to use matching keys (`valuationUpdates`, `teamComments`, `marketInsights`). `queries.ts` merge loop now correctly applies stored preferences over `HARD_DEFAULTS`.

---

**PF4 — Preference selected values were hardcoded constants (P2) — ✅ RESOLVED Rev 1**

~~`defaults` values in `queries.ts` were string literals. `UserProfile` was never fetched.~~

**Resolved Rev 1:** `queries.ts` now calls `db.userProfiles.get(userId)`. `defaults.dashboardView` reads `profile?.dashboardView ?? "portfolio-overview"`, `defaults.language` reads `profile?.language ?? "en-US"`, `defaults.timezone` reads `profile?.timezone ?? "Asia/Phnom_Penh"`. `UserProfileSchema` has `dashboardView`, `language`, `timezone` optional string fields (Q5.X resolved).

---

**PF5 — Preference saves missing (P1) — ✅ RESOLVED (⚠️ PARTIAL: silent save)**

~~Dropdown changes updated local React state only. No Server Action existed.~~

**Resolved Rev 1:** `saveUserPreferences()` Server Action wired. Each select calls it on change inside `startTransition()`. Change is persisted to `UserProfile`.

**Remaining gap (P3 nit):** `useTransition()` pending flag is discarded (`[, startTransition]`). User receives no feedback that the save succeeded. No toast or spinner shown. Tracked as PF5 nit below.

---

**PF6 — MFA status hardcoded, auth-blocked (P3) — 🔜 DEFERRED to Phase 9**

`"Enabled & Verified"` and `"Not configured"` at `SettingsPage.tsx:144–161` are string literals. Requires Clerk `user.totpEnabled` / `user.phoneNumberVerified` API call. Blocked on Clerk integration (Phase 9+).

No schema work needed — pure Clerk API wiring.

---

**PF7 (new) — Security and Data action buttons are unimplemented stubs (P2) — 🔜 DEFERRED to Phase 9**

Five interactive buttons have no wired action: Update Password, Authenticator Manage, SMS Recovery Setup, Export Activity Log, Delete Account.

All require Clerk (auth operations) or a real DB (data export). Appropriate for the current FS demo phase. Deferred to Phase 9.

---

**PF8 (new, P3 nit) — Preference selects auto-save silently**

`[, startTransition]` — the `isPending` flag is discarded. No toast or spinner shown on save. Low-severity UX gap.

**Fix:** Capture `isPending` and show a brief "Saved" indicator, or add an explicit Save button. Can be done in isolation, no schema dependency.

---

## Audit Roadmap

No per-datapoint audit reports recommended — all surfaces are direct reads or config-driven toggles. Full 9-section depth is not warranted for form fields of this type.

**Outstanding work:**
- PF6 (MFA status) → Phase 9 (Clerk)
- PF7 (action stubs) → Phase 9 (Clerk + real DB)
- PF8 (silent save) → small UX fix, Phase 9 or standalone

**Phase 8.3 verdict:** ✅ Audited. 16 WIRED, 1 PARTIAL (silent save), 2 HARDCODED (MFA), 8 CHROME (action stubs). PF1–PF5 all resolved from Rev 1 wiring. PF6–PF8 deferred to Phase 9.

---

## Revision history

| Rev | Date | Changes |
|---|---|---|
| 1 | 2026-05 | Initial audit (pre-wiring state). 5 PFn filed. |
| 2 | 2026-05-26 | Post-wiring state. PF1–PF5 resolved. PF6 confirmed deferred. PF7–PF8 newly filed. Verdict updated. |
