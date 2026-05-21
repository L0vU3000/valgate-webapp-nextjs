# Settings Page Data Audit

## Expected surface tally

| Class | Count |
|---|---|
| WIRED | 6 (notification row labels × 3 + descriptions × 3) |
| PARTIAL | 11 (9 notification toggles [read correct, write absent] + language selected value [en-US vs "English" mismatch] + timezone selected value [string match, but read from constant not entity]) |
| HARDCODED | 3 (MFA "Enabled & Verified", MFA "Not configured", dashboardView default "portfolio-overview") |
| CHROME | ~22 (section headings, field labels, button text, descriptions) |
| MISSING | 1 section (Profile — entity seeded, section structurally absent) |

### Page-wide findings (PFn)

**PF1 — Profile section entirely absent (P2)**
`UserProfile` entity exists, is seeded, and has all fields needed for a profile header (firstName, lastName, email, jobTitle, role). The page is titled "Account Settings" but opens directly into Security with no identification of whose account it is. Zero schema work needed to add it — it is a pure rendering gap.

**PF2 — Notification toggles write-path missing (P1)**
`toggleNotif()` in `SettingsPage.tsx` updates local React state only. No Server Action, no `useTransition`, no persistence. On next page load all toggles reset to `HARD_DEFAULTS`. The UI provides no indication saves are not happening.

**PF3 — Notification seed data mismatch (P1 silent correctness bug)**
DB seed records use event types `Maintenance / Payment / Compliance / Leasing`. UI rows use keys `valuationUpdates / teamComments / marketInsights`. The `queries.ts:44–51` merge loop finds zero matches. Result: `NotificationPreference` is fetched from disk on every page load but its values are completely ignored — the effective initial state is always `HARD_DEFAULTS`. This is the highest-risk finding: the feature *looks* wired but isn't.

**PF4 — Preference selected values are hardcoded constants (P2)**
Three `defaults` values in `queries.ts:73–77` are string literals: `dashboardView: "portfolio-overview"`, `language: "en-US"`, `timezone: "Asia/Phnom_Penh"`. `UserProfile` is never fetched in `queries.ts`. Two of the three values could be sourced from `UserProfile` immediately (timezone matches; language has a value-mismatch: seed `"English"` ≠ option value `"en-US"`). `dashboardView` has no backing field anywhere.

**PF5 — Preference saves missing (P1)**
Changing a dropdown in the Preferences section updates local React state only — same write-path gap as PF2. No Server Action exists for saving `language`, `timezone`, or `dashboardView` selections.

**PF6 — MFA status hardcoded, auth-blocked (P3 deferred)**
`"Enabled & Verified"` and `"Not configured"` at `SettingsPage.tsx:101,116` are string literals. Requires Clerk `user.totpEnabled` / `user.phoneNumberVerified`. Defer to Clerk integration phase.
