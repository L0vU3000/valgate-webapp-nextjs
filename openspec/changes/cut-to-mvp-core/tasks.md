> **Execution status (2026-07-12):** Phases 0–2 done; Phase 4 done; Phase 5 tsc + `next build`
> **green** (234 files deleted, MVP route set only). Phase 3 (delete cut *services*) intentionally
> **deferred** — the cut-feature services (certifications, inspections, safety-risks, estate,
> maintenance, professionals, managers, client-*) feed the shared **Progress-stat** derivations
> (`lib/data/{cached-reads,progress-context,derivations/portfolio-snapshot}`) and **auth/webhooks**,
> which the *kept* pages use. Removing them is a backend refactor (re-scope the progress pillars to the
> 5 kept ones; slim auth), not a mechanical delete. Left dormant per depth-B "schema stays" spirit.
> Phase 6 (commit/PR) pending user go-ahead.

## 0. Safety net (do first)

- [ ] 0.1 Confirm `valgate-pro` exists on origin at `44c70b9f` (full pre-cut snapshot). ✅ verified
- [ ] 0.2 Work on `valgate-mvp-v1` only. Do **not** touch the DB: no migration, no `seed:reset`.

## 1. Delete the Pro product (biggest, cleanest cut)

- [ ] 1.1 Delete the entire `app/(pro)/` tree (dashboard, clients, as-client mirror, rent,
      work-orders, compliance, agents, add-account, `queries.ts`, `actions.ts`, `_components/`).
- [ ] 1.2 Delete `lib/services/pro/` and Pro-only services: `managers.ts`, `managed-orgs.ts`,
      `pro-dashboard.ts`, `pro-derive.ts`, `client-invitations.ts`, `client-onboarding.ts`,
      `client-records.ts`, `portfolio-members.ts`, `portfolio-shared.ts`, `professionals.ts`.
- [ ] 1.3 `middleware.ts` + `next.config.ts` — remove `/pro` and `/manager` rewrites/redirects.
- [ ] 1.4 Remove the `Pro` item from the consumer `Sidebar`.

## 2. Delete cut Consumer routes

- [ ] 2.1 Delete `app/(shell)/`: `directory/`, `directory/[id]/`, `work-orders/`, `compliance/`,
      `analytics/`, `estate-planning/`, `activity/`, `portfolio/pending-changes/`, `dbdiagram/`.
- [ ] 2.2 Delete `app/launch/` and `app/docs/` (Fumadocs manual) + its config/deps if isolated.
- [ ] 2.3 Delete property sub-tabs `property/[id]/financials/`, `property/[id]/safety/`,
      `property/[id]/ownership2/`.

## 3. Delete cut services (schema stays dormant — do NOT delete `lib/db/schema/*`)

- [ ] 3.1 Delete services used only by cut routes: `maintenance-items.ts` + `maintenance-import.ts`;
      `certifications.ts` + `certification-import.ts`; `inspections.ts` + `inspection-import.ts`;
      `safety-risks.ts` + `safety-risk-import.ts`; `successors.ts` + `successor-import.ts`;
      `estate-assignments.ts`, `estate-activity-events.ts`; `change-requests.ts`,
      `change-request-types.ts`, `_change-request-dispatcher.ts`; `notifications.ts`,
      `notification-preferences.ts`; `activities.ts`/`activity.ts`; `emergency-contacts.ts` +
      `emergency-contact-import.ts` (unless rental keeps them).
- [ ] 3.2 Delete any `*.actions.ts` that only fed cut routes.
- [ ] 3.3 Let `tsc` be the guide: fix every "cannot find module" by deleting the now-dead importer,
      not by re-adding the service.

## 4. Unwire cut features from KEPT surface

- [ ] 4.1 Consumer `Sidebar` — final nav is exactly: Home, Portfolio, Rental, Settings.
- [ ] 4.2 `property/[id]/overview` — remove cards/sections summarizing safety, financials, compliance,
      estate. Keep overview, location, valuation, ownership, rental, documents. Fix the tab bar.
- [ ] 4.3 `ShellLayout` — unmount the AI chat overlay (`components/layout/ai-overlay/*`) and Agent Hub
      entry points. Keep the document scan / extraction UI that lives inside add-property.
- [ ] 4.4 Home (`/`) — remove any tiles linking to cut features.
- [ ] 4.5 Settings — remove toggles for cut features (e.g. Pro/account-type mode, notification prefs).

## 5. Verify (no DB changes anywhere)

- [ ] 5.1 `npx tsc --noEmit` clean (0 errors).
- [ ] 5.2 `npm run lint` clean.
- [ ] 5.3 `npm run build` succeeds.
- [ ] 5.4 Manual pass: log in → 4-item nav renders → add-property (AI scan fills fields) → property
      appears in Portfolio → open it → overview/location/valuation/ownership/rental/documents all load
      → `/rental` loads. No 404s from the kept nav; no dead links.
- [ ] 5.5 Grep for orphaned imports of deleted modules and dangling `<Link href="/work-orders">` etc.

## 6. Land

- [ ] 6.1 Commit on `valgate-mvp-v1`; PR base = `valgate-webapp-nextjs-v1.0.2`.
- [ ] 6.2 Archive this change (`openspec/changes/archive/`) once merged.
