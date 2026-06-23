/**
 * e2e/auth/role-idor.spec.ts  —  Phase 3: Role + IDOR UI smoke
 *
 * Plan reference: e2e/auth-plan/PHASE-3-role-idor-ui.md
 *
 * ─── WHAT THIS COVERS ──────────────────────────────────────────────────────
 *
 * ROLE checks (signed in as viewer-a, who is a "viewer" in ORG-A):
 *   P-ROLE-1  Portfolio row menu has no Delete item.
 *   P-ROLE-2  Property documents page has no per-file/folder delete buttons.
 *   P-ROLE-3  Property documents page has no bulk-delete button.
 *
 * IDOR checks (signed in as owner-b, who is an "owner" in ORG-B only):
 *   P-IDOR-1  /property/<A-id>           — blocked, ORG-A data never shown.
 *   P-IDOR-2  /property/<A-id>/documents — same protection on sub-pages.
 *   P-IDOR-3  /portfolio list            — shows ONLY ORG-B rows.
 *   P-IDOR-4  /pro/clients/CLI-0001      — blocked (CLI-0001 is in ORG-0001, not ORG-B).
 *
 * ─── DESIGN ────────────────────────────────────────────────────────────────
 *
 * Uses saved storageState sessions — NO login UI is driven here.
 * Phase 1 (Vitest authz suite) is the security test of record; this phase
 * is UI confirmation only. Keep it THIN.
 *
 * ─── PREREQUISITES ─────────────────────────────────────────────────────────
 *
 * 1. Clerk Dashboard (TEST instance) → Organizations → Roles → New role
 *    key: "viewer"  (display name: Viewer)
 *    Both "viewer" and "org:viewer" are handled by normaliseRole() in
 *    lib/services/identity-sync.ts — either key works.
 *
 * 2. Re-run the provision script to update viewer-a from org:member → viewer:
 *      node scripts/provision-clerk-test-users.mjs
 *
 * 3. Re-save sessions (re-runs auth-setup, writes new storageState files):
 *      npm run test:e2e:auth
 *
 * 4. Verify: sign in as viewer-a in a scratch test and check the app logs
 *    "role=viewer" (not "role=member") before running these assertions.
 *    If it still says "member", the custom role is not set up in Clerk yet.
 *
 * ─── RUN COMMAND ───────────────────────────────────────────────────────────
 *
 *   # terminal 1 — auth server (real Clerk keys, port 3002):
 *   npm run dev:e2e-auth
 *
 *   # terminal 2 — Node ≥24 required (Node 22 + PW 1.61 loader bug):
 *   PATH=~/.nvm/versions/node/v24.17.0/bin:$PATH PLAYWRIGHT_AUTH=1 \
 *     npx playwright test e2e/auth/role-idor.spec.ts --project=auth
 */

import { test, expect } from '@playwright/test'
import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'
import {
  lookupOrgByClerkId,
  lookupOwnerUserIdByClerkOrgId,
  createThrowawayPropertyInOrg,
  cleanup,
  type AuthThrowawayIds,
} from '../helpers/db-auth'

// Load DATABASE_URL so db-auth can connect to Neon.
// .env.local has DATABASE_URL; .env.e2e-auth only has Clerk keys.
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env.e2e-auth'), override: true })

// Read the Clerk org IDs written by scripts/provision-clerk-test-users.mjs.
// The JIT sync (lib/auth/ctx.ts) stores the Clerk org ID as the org's name
// placeholder, so we must look up orgs by clerk_org_id, not by "ORG-A".
// The provision script writes this file so tests never need to call the Clerk API.
const TEST_ORG_IDS = JSON.parse(
  readFileSync(resolve(process.cwd(), 'playwright/.clerk/test-org-ids.json'), 'utf-8'),
) as { orgAClerkId: string; orgBClerkId: string }

// ── Shared seed state ─────────────────────────────────────────────────────────
//
// Populated in beforeAll, read by all tests.
// Declared at module scope so the afterAll cleanup can always reach them
// even if beforeAll throws partway through.

// A property seeded in ORG-A. Used by:
//   • viewer role tests (viewer-a belongs to ORG-A and can navigate to it)
//   • IDOR tests (owner-b must NOT be able to view it)
let orgAProperty: AuthThrowawayIds | undefined

