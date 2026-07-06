## Context

Valgate has two audiences: individual landlords (the owner app) and asset managers (the `/pro` cockpit). Access to the cockpit is controlled by the `is_manager` flag (`lib/services/managers.ts`: `getIsManager` / `setManagerMode`). Today that flag is gated inconsistently:

- `app/(pro)/layout.tsx` — server-side gate; non-managers get `notFound()`. ✅
- `components/layout/AppHeader.tsx` — header "Pro" pill gated on `useIsManager()` context. ✅
- `components/layout/Sidebar.tsx` — the "Pro" nav item is a static entry in `sidebarNavItems`, shown to everyone. ❌ → a Standard user clicks it and hits `notFound()`.

The control that flips `is_manager` is a "Property manager mode" toggle buried in a long single-scroll `/settings` page (`SettingsPage.tsx`), and a separate `/profile` route (`ProfilePage.tsx`) duplicates account info. Design context in `.impeccable.md`: confident/modern/sharp, light-mode, hierarchy over decoration, borders over shadows, "blue is precious."

Mobbin references: Lindy / Amie / Clay (grouped account-vs-workspace left-nav), Hume AI / ElevenLabs (account row/card stacks), Todoist / Cal.com (mode rows with label + description).

## Goals / Non-Goals

**Goals:**
- Make Pro-cockpit visibility consistent across sidebar, header, and route.
- Give account type a clear, self-serve home framed as an identity choice (Standard vs Pro).
- Restructure `/settings` into a scalable grouped left-nav and absorb the orphan `/profile`.
- Reuse existing services and preferences plumbing — no new DB columns.

**Non-Goals:**
- No separate "simple vs advanced" density preference — that idea collapsed into Standard/Pro == `is_manager`.
- No billing/paywall/plan tier — Pro is a free, self-chosen mode, not a purchase.
- No change to what the Pro cockpit itself contains.
- No change to the server-side enforcement model in `(pro)/layout.tsx` (it already enforces of record).

## Decisions

**1. Reuse `is_manager` as the Standard/Pro flag; relabel only.**
Standard ⇔ `is_manager=false`, Pro ⇔ `is_manager=true`. The segmented control calls the existing `setManagerMode` action. Alternative — a new `accountType` column — rejected: pure duplication of an existing, already-enforced flag. "Pro" is a UI label over "manager"; internals stay `is_manager` so the managers system, invites, and `(pro)/layout.tsx` keep working unchanged.

**2. Segmented control, optimistic + rollback.**
`[ Standard | Pro ]` reflects "choose who you are" better than an on/off switch (D2). Keep the existing optimistic pattern from `SettingsPage.tsx`: flip local state immediately, fire the action, roll back if `!result.ok`.

**3. Gate the sidebar item on the same status the header uses.**
The header reads `useIsManager()` from `AppHeaderPropertiesContext`. Preferred: have the Sidebar read the same context so there is one source of truth. If that provider does not already wrap the Sidebar in `ShellLayout`, pass `isManager` down as a prop instead. Either way, the sidebar filters the "Pro" item out for Standard users — mirroring the existing `isPreview` filter already in `Sidebar.tsx`. This is defence-in-depth; `(pro)/layout.tsx` remains the enforcement of record.

**4. Downgrade redirect happens client-side at the switch.**
When the segmented control writes Standard while the user is on a `/pro` path, navigate them to a Standard-safe route (e.g. `/`). The server gate would also catch a subsequent load, but redirecting at the moment of the switch avoids showing a cockpit the user just left. Alternative — rely only on the server gate on next navigation — rejected: leaves the user staring at a cockpit they no longer have.

**5. One `/settings` shell with a grouped left-nav; `/profile` folds in.**
Two labelled groups (Account, App) in a left rail, content panel beside it (D1). Profile section reuses `ProfilePage`'s content/queries; the `/profile` route becomes a redirect to `/settings` (Profile) so existing links survive. Managers section moves into the Account group, still guarded by `roleAtLeast(orgRole, "admin")` (D4).

## Risks / Trade-offs

- **Sidebar lacks `isManager` today** → Mitigation: confirm `AppHeaderPropertiesContext` wraps the shell; if not, thread `isManager` as a prop from the server layout. Small, known.
- **`/profile` redirect misses a deep link or bookmark** → Mitigation: add an explicit redirect at the old route, not just deletion; keep the Profile section addressable within `/settings`.
- **"Pro" label vs "manager" internals could confuse future devs** → Mitigation: a code comment at the flag boundary noting Pro (UI) == is_manager (data); specs state the mapping explicitly.
- **Segmented control is net-new UI vs reusing the switch** → Trade-off accepted for the correct mental model; it is a small presentational component over the same action.
- **Left-nav restructure touches a large file (`SettingsPage.tsx`)** → Mitigation: sections already exist as discrete blocks; the work is regrouping + adding a nav frame, not rewriting section internals.

## Migration Plan

1. Ship the sidebar gate fix first (smallest, independently valuable — stops the 404).
2. Add the segmented control in place of the manager toggle; wire downgrade redirect.
3. Restructure `/settings` into the grouped shell; move Managers/Connect Claude into groups.
4. Fold `ProfilePage` content into the Account → Profile section; convert `/profile` to a redirect.
- **Rollback:** each step is independent and UI-only; revert the relevant commit. No data migration, so no data rollback needed.

## Open Questions

- Confirm whether `AppHeaderPropertiesContext` already wraps the Sidebar in `ShellLayout`, or whether `isManager` must be passed as a prop. (Implementation-time check — does not block the spec.)
- Should the App group's "Preferences → Default Dashboard View" stay as-is, or is it now redundant with account type? (Assume keep as-is; it is orthogonal — where you land, not who you are.)
