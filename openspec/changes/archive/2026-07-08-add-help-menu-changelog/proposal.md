## Why

The app has no in-product surface for support, product news, or self-serve help. Users can't tell what shipped in a release, find the user manual, send feedback, or discover shortcuts. Every other SaaS puts these behind a single always-visible Help affordance — we have nothing. The most valuable of these is a **changelog**: a way to tell users what each update actually contains, in their language (not engineering commit messages).

## What Changes

- Add a **Help menu** — a `?` icon button in the top header, present in both the Standard shell (`AppHeader.tsx`) and the Pro shell (`ProAppHeader.tsx`), opening a shadcn `DropdownMenu` with:
  - **Send Feedback** — `mailto:` link (placeholder; no feedback backend yet)
  - **Changelog** — opens the "What's new" modal (the real feature below)
  - **Docs** — external link to the user manual (placeholder `#` until a manual URL exists)
  - **Keyboard Shortcuts** — placeholder link (only ⌘K exists today)
- Add a **Changelog / "What's new" feature**:
  - A hand-curated, typed data file (`lib/data/changelog.ts`) — an array of releases, each with a version, date, and tagged entries (New / Improved / Fixed). **Not markdown** — no renderer is installed, and a typed file gives us badges and unread-tracking for free.
  - A **"What's new" modal** (shadcn Dialog) that renders those entries, opened from the Help menu, mounted once per shell.
  - A **localStorage-based unread dot** on the `?` button: when the newest changelog version is greater than the version the user has last seen, show a dot; clear it when they open the modal.
- The commit log is the **human drafting source** for changelog entries — a person curates user-facing entries from it. It is **not** parsed or read at runtime.

Explicit placeholders (Feedback / Docs / Keyboard Shortcuts destinations) are a deliberate "wire later" decision, not an oversight — flagged so they're a choice, not a gap.

## Capabilities

### New Capabilities
- `help-menu`: A header Help (`?`) dropdown, shared across the Standard and Pro shells, exposing Send Feedback, Changelog, Docs, and Keyboard Shortcuts entries.
- `changelog`: A curated, typed release changelog rendered in a "What's new" modal, with a per-user localStorage unread indicator.

### Modified Capabilities
<!-- None — this is additive. No existing spec's requirements change. -->

## Impact

- **New files**: `lib/data/changelog.ts` (typed changelog data + types), a `HelpMenu` component, and a `WhatsNewModal` component (both under `components/layout/`, reused by both shells).
- **Modified files**: `components/layout/AppHeader.tsx` (Standard header) and `app/(pro)/pro/_components/ProAppHeader.tsx` (Pro header) — each mounts the Help menu next to the existing notifications bell.
- **Dependencies**: none new. Uses the already-installed shadcn `DropdownMenu` and `Dialog` primitives and `lucide-react` icons.
- **No backend, no schema, no migration.** Unread state is client-only (localStorage). Feedback/Docs/Shortcuts destinations are placeholder links.
