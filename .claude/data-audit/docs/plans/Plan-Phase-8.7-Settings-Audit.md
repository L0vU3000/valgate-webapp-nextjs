# Plan — Phase 8.7: Settings Page Audit + Wiring

## Context

`/settings` is the only app-shell route not yet in the data-audit corpus. Unlike property/portfolio pages where entities were missing, the settings page has a different problem profile: most visible surfaces are static UI chrome (labels, descriptions, section headers), the one entity that is read (`NotificationPreference`) is partially wired but has a seed mismatch that silently discards DB values, and the `UserProfile` entity (fully seeded with Ratanak Ly's data) is never fetched despite the page being titled "Account Settings."

**Why this matters:** The notification toggles look wired — the DB is queried, state is initialized — but the 4 seed records use event types (`Maintenance`, `Payment`, `Compliance`, `Leasing`) that never match the 3 UI row keys (`valuationUpdates`, `teamComments`, `marketInsights`). The merge loop in `queries.ts:44–51` finds zero matches, so the toggle initial state is always the `HARD_DEFAULTS` fallback, making the DB read effectively dead code. And when a user clicks a toggle, `toggleNotif()` updates local React state only — no write path exists.

Phase 8.7 covers audit + wiring for `/settings`. It is not blocked by any missing entity — all entities exist and are seeded.

---

## Source Files

| File | Role |
|---|---|
| `app/(shell)/settings/page.tsx` | Server Component wrapper |
| `app/(shell)/settings/queries.ts` | `getSettingsPageData()` — reads `NotificationPreference`, returns hardcoded option arrays |
| `app/(shell)/settings/_components/SettingsPage.tsx` | Client Component — 6 sections |
| `lib/data/types/notification-preference.ts` | `NotificationPreferenceSchema` (id, userId, eventType, email, slack, sms) |
| `lib/data/db/notification-preferences.ts` | `list / get / create / update / remove` — write methods exist, unused |
| `lib/data/types/user-profile.ts` | `UserProfileSchema` — has firstName, lastName, email, jobTitle, role, language, timezone; no `dashboardView` |
| `lib/data/db/user-profiles.ts` | `get(userId, id)` + `upsert(userId, patch)` — id convention: `id === userId` |
| `public/data/users/demo-user/user-profiles/demo-user/core.json` | Seeded: Ratanak Ly, ratanak@valgate.example, Portfolio Manager, language: "English", timezone: "Asia/Phnom_Penh" |
| `public/data/users/demo-user/notification-preferences/NPREF-0001..0004/core.json` | eventType values: Maintenance / Payment / Compliance / Leasing — all mismatch UI keys |

---

## Sub-phase 1 — Audit

Produce `.claude/data-audit/pages/settings/audit.md` and `plan.md`. No code changes.

### Expected surface tally

| Class | Count |
|---|---|
| WIRED | 6 (notification row labels × 3 + descriptions × 3) |
| PARTIAL | 11 (9 notification toggles [read correct, write absent] + language selected value [en-US vs "English" mismatch] + timezone selected value [string match, but read from constant not entity]) |
| HARDCODED | 3 (MFA "Enabled & Verified", MFA "Not configured", dashboardView default "portfolio-overview") |
| CHROME | ~22 (section headings, field labels, button text, descriptions) |
| MISSING | 1 section (Profile — entity seeded, section structurally absent) |

### Page-wide findings (PFn) to file in `audit.md`

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

### Q-numbers to file in `ref/05-open-questions.md`

**Q1.K** — Notification toggles: auto-save on each toggle click, or a "Save Changes" batch button?
- Option (a): auto-save — `toggleNotif` fires `saveNotificationPreference(key, updatedChannels)` via `startTransition` immediately after updating local state. Matches the existing flash animation affordance.
- Option (b): batch save — dirty state tracked, "Save Changes" button appears, fires one action with all 9 values.
- **Recommended: (a) auto-save.** Blocks PF2 fix.

**Q1.L** — Add read-only Profile section in Phase 8.7 wiring, or defer to a future `/profile` route phase?
- Option (a): add now — read-only display of firstName, lastName, email, jobTitle, role from `UserProfile`. "Edit Profile" as a CHROME disabled stub. Zero schema work.
- Option (b): defer entirely.
- **Recommended: (a) add now.** Blocks PF1 fix.

**Q5.X** — Where to store `dashboardView` preference: new field on `UserProfile` or a new `UserPreference {key, value}` entity?
- Option (a): add `dashboardView: z.string().optional()` to `UserProfileSchema`. One Zod line, reuses `upsert()`.
- Option (b): new `UserPreference` entity (key-value store). More extensible, more implementation cost.
- **Recommended: (a) add to `UserProfile`.** Blocks PF4 dashboardView fix.

---

## Sub-phase 2 — Wiring

All three Q-numbers above are resolved as recommended (a). No user confirmation needed if the plan is approved as-is.

### Q-resolution table

| Q | Resolution |
|---|---|
| Q1.K | Auto-save on toggle via `startTransition` + Server Action |
| Q1.L | Add read-only Profile section; "Edit Profile" = CHROME stub |
| Q5.X | Add `dashboardView: z.string().optional()` to `UserProfileSchema` |

### Step-by-step file changes

#### 1. `lib/data/types/user-profile.ts`
Add one field to `UserProfileSchema`:
```ts
dashboardView: z.string().optional(),
```
No seed data update needed (`dashboardView` is optional; seed reads as `undefined` → falls back to default).

#### 2. Seed data repair — `public/data/users/demo-user/notification-preferences/`
Fix the event-type mismatch (PF3). The 4 seed records need to use UI-matching keys. Change:
- `NPREF-0001/core.json`: `"eventType": "Maintenance"` → `"valuationUpdates"` (keep email: true, slack: true, sms: false)
- `NPREF-0002/core.json`: `"eventType": "Payment"` → `"teamComments"` (keep email: true, slack: true, sms: true)
- `NPREF-0003/core.json`: `"eventType": "Compliance"` → `"marketInsights"` (keep email: true, slack: false, sms: false)
- `NPREF-0004/core.json`: delete the entire `NPREF-0004/` directory (4th seed is orphaned — only 3 UI rows exist)

After this fix, the DB merge loop will correctly override `HARD_DEFAULTS` with stored values.

#### 3. `app/(shell)/settings/queries.ts`
- Import: add `db.userProfiles` via existing `* as db` import (already includes `user-profiles` if `lib/data/db/index.ts` exports it — verify; add export if missing).
- In `getSettingsPageData()`, after `getCurrentUserId()`, add:
  ```ts
  const profile = await db.userProfiles.get(userId, userId);
  ```
  (`id === userId` by `upsert()` convention confirmed at `lib/data/db/user-profiles.ts:60`)
- Expand `SettingsPageData` type:
  ```ts
  profile: Pick<UserProfile, "firstName" | "lastName" | "email" | "jobTitle" | "role" | "phone"> | null;
  ```
- Source `defaults.language` and `defaults.timezone` from profile, with fallback:
  ```ts
  language: profile?.language ?? "en-US",
  timezone: profile?.timezone ?? "Asia/Phnom_Penh",
  dashboardView: profile?.dashboardView ?? "portfolio-overview",
  ```
  Note: `profile.language` is `"English"` in the seed but the dropdown values use `"en-US"`. These won't match. The correct fix is to align seed value to the option value format — update `public/data/users/demo-user/user-profiles/demo-user/core.json` `language` field from `"English"` → `"en-US"`. Same for `timezone` — the seed already has `"Asia/Phnom_Penh"` which matches the option value; no change needed.
- Return `profile` in the returned object.

#### 4. `app/(shell)/settings/actions.ts` — new file
```ts
"use server";
import * as db from "@/lib/data/db";
import { getCurrentUserId } from "@/lib/data/auth-shim";

const VALID_NOTIF_KEYS = ["valuationUpdates", "teamComments", "marketInsights"] as const;

export async function saveNotificationPreference(
  eventType: string,
  channels: { email: boolean; slack: boolean; sms: boolean }
) {
  if (!VALID_NOTIF_KEYS.includes(eventType as typeof VALID_NOTIF_KEYS[number])) {
    return { ok: false, error: "Invalid event type" };
  }
  const userId = getCurrentUserId();
  const all = await db.notificationPreferences.list(userId);
  const existing = all.find(p => p.eventType === eventType);
  const now = Date.now();
  if (existing) {
    await db.notificationPreferences.update(userId, existing.id, { ...channels, updatedAt: now });
  } else {
    await db.notificationPreferences.create(userId, { eventType, ...channels, createdAt: now, updatedAt: now });
  }
  return { ok: true };
}

export async function saveUserPreferences(
  patch: { dashboardView?: string; language?: string; timezone?: string }
) {
  const userId = getCurrentUserId();
  await db.userProfiles.upsert(userId, patch);
  return { ok: true };
}
```

#### 5. `app/(shell)/settings/_components/SettingsPage.tsx`
Five changes:

**a) Add `profile` prop and Profile section JSX (PF1)**
Add `profile` to `Props` interface. Before the Security section, render a new section (with `sectionStyle(0)`, renumber subsequent sections `sectionStyle(1)` through `sectionStyle(6)`):
- Avatar circle: initials from `profile.firstName[0] + profile.lastName[0]`
- Full name: `profile.firstName + " " + profile.lastName`
- Job title + email + role badge
- CHROME "Edit Profile" button (disabled, no href, `cursor-not-allowed opacity-50`)

