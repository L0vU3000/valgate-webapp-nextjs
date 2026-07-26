## Why

`cut-to-mvp-core` was the Instagram-from-Burbn cut: it stripped Valgate to the property-vault core.
That cut was deliberately over-aggressive so the diff would tell a clean story. After living with it,
four surfaces read as **too thin for the "know what your property is worth and what's happening to it"**
promise, and one cut item is better replaced than resurrected.

This change **partially reverses** the cut. It is the mirror of `cut-to-mvp-core`: same branch, same
"schema was never dropped, so restoring is a git checkout" property. Three features come back verbatim
from `valgate-pro @ 44c70b9f`, the user manual returns as **public** content (not app-shell bloat), and
the standalone Activity feed is **not** restored — it is replaced by a contextual Activity panel on the
property detail, matching how Dropbox (a best-in-class file/asset vault) actually surfaces activity.

Rationale, options, and the Mobbin/Dropbox research that drove the Activity decision are recorded in
`.context/valgate-core-scope.md` (revision log, 2026-07-13).

> **Deliberate, not drift:** Analytics, Financials, and AI chat were three of the heaviest cut items.
> Adding them back moves the build a real step from the "focused cut" toward the fuller app. This is a
> conscious scope decision, captured here so it is auditable — not scope creep.

## What Changes

**Restore depth = mirror of the cut's depth-B.** Restored features are checked out from `valgate-pro`
and re-wired into the kept surface. No new tables (the dormant schema already backs everything here).
No `seed:reset`.

### Restore (verbatim from `valgate-pro @ 44c70b9f`)

| Restore | Surface | Source |
|---|---|---|
| **Analytics** | `/analytics` (portfolio dashboards) + sidebar item | `app/(shell)/analytics/**` |
| **Financials tab** | `property/[id]/financials` + overview summary card | `app/(shell)/property/[id]/financials/**` |
| **AI chat assistant** | conversational overlay + Agent Hub (scan/extraction already kept) | `components/layout/ai-overlay/**` + Agent Hub entries in `ShellLayout` |

### Relocate (not a straight restore)

| Item | Change |
|---|---|
| **Fumadocs user manual** | Restore as a **public** `app/(marketing)/docs/**` route group, **outside** the authenticated `(shell)`. Support content, not app functionality — unauthenticated, SEO-indexable, code-split from the app bundle so it does not undo the cut. |

### Add (new capability — not a restore)

| Add | Surface |
|---|---|
| **Property Activity panel** | A contextual, right-rail activity list on `property/[id]` — "who changed the valuation / added a document / edited ownership, and when." Reads the **existing dormant `activities` table** (already has `propertyId` + `ix_activities_property`, comment: "used by the per-property panel"). |

The standalone global Activity feed (`/activity`) **stays cut** — Dropbox has no standalone consumer
feed; activity is scoped to the file/folder (here: the property).

### Wiring (the real work)

1. **Sidebar** — Home, Portfolio, Rental, **Analytics**, Settings (Analytics re-added; still no Pro).
2. **Property detail** — re-add the `financials` tab to the tab bar + its overview summary card; mount the
   Activity panel.
3. **ShellLayout** — re-mount the AI chat overlay + Agent Hub entry points.
4. **Activity writes** — the `activities` table is dormant (nothing writes to it), so the panel would be
   empty. Emit an activity row from the **kept** mutation paths: property update, valuation add, document
   add/remove, ownership edit. This — not the panel UI — is the substantive new work.
5. **next.config / middleware** — no Pro rewrites return; `(marketing)` is a public group, so ensure
   Clerk middleware treats `/docs` as public.

## Non-goals

- **No Pro / manager cockpit.** Still single-owner. `app/(pro)/**` stays deleted.
- **No standalone Activity feed.** Replaced by the per-property panel, not resurrected.
- **No schema change.** Every restored/added surface reads tables that already exist. No migration, no
  `seed:reset`.
- **No redesign** of the restored features — they come back as they were on `valgate-pro`.

## Impact

- **Affected routes:** +`/analytics`, +`property/[id]/financials`, +`(marketing)/docs/**` (public).
- **Affected code:** `Sidebar`, `PropertyLayout` + property overview, `ShellLayout` (AI overlay),
  `middleware.ts` (public `/docs`), and the kept mutation services/actions (property, valuation,
  documents, ownership) which gain an `activities` write.
- **Untouched:** `lib/db/schema/**` (no new tables), seed data, Neon branch.
- **Reversibility:** full — re-cutting is deleting these paths again; `valgate-pro @ 44c70b9f` remains the
  canonical full snapshot.
- **Verification:** `tsc` + `lint` + `build` clean; manual pass of the 5-item nav, the financials tab,
  the AI overlay, public `/docs` while logged out, and the Activity panel showing a real row after a
  property edit.
