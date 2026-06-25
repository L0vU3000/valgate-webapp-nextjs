# Phase 3 — Property sub-entities (photos, co-owners, verification revoke)

> Paste into a fresh Claude Code session. Agentic prompt with real system access. Requires Phase 0.

## Context (carry forward)
- Backend is **Neon Postgres + Drizzle**, NOT Convex. UI → Server Action → `lib/services/*`
  → Neon. Never touch `convex/`.
- Findings: `.claude/data-audit/docs/plans/Plan-Workflow-Audit.md` journeys 6, 7, 9, 11. Read first.
- Destructive actions MUST use the Phase 0 `<ConfirmAction>` + `logActivity`. Security on every
  mutation: Zod → auth → ownership (IDOR) → generic errors → storage cleanup on file delete.

## Starting state (verify each path by reading it first)
- **Photos:** photo add/delete UI exists ONLY inside the add-property draft flow
  (`Step4PhotosDocs.tsx`); there is **no way to manage photos on an existing property**.
  A photo/image upload mutation exists on the backend (check `app/actions/documents.ts` or an
  uploads/images service). "Set cover" is hard-coded to the first image.
- **Co-owners:** add + edit work (`app/actions/co-owners.ts` `createCoOwner`/`updateCoOwner`,
  `PropertyOwnershipPage.tsx`); **remove has no UI** though `removeCoOwner` (~`:45-55`) exists.
  `OwnerCard` (~`:1050-1060`) shows only Edit + View Documents.
- **Verification revoke:** financials/rental/ownership revoke is wired but the confirm is
  minimal (no typed confirm, no scope list).

## Target state — build
1. **Property photo manager** (on an existing property — likely the overview/gallery area;
   confirm where photos render). Affordances: **add/upload**, **delete** (`tier="confirm"`),
   **set cover** (a real action that updates which image is cover — not hard-coded), and
   **replace** if cheap (else skip and note it). Wire upload to the existing image mutation;
   on delete, clean up the stored S3/file object (same pattern as Phase 1).
2. **Remove co-owner** — add a remove affordance to `OwnerCard`, behind `tier="confirm"`,
   wired to `removeCoOwner`. After removal, the ownership-split math must re-balance correctly
   (verify the split still sums right). Write an activity row.
3. **Verification revoke → Tier 3.** Upgrade the revoke flow on financials/rental/ownership to
   `<ConfirmAction tier="typed">`: the dialog lists what the verification covers and requires
   typing `REVOKE`. Keep the existing backend revoke action; just strengthen the confirm + add
   `logActivity` if not already there.

## UI craft
- `mobbin` MCP: reference photo-gallery management + image upload/delete patterns.
- `/impeccable harden` the photo manager (empty state = "no photos yet", upload error/loading states).

## Acceptance criteria
- On an existing property: upload a photo, delete a photo (file also removed from storage),
  and change the cover photo — all persist without a manual reload.
- Remove co-owner works, confirms, re-balances the split, writes an activity row.
- Revoke verification requires typing `REVOKE` and lists scope; backend behavior unchanged.
- Ownership enforced on every mutation (can't manage another org's property); `tsc`/build passes.

## Forbidden / stop-and-ask
- No new dependencies, no schema/migration changes, no file deletion, no `convex/` edits.
- If no "cover photo" field exists in the schema, stop and ask before adding one (that's a
  schema change).
- After each task output `✅ [task]`.

## Stop conditions
- Stop when photos, co-owner removal, and Tier-3 revoke pass acceptance and build is green;
  summarize files changed.
- Stop and ask before anything forbidden, or if the image upload/cover backend isn't where expected.