**b) Import Server Actions**
```ts
import { saveNotificationPreference, saveUserPreferences } from "../actions";
```

**c) Wire notification auto-save (PF2)**
Add `useTransition`:
```ts
const [, startTransition] = useTransition();
```
In `toggleNotif`, after updating local state, call:
```ts
startTransition(() => void saveNotificationPreference(key, updatedChannels));
```

**d) Wire preference saves (PF5)**
Change each preference `<select>` `onChange` to call `saveUserPreferences` in a transition:
```ts
onChange={e => {
  setDashboardView(e.target.value);
  startTransition(() => void saveUserPreferences({ dashboardView: e.target.value }));
}}
```
Same pattern for language and timezone selects.

**e) Wire preference initial values (PF4)**
The `dashboardView`, `language`, and `timezone` `useState` initial values should come from `data.defaults` (which now sources from `UserProfile`). This is already how the code works — the `defaults` object initializes state. No component change needed beyond ensuring `data.profile` is passed and `data.defaults` is now DB-sourced.

#### 6. `app/(shell)/settings/page.tsx`
Pass `profile` prop from `data` to `<SettingsPage>`:
```tsx
<SettingsPage {...data} profile={data.profile} />
```
(or simply `<SettingsPage {...data} />` if `data` already includes `profile`)

