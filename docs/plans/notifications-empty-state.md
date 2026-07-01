# Notifications Panel — Empty State (mirror of plan-5157d28c4ef143fc)

**Hosted:** https://plan.agent-native.com/plans/plan-5157d28c4ef143fc
**Branch:** `L0vU3000/pro-ui-ux` · **Status:** review (decisions locked, not yet implemented).

## Objective

`components/layout/NotificationsPanel.tsx` falls back to the generic shared
`components/ui/EmptyState.tsx` when `notifications.length === 0` — a plain lucide
`Bell` icon, "No notifications yet", "You're all caught up. New activity will show
up here." Flat, no brand voice, disconnected from the rest of the panel (which has
custom per-category icons, a beacon-pulse unread dot, staggered fade-slide-in rows).

The panel is a **shared component** — it renders in the Owner shell (`AppHeader`,
`PhoneTopBar`, `PropertyLayout`) and the Pro cockpit (`ProAppHeader`). The design
must read correctly in both without forking.

**Primary user action:** none — a passive, reassuring state. The user should
register "nothing needs my attention" in under a second, know roughly what *would*
land here, then move on.

## Research

Mobbin sweep of B2B SaaS notification-dropdown empty states (Hootsuite, Manus, Air,
Gorgias, Time2book, folk, Rarible, Qatalog, Slite, Okta, Replit). Best references for
Valgate's restrained, confident tone:
- **folk** — "All clear" + specific copy naming what triggers a notification.
- **Air** — "You're all caught up" + specific expectation copy (best "copy earns its
  space" example).
- **Gorgias** — text-only, no icon, pure typographic restraint.
- **Okta** — thin brand-tinted bell icon, restrained.
- **Rejected reference:** Slite's illustration-heavy "hand knocking on door" — too
  decorative for `.impeccable.md` ("no decorative illustrations, no large
  icon-in-box headers, no chrome that doesn't add information").

## Locked decisions (D1/D2/D3 — all confirmed)

1. **Copy** — "All clear" headline + specific expectation copy naming what actually
   shows up here (folk/Air pattern), not vague filler. `.impeccable.md` principle 8
   ("copy earns its space... say exactly what's true").
2. **Motion** — reuse the panel's existing beacon-pulse *language* (same visual
   grammar as the real unread-dot pulse) but in slate, not brand blue — blue stays
   reserved for "unread" (principle 3, "blue is precious"). Communicates "still
   listening," not decoration.
3. **No CTA inside the empty state** — the panel footer already has a persistent
   "Manage notifications" link; a second action here would be redundant.
4. **One shared design, not persona-forked** — matches existing precedent (the panel
   is already visually identical across Owner and Pro today).

## Design language (`.impeccable.md`)

- Confident/calm/sharp, blue precious, borders over shadows, no decorative
  illustration, "copy earns its space."
- Quiet beacon mark: small slate dot + thin ring, same concentric-pulse shape as the
  real unread-dot beacon (`pin-beacon` keyframe in `styles/theme.css`), recolored
  neutral so it never competes with the brand-blue unread signal.
- Headline in `font-display` to match the panel's own "Notifications" heading, one
  step down in size. Body copy constrained to `max-w-[220px]` inside the 420px panel
  so it doesn't stretch full-width — reads more intentional.

## States

- **Empty (0 notifications)** — design below. Enters with the same `fade-slide-up`
  timing already used for real notification rows, so it doesn't read as a static
  fallback bolted onto a dynamic list.
- **Transition to populated** — no special handling; the moment
  `notifications.length > 0` the empty state stops rendering and rows take over
  (existing conditional).
- **Reduced motion** — pulse + entrance both respect `motion-reduce:animate-none`,
  matching the panel's existing pattern.

## Implementation spec

Built **inline in `NotificationsPanel.tsx`**, not as new props on the shared
`EmptyState.tsx`. `EmptyState` is reused elsewhere (documents, activity, etc.) with
plain typography; bending its defaults for one bespoke animated caller would ripple
everywhere. Mirrors the file's existing pattern — the notification rows themselves
are already bespoke JSX in this file, not a shared row component.

### `components/layout/NotificationsPanel.tsx` — replaces the `<EmptyState .../>` call

```tsx
{notifications.length === 0 && (
  <div className="flex flex-col items-center justify-center px-6 py-16 text-center animate-[fade-slide-up_0.22s_cubic-bezier(0.25,1,0.5,1)_both] motion-reduce:animate-none">
    <div className="relative w-10 h-10 mb-4 flex items-center justify-center" aria-hidden="true">
      <div className="w-2.5 h-2.5 bg-slate-300 rounded-full animate-[pin-beacon-quiet_3.5s_ease_infinite] motion-reduce:animate-none" />
    </div>
    <p className="text-[0.9375rem] font-bold text-[#121c28] font-display tracking-[-0.02em]">
      All clear
    </p>
    <p className="mt-1.5 text-[0.8125rem] text-slate-500 leading-[1.5] max-w-[220px]">
      Payments, lease activity, and access changes will show up here as they happen.
    </p>
  </div>
)}
```

- `py-16` (vs the generic component's `py-12`) — a touch more breathing room since
  this is the sole content in the panel body.
- The "quiet beacon" mark — same concentric-pulse grammar as the real unread dot,
  recolored to `slate-300` so it never competes with the brand-blue unread signal.
- Headline in `font-display` to match the panel's own "Notifications" heading, one
  size down.
- Copy names the actual notification categories (payments, leasing, access) instead
  of saying "activity" — specific per `.impeccable.md` principle 8.

### `styles/theme.css` — new keyframe, added directly below the existing `pin-beacon` (~line 81)

```css
@keyframes pin-beacon-quiet {
  0%   { box-shadow: 0 0 0 0 rgb(100 116 139 / 0.35); }
  70%  { box-shadow: 0 0 0 9px rgb(100 116 139 / 0); }
  100% { box-shadow: 0 0 0 0 rgb(100 116 139 / 0); }
}
```

## Files touched

- `components/layout/NotificationsPanel.tsx` — modified (swap the `EmptyState`
  fallback for the bespoke quiet-beacon markup above).
- `styles/theme.css` — modified (add the `pin-beacon-quiet` keyframe).
- `components/ui/EmptyState.tsx` — **untouched** (other callers unaffected).

## Verification

1. Open the panel with zero notifications in both the Owner shell (`AppHeader`) and
   Pro cockpit (`ProAppHeader`) — design reads correctly in both.
2. Beacon pulse plays continuously, stays slate (never brand blue), and stops under
   `prefers-reduced-motion`.
3. Entrance animation matches the timing/easing of real notification rows — no
   visual seam between empty and populated states.
4. "Mark all as read" / footer "Manage notifications" link still render correctly
   above/below the empty state (header + footer chrome unaffected).
5. Confirm `components/ui/EmptyState.tsx` is untouched — other callers (documents,
   activity, etc.) unaffected.
