## Context

The app has two separate shells with two separate headers:

- **Standard shell** — `components/layout/AppHeader.tsx`, rendered per-page across ~9 owner-side pages. Right-side actions today: optional "Pro" pill + a notifications bell. The bell uses a hand-rolled `useRef` + `useEffect` outside-click pattern with a custom `NotificationsPanel`.
- **Pro shell** — `app/(pro)/pro/_components/ProAppHeader.tsx`, a single mount point. Right-side actions today: "My portfolio" pill + a "Create" dropdown + a notifications bell. `ManagerSidebar.tsx` already uses the shadcn `DropdownMenu` primitive for its account menu, so the pattern is established in the codebase.

Both `components/ui/dropdown-menu.tsx` and `components/ui/dialog.tsx` exist. No markdown renderer (`react-markdown`/`remark`/`mdx`) is installed. App version in `package.json` is `0.1.0`; there is no `VERSION` file or `CHANGELOG.md`. Commit messages are conventional-commit, engineering-facing (`fix(pro): close IDOR`), unsuitable to show users verbatim.

## Goals / Non-Goals

**Goals:**
- One shared Help affordance visible in both shells, same position, same behavior.
- A real, curated changelog that speaks to users, with a lightweight "unread" nudge.
- Reuse existing shadcn primitives; add zero dependencies.
- Keep the edit surface small: two shared components + a data file + two header edits.

**Non-Goals:**
- No feedback backend (Send Feedback is a `mailto:` placeholder; a Resend-backed form is out of scope).
- No user manual site and no shortcuts reference page (Docs and Keyboard Shortcuts are placeholder links).
- No auto-generation of changelog from git history.
- No server-side or per-account persistence of "unread" state (client-only localStorage).
- No markdown rendering (would require a new dependency).

## Decisions

**1. Shared components, mounted in each header.** Build two reusable client components under `components/layout/`:
- `HelpMenu` — the `?` button + shadcn `DropdownMenu` + the unread dot. Owns the localStorage read and the modal open state.
- `WhatsNewModal` — shadcn `Dialog` rendering `CHANGELOG` from the data file; controlled `open`/`onOpenChange` props.

Both `AppHeader.tsx` and `ProAppHeader.tsx` import and render `<HelpMenu />` next to their bell. Placement mirrors the bell so users get a familiar affordance. Rationale: two shells, one behavior — sharing the component avoids drift and keeps each header edit to a single added element.

**2. Changelog is a typed TS file, not markdown.** `lib/data/changelog.ts` exports a typed `CHANGELOG` array:
```ts
export type ChangeTag = "New" | "Improved" | "Fixed";
export type ChangelogEntry = { tag: ChangeTag; text: string };
export type ChangelogRelease = { version: string; date: string; entries: ChangelogEntry[] };
export const CHANGELOG: ChangelogRelease[] = [ /* newest first */ ];
```
Rationale: no renderer is installed, so markdown would mean a new dependency + parser. A typed array renders directly in JSX, gives tag badges for free, and makes "newest version" a trivial `CHANGELOG[0].version` lookup for the unread check. Entries are curated by a human from the commit log — the log is a drafting source, never read at runtime.

**3. Unread dot via localStorage version compare.** Key: `valgate:changelog:last-seen`. On mount, `HelpMenu` reads the stored version and compares to `CHANGELOG[0].version`; if the newest is greater (or nothing stored yet), it shows a dot. Opening the modal writes `CHANGELOG[0].version` to localStorage and hides the dot. Rationale: the whole point of a changelog is the nudge to open it; localStorage gives that with zero backend. Version comparison uses a simple semver-ish compare on the leading `x.y.z`.

**4. Placeholder destinations are explicit links, not dead text.** Send Feedback → `mailto:` (address TBD — use a project support address). Docs and Keyboard Shortcuts → `href="#"` with a `title`/`aria` hint, so they're functional affordances that light up when a real URL exists. Rationale: honest placeholders that are trivially swapped, kept out of the "no mocks" trap by being named as deferred in the proposal.

## Risks / Trade-offs

- **Manual changelog upkeep.** Entries won't write themselves — each release needs someone to curate user-facing lines from the commit log. Accepted: this is the point (engineering commits aren't user-facing), and it's a few lines per release. If it becomes a burden, a future change can add a drafting helper.
- **localStorage-only unread state** means the dot resets per browser/device and doesn't sync. Accepted for a low-stakes nudge; upgrade path is a per-user server field if it ever matters.
- **`AppHeader.tsx` renders per-page** (~9 call sites) while `ProAppHeader` mounts once. Since `HelpMenu` is self-contained, no per-page wiring is needed — it just rides along inside the header. No extra risk, but worth noting the asymmetry.
- **Version string discipline.** The unread compare assumes `CHANGELOG[0].version` is a monotonic `x.y.z`. If someone authors an out-of-order or malformed version, the dot logic misbehaves. Mitigated by keeping the compare defensive (fall back to "show dot" on parse failure).
- **Placeholder links** could read as unfinished to a sharp-eyed user. Accepted and deliberate; flagged in the proposal so it's a decision.