#### 7. Verify `lib/data/db/index.ts` exports `userProfiles`
Check that `export * as userProfiles from "./user-profiles"` exists. Add if missing.

---

## Sub-phase 3 — Post-wiring audit reports

Four per-datapoint report files to create under `.claude/data-audit/`:

| File | Template | Surfaces | Findings cited |
|---|---|---|---|
| `settings--profile-direct-reads.md` | lite (bundle) | 5 surfaces: full name, email, job title, role, avatar initials | PF1 resolved |
| `settings--notification-toggles.md` | full | 9 toggle checkboxes × initial state + save action | PF2, PF3 resolved |
| `settings--notification-row-labels.md` | lite (bundle) | 6 surfaces: row labels × 3 + descriptions × 3 | None |
| `settings--preference-dropdowns.md` | full | 3 selected values + save path | PF4, PF5 resolved |

Update `pages/settings/plan.md` Fix Log after each finding confirmed.

---

## Deferred

| Surface | Reason |
|---|---|
| MFA "Enabled & Verified" / "Not configured" (PF6) | Requires Clerk `user.totpEnabled` — auth-blocked |
| "Update Password" button | Requires Clerk `user.updatePassword()` |
| "Export Data" button | No ActivityEvent entity or CSV pipeline |
| "Delete Account" button | Requires Clerk account deletion + cascade |
| `UserProfile` edit form | Deferred to future `/profile` route |

---

## Verification

1. Start dev server, navigate to `/settings`
2. Profile section visible with "Ratanak Ly", "ratanak@valgate.example", "Portfolio Manager"
3. Notification toggles: click any toggle → flash animation → reload page → toggle state persists (DB write confirmed)
4. Check `public/data/users/demo-user/notification-preferences/NPREF-0001/core.json` after toggle — `email/slack/sms` values updated
5. Preferences: change Language dropdown → reload → same value selected (DB write confirmed)
6. TypeScript: `npx tsc --noEmit` passes with no new errors