// A property seeded in ORG-B. Used by:
//   • IDOR list isolation test (owner-b's portfolio must include this, not orgAProperty)
let orgBProperty: AuthThrowawayIds | undefined

// ── Setup / teardown ──────────────────────────────────────────────────────────

test.beforeAll(async () => {
  // ── Resolve ORG-A ─────────────────────────────────────────────────────────
  // The JIT sync (lib/auth/ctx.ts) stores the Clerk org ID as the org name
  // placeholder — webhook would fill in the real name, but E2E has no webhook.
  // So we look up by clerk_org_id using the IDs written by the provision script.
  const orgALookup  = await lookupOrgByClerkId(TEST_ORG_IDS.orgAClerkId)
  const orgAOwnerId = await lookupOwnerUserIdByClerkOrgId(TEST_ORG_IDS.orgAClerkId)

  // ── Resolve ORG-B ─────────────────────────────────────────────────────────
  const orgBLookup  = await lookupOrgByClerkId(TEST_ORG_IDS.orgBClerkId)
  const orgBOwnerId = await lookupOwnerUserIdByClerkOrgId(TEST_ORG_IDS.orgBClerkId)

  // ── Seed one property per org ─────────────────────────────────────────────
  // Properties are clones of PROP-0001 with overridden org_id / user_id / name.
  // The name is deterministic (E2E-PROP-XXXX) so tests can assert presence
  // or absence by text without fragile CSS selectors.
  orgAProperty = await createThrowawayPropertyInOrg(orgALookup.internalId, orgAOwnerId)
  orgBProperty = await createThrowawayPropertyInOrg(orgBLookup.internalId, orgBOwnerId)
})

test.afterAll(async () => {
  // Remove both seeded rows.  CASCADE deletes any child records (leases, documents, etc.).
  // We pass the variables directly — cleanup() handles undefined gracefully in case
  // beforeAll threw before they were assigned.
  await cleanup(orgAProperty, orgBProperty)
})

// ── ROLE tests — signed in as viewer-a ───────────────────────────────────────
//
// viewer-a is a member of ORG-A with role "viewer" (RANK 0 in the role ladder).
// The app's canDelete flag requires role "admin" (RANK 2) or higher, so the
// Delete row-action must not appear in the UI for a viewer.
//
// Phase 1 (Vitest authz suite) already proves the server rejects delete mutations
// from viewers.  This block confirms the UI does not accidentally expose them.

