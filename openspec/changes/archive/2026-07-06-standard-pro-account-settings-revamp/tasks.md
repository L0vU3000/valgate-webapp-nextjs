## 1. Bug fix — gate the sidebar Pro item (ship first, independent)

- [x] 1.1 Confirm whether `AppHeaderPropertiesContext` (the `useIsManager` provider) already wraps `Sidebar` in `ShellLayout`; if not, thread `isManager` from the server layout as a prop.
- [x] 1.2 In `components/layout/Sidebar.tsx`, filter the "Pro" item out of the rendered nav for Standard users (mirror the existing `isPreview` filter), so Standard users never see a button that 404s.
- [x] 1.3 Verify: Standard user sees no sidebar "Pro" item and no header pill; Pro user sees both. `/pro` still returns notFound for Standard (unchanged server gate).

## 2. Standard/Pro segmented control

- [x] 2.1 Build a `[ Standard | Pro ]` segmented control component (both options visible, current filled) per `.impeccable.md` (borders over shadows, blue precious).
- [x] 2.2 Replace the "Property manager mode" toggle in the Account group with the segmented control; wire it to the existing `setManagerMode` action (Pro=true / Standard=false).
- [x] 2.3 Keep optimistic update + rollback on `!result.ok` (reuse the current pattern from `SettingsPage.tsx`).
- [x] 2.4 On switching to Standard while the current path is under `/pro`, redirect the user to a Standard-safe route (e.g. `/`).
- [x] 2.5 Add a short code comment at the flag boundary noting Pro (UI label) == `is_manager` (data).

## 3. Settings shell — grouped left-nav

- [x] 3.1 Introduce a `/settings` shell layout with a persistent left rail: an "Account" group and an "App" group, plus a content panel; active item is visually marked.
- [x] 3.2 Account group items: Profile, Security, Account type, Managers (owner/admin only), Data & Privacy, Danger zone.
- [x] 3.3 App group items: Notifications, Preferences (default view, language, timezone), Connect Claude.
- [x] 3.4 Re-home existing sections into groups without rewriting their internals: `ManagersSection` (keep `roleAtLeast(orgRole,"admin")` guard) and `ConnectClaudeSection`.
- [x] 3.5 Responsive: collapse the left rail sensibly on small screens (the current page is already mobile-aware — preserve that).

## 4. Absorb the /profile page

- [x] 4.1 Move `ProfilePage` content/queries into the Account → Profile section.
- [x] 4.2 Convert the `/profile` route to a redirect to `/settings` (Profile section) so existing links/bookmarks survive.
- [x] 4.3 Point the sidebar avatar (currently `handleNavigate("/profile")`) at the Profile section of `/settings`.

## 5. Verify against specs

- [x] 5.1 Standard↔Pro switch is instant, persists via `is_manager`, and rolls back on write failure.
- [x] 5.2 Pro entry points (sidebar item + header pill) appear only for Pro; `/pro` returns notFound for Standard.
- [x] 5.3 Downgrade while inside `/pro` moves the user out.
- [x] 5.4 `/settings` shows the two groups with the correct items; Managers hidden for non-owners; `/profile` redirects in.
- [x] 5.5 `npm run build` / typecheck clean; no `.impeccable.md` reflex-reject fonts introduced.
