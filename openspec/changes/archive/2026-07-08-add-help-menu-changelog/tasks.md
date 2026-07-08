## 1. Changelog data

- [x] 1.1 Create `lib/data/changelog.ts` with `ChangeTag`, `ChangelogEntry`, `ChangelogRelease` types and a `CHANGELOG` array ordered newest-first
- [x] 1.2 Seed `CHANGELOG` with real, user-facing entries curated from the recent commit log (translate engineering commits into plain product language, tagged New / Improved / Fixed)
- [x] 1.3 Export a small helper for "newest version" (`CHANGELOG[0]?.version`) and a defensive `x.y.z` version-compare used by the unread check

## 2. What's new modal

- [x] 2.1 Create `components/layout/WhatsNewModal.tsx` — a shadcn `Dialog` with controlled `open` / `onOpenChange` props
- [x] 2.2 Render each release grouped by version + date, with each entry showing a tag badge (New / Improved / Fixed) and its text
- [x] 2.3 Verify dismissal works via close button, outside click, and Escape

## 3. Help menu component

- [x] 3.1 Create `components/layout/HelpMenu.tsx` — a `?` icon button opening a shadcn `DropdownMenu`
- [x] 3.2 Add the four entries in order: Send Feedback (`mailto:` placeholder), Changelog (opens the modal), Docs (`href="#"` placeholder), Keyboard Shortcuts (`href="#"` placeholder)
- [x] 3.3 Own the modal open state and render `WhatsNewModal` from within `HelpMenu`
- [x] 3.4 Implement the unread dot: read `valgate:changelog:last-seen` from localStorage on mount, compare to newest version, show a dot when newer or unset
- [x] 3.5 On modal open, write the newest version to localStorage and clear the dot

## 4. Wire into both shells

- [x] 4.1 Mount `<HelpMenu />` in `components/layout/AppHeader.tsx` (Standard shell), next to the notifications bell
- [x] 4.2 Mount `<HelpMenu />` in `app/(pro)/pro/_components/ProAppHeader.tsx` (Pro shell), next to the notifications bell
- [x] 4.3 Confirm placement and spacing match the existing bell affordance in each header

## 5. Verify

- [x] 5.1 Standard user: Help button visible, dropdown opens with all four entries, Changelog opens the modal (verified live on /portfolio)
- [x] 5.2 Pro user: Help button visible in the Pro header, same behavior (verified live on /pro/dashboard)
- [x] 5.3 Unread dot appears for a new version, clears after opening the modal, and stays clear when caught up (verified live)
- [x] 5.5 DECIDE: the map home (`/`) has no header, so no Help button there. RESOLVED — leave as-is: the map home is deliberately chrome-free and Help is present on every other Standard page + all of Pro. A floating Help chip can be added to `HomePage.tsx` later on request (~15 lines) if landing-page parity is wanted.
- [x] 5.4 `npm run lint` and `tsc` pass; no new dependency added to `package.json`