test.describe('viewer-a: no destructive controls visible', () => {
  // All tests in this block start pre-authenticated as viewer-a.
  // The JSON session file was saved by auth.setup.ts.
  test.use({ storageState: 'playwright/.clerk/viewer-a.json' })

  // ── P-ROLE-1: Portfolio row menu ──────────────────────────────────────────
  test('P-ROLE-1 — portfolio row menu: Delete absent for viewer', async ({ page }) => {
    // Navigate to the portfolio page.
    // viewer-a is in ORG-A, so ORG-A's properties — including our seeded one — should appear.
    await page.goto('/portfolio')
    // The row-actions trigger uses aria-label "Actions for <name>" (PropertyTable.tsx).
    // We wait for it to be visible to confirm the seeded property actually loaded.
    const menuTrigger = page.getByRole('button', {
      name: `Actions for ${orgAProperty!.name}`,
    })
    await expect(
      menuTrigger,
      `P-ROLE-1 precondition: seeded property "${orgAProperty!.name}" must appear in viewer-a portfolio`,
    ).toBeVisible({ timeout: 10_000 })

    await menuTrigger.scrollIntoViewIfNeeded()

    // Force-click bypasses Playwright's actionability check on opacity.
    // PropertyTable uses a group-hover pattern (opacity-0 → opacity-100 on row hover)
    // so the button is in the DOM and aria-accessible but invisible until the row is
    // hovered.  force: true dispatches the click event directly so Radix opens the menu
    // without needing the hover → visible transition.
    await menuTrigger.click({ force: true })

    // The Delete item is only rendered when canDelete=true (admin/owner role only).
    // A viewer must not see it.  toHaveCount(0) is the recommended way to assert
    // absence because it does not wait for an element to become invisible — it
    // simply checks the DOM count immediately.
    await expect(
      page.getByRole('menuitem', { name: 'Delete' }),
      'P-ROLE-1: Delete menu item must not appear in the row menu for a viewer',
    ).toHaveCount(0)

    // Close the menu so it does not interfere with other tests running serially.
    await page.keyboard.press('Escape')
  })

  // ── P-ROLE-2: Documents page — per-file / per-folder delete buttons ───────
  // FIXME (tracked, not a flake): this cannot pass-for-the-right-reason today.
  //   1. PropertyDocumentsPage renders delete controls UNCONDITIONALLY — it has
  //      no canDelete / role gate (verified: delete buttons at lines ~693/1660/
  //      1754, no orgRole check). So a viewer DOES see them. The server still
  //      rejects the action (proven in Phase 1), so this is a defence-in-depth
  //      UI gap, not an open hole — but the button should not be surfaced.
  //   2. The throwaway property is seeded with ZERO documents, so the page is
  //      empty and any delete-button assertion passes trivially regardless of
  //      role — a false green.
  //   3. The real per-file aria-label is `Delete ${name}` (NOT "Delete file"),
  //      so the selector below would never match even with documents present.
  // To make this real: seed a document into the property, fix the selector to
  // match `Delete ${name}`, then add a canDelete gate to PropertyDocumentsPage.
  // Until the app gates delete by role, this test stays fixme so it never
  // false-greens. See e2e/QA-FINDINGS.md.
  test.fixme('P-ROLE-2 — documents: per-file delete buttons absent for viewer', async ({ page }) => {
    // Navigate to the documents tab of the seeded ORG-A property.
    // viewer-a is in ORG-A so this page should load (not be blocked).
    await page.goto(`/property/${orgAProperty!.propertyId}/documents`)
    await expect(
      page.locator('[aria-label*="Delete "]'),
      'P-ROLE-2: per-file and per-folder delete buttons must not appear for a viewer',
    ).toHaveCount(0)
  })

  // ── P-ROLE-3: Documents page — bulk-delete button ─────────────────────────
  // FIXME (tracked): same root cause as P-ROLE-2 — the documents page has no
  // role gate, and the bulk-delete control only appears after files are
  // selected. With zero seeded documents the page is empty, so this passes
  // trivially (false green). Keep fixme until delete is role-gated and a
  // document is seeded to select. See e2e/QA-FINDINGS.md.
  test.fixme('P-ROLE-3 — documents: bulk delete button absent for viewer', async ({ page }) => {
    // Navigate to the same documents tab.
    await page.goto(`/property/${orgAProperty!.propertyId}/documents`)
    // The bulk-delete trigger renders text like "Delete 3 files" once the user
    // selects files and has delete permission.
    // A viewer must never see this button, regardless of selection state.
    await expect(
      page.getByRole('button', { name: /delete \d+ file/i }),
      'P-ROLE-3: bulk delete button must not appear for a viewer',
    ).toHaveCount(0)
  })
})

// ── IDOR tests — signed in as owner-b ────────────────────────────────────────
//
// owner-b belongs ONLY to ORG-B.
// Every ORG-A URL — and every URL belonging to any other org — must be blocked.
// The server calls requireCtx() which scopes all queries to the active org.
// A blocked page should redirect to "/" or show a not-found / error state —
// NEVER render the target org's data.

