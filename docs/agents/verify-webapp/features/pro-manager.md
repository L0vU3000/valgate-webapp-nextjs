# Shared organisation (family members view one portfolio)

Product decision 2026-11-09: the Manager (Pro) cockpit is disabled. The wanted
feature is **multi-user sharing of one organisation** — family members VIEW the
same portfolio (read-only). Plan: `docs/plans/SHARED-ORG-PLAN.md` (rides the
Phase-6 viewer role + Clerk org membership; no cockpit).

## Sub-features
- SO-1: Owner invites a member by email (role preset viewer) in Settings → Sharing.
- SO-2: Member signs in and sees the same portfolio, read-only.
- SO-3: Mutations outside `change_requests` are denied server-side for non-owners.
- SO-4: Owner approves/denies a member's proposed change.

Status: NOT BUILT YET — spec specs pending. When round R-A lands this file
becomes the driving recipe (each sub-feature maps to a new Playwright spec).

## Gotchas
`/pro/*` routes are absent from the shell; do not map journeys there. The
api/v1 contract must gain membership-aware ctx (two-round rule: web first,
then the iOS consumer) before an iOS family member can view a shared portfolio.
