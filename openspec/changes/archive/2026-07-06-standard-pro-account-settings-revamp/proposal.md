## Why

The "Pro" cockpit is gated in two places (the header pill and the `/pro` route) but **not** in the sidebar — so any non-Pro owner sees the sidebar "Pro" button and gets a `notFound()` when they click it. At the same time, the control that decides who is "Pro" is buried as a "Property manager mode" toggle inside a long, unstructured `/settings` scroll, and a separate orphan `/profile` page duplicates account information. Users have no clear place to choose their account type, and the settings surface doesn't scale.

## What Changes

- **Fix the leaking Pro button.** Gate the sidebar "Pro" nav item on the same account-type status that already gates the header pill and the `/pro` route, so Standard users never see a button that 404s.
- **Introduce a Standard ⇄ Pro account-type control.** Relabel and relocate the existing "Property manager mode" toggle into a segmented control. It is instant and self-serve (no confirmation), and reuses the existing `is_manager` flag underneath — Standard hides the Pro button everywhere and blocks `/pro`; Pro reveals the button and opens the cockpit.
- **Redirect on downgrade.** If a user flips Pro → Standard while sitting inside `/pro`, they are moved out of the cockpit.
- **Restructure `/settings` into one grouped-left-nav shell.** An **Account** group (Profile, Security, Account type, Managers, Data & Privacy, Danger zone) and an **App** group (Notifications, Preferences, Connect Claude). The Profile item absorbs the standalone `/profile` page. **BREAKING**: the `/profile` route is removed (redirected to the Profile item in `/settings`).

## Capabilities

### New Capabilities
- `account-type-mode`: The Standard/Pro account identity — how a user selects it, how it maps to the existing `is_manager` flag, and every place that visibility of the Pro cockpit is gated (sidebar item, header pill, `/pro` route, downgrade redirect).
- `settings-shell`: The restructured `/settings` surface — a grouped left-nav split into Account and App groups, the sections each group contains, and the absorption of the `/profile` page.

### Modified Capabilities
<!-- None. No existing spec covers settings, profile, or manager-mode behavior; these are net-new capability specs. -->

## Impact

- **UI:** `components/layout/Sidebar.tsx` (gate the Pro item), `components/layout/AppHeader.tsx` (already gated — unchanged, referenced), `app/(shell)/settings/_components/SettingsPage.tsx` (restructure into shell + groups, add segmented control), `app/(shell)/settings/_components/ManagersSection.tsx` / `ConnectClaudeSection.tsx` (re-homed into groups), `app/(shell)/profile/*` and `ProfilePage.tsx` (folded into the Account → Profile section; route removed/redirected).
- **Routing/gating:** `app/(pro)/layout.tsx` (already gates server-side — unchanged, referenced for the downgrade-redirect behavior).
- **Data/services:** no schema change. Reuses `lib/services/managers.ts` (`getIsManager` / `setManagerMode`) for the account type and `saveUserPreferences` on `user_profiles` for the App-group preferences. No separate simple/advanced preference is introduced.
- **Context wiring:** the sidebar needs the account-type status it currently lacks — via the existing `useIsManager` context (`AppHeaderPropertiesContext`) or a passed prop.