test.describe('owner-b: cannot access resources belonging to other orgs', () => {
  // All tests in this block start pre-authenticated as owner-b.
  test.use({ storageState: 'playwright/.clerk/owner-b.json' })

  // ── P-IDOR-1: Property page ───────────────────────────────────────────────
  test('P-IDOR-1 — property page: owner-b cannot view an ORG-A property', async ({ page }) => {
    // Navigate directly to the ORG-A property URL using the seeded property's ID.
    await page.goto(`/property/${orgAProperty!.propertyId}`)
    // The seeded property name is unique and deterministic (E2E-PROP-XXXX).
    // If this text appears anywhere on the page, the IDOR boundary has been crossed.
    // A blocked page will either redirect (landing somewhere else) or show a 404 —
    // neither of which contains the property name.
    await expect(
      page.getByText(orgAProperty!.name),
      `P-IDOR-1: ORG-A property name "${orgAProperty!.name}" must not appear for owner-b`,
    ).toHaveCount(0)
  })

  // ── P-IDOR-2: Property sub-pages ──────────────────────────────────────────
  test('P-IDOR-2 — property documents: owner-b cannot view ORG-A sub-pages', async ({ page }) => {
    // The documents sub-page is protected by the same requireCtx + property
    // ownership check as the main property page.
    await page.goto(`/property/${orgAProperty!.propertyId}/documents`)
    // ORG-A property data must not appear in any form.
    await expect(
      page.getByText(orgAProperty!.name),
      `P-IDOR-2: ORG-A property name must not appear on its documents page for owner-b`,
    ).toHaveCount(0)
  })

  // ── P-IDOR-3: Portfolio list isolation ────────────────────────────────────
  test('P-IDOR-3 — portfolio list: owner-b sees only ORG-B rows, not ORG-A rows', async ({ page }) => {
    // Navigate to the portfolio — owner-b's active org is ORG-B.
    await page.goto('/portfolio')
    // PRECONDITION: ORG-B's seeded property MUST appear.
    // This confirms the portfolio query is working and the list is not simply empty
    // (an empty list would give a false-green on the ORG-A absence check below).
    // PropertyTable renders property name in both a mobile card (first in DOM, hidden on
    // desktop viewports) and a desktop table row (last in DOM, visible on desktop).
    // .first() resolves to the hidden mobile element → toBeVisible fails.
    // .last() resolves to the visible desktop row element.
    await expect(
      page.getByText(orgBProperty!.name).last(),
      `P-IDOR-3 precondition: ORG-B property "${orgBProperty!.name}" must be visible to owner-b`,
    ).toBeVisible({ timeout: 10_000 })

    // The ORG-A property must NOT appear in the list.
    // If it does, the portfolio query is leaking cross-org data.
    await expect(
      page.getByText(orgAProperty!.name),
      `P-IDOR-3: ORG-A property "${orgAProperty!.name}" must not appear in owner-b's portfolio`,
    ).toHaveCount(0)
  })

  // ── P-IDOR-4: Pro client page ─────────────────────────────────────────────
  // FIXME (tracked): this does not cleanly prove org-A-vs-org-B IDOR.
  //   - It targets CLI-0001, which is DEMO data in ORG-0001 (not ORG-A) — ORG-A
  //     has no seeded clients to use as a target.
  //   - In practice the /pro/clients/CLI-0001 page RENDERS for owner-b (the
  //     /pro "manager cockpit" layer's org-scoping is not confirmed), and the
  //     test only checks that no "Edit" button is present — a weak signal that
  //     passes without proving the client's data is actually withheld.
  // Decision needed: is the /pro layer meant to be org-scoped? If so, give ORG-A
  // a seeded client and assert owner-b is blocked from it. Until that product
  // decision + a real ORG-A client target exist, this stays fixme rather than
  // give false confidence. Service-layer org-scoping is proven in Phase 1.
  // See e2e/QA-FINDINGS.md.
  test.fixme('P-IDOR-4 — pro client: owner-b cannot view a client from another org', async ({ page }) => {
    // CLI-0001 is a seed client that belongs to the demo org (ORG-0001).
    // owner-b is only in ORG-B, so they must be blocked from viewing this client.
    //
    // Note: ORG-A has no seeded clients of its own (it is a bare test org with no
    // demo data).  We use CLI-0001 from ORG-0001 as a valid "another org's client"
    // because owner-b has no membership in ORG-0001 either.
    await page.goto('/pro/clients/CLI-0001')
    // The server will either redirect owner-b away from the client page or render
    // a not-found / forbidden state.  Either outcome is correct.
    // We check this by asserting that the "Edit" button — which only appears on a
    // successfully-loaded client detail page — is not present.
    // (Checking for the client name would also work but "Edit" is a cleaner signal
    // of a fully-loaded page versus an error / empty state.)
    const currentUrl = page.url()

    if (currentUrl.includes('/pro/clients/CLI-0001')) {
      // We are still on the URL — the server rendered something at this path.
      // It must be a not-found / error page, NOT a successfully-loaded client page.
      // Assert that no edit button appears (a loaded page always has one).
      await expect(
        page.getByRole('button', { name: /edit/i }),
        'P-IDOR-4: edit button must not appear — a loaded client page for another org is an IDOR leak',
      ).toHaveCount(0)
    }
    // If the URL changed, the server redirected owner-b away — IDOR protection is working.
    // No further assertion needed in that case.
  })
})
