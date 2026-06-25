/**
 * Section O — Pro — Properties register
 */
import { test, expect } from './fixtures'
import { createThrowawayProperty, cleanup } from './helpers/db'

test.describe('O — Pro Properties Register', () => {
  // The register only lists properties "under management" (with a client_id). The seed
  // catalog is under ORG-0009, so the ORG-0001 demo register is empty — create one managed
  // throwaway so O1 (clear-search restores rows) and O3 (count footer) have data to show.
  // (See QA-FINDINGS: seed-org mismatch.)
  let managedPropId: string

  test.beforeAll(async () => {
    const ids = await createThrowawayProperty({ managedByClientId: 'CLI-0001' })
    managedPropId = ids.propertyId
  })

  test.afterAll(async () => {
    await cleanup(managedPropId)
  })

  test('O0: properties register page loads', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'O0 — register page loads' })

    await test.step('Navigate and confirm heading', async () => {
      await page.goto('/pro/properties')
      await expect(page).not.toHaveURL(/login/)
      await expect(page.locator('h1, h2, [role="heading"]').first()).toBeVisible({ timeout: 10_000 })
    })
  })

  test('O1: search filter narrows results', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'O1 — search narrows results' })

    await test.step('Find search input', async () => {
      await page.goto('/pro/properties')
      const searchInput = page
        .getByPlaceholder(/search properties/i)
        .or(page.getByRole('searchbox'))
        .or(page.getByRole('textbox', { name: /search/i }))
      await expect(searchInput).toBeVisible({ timeout: 10_000 })
      return searchInput
    })

    await test.step('Type no-match query → empty state', async () => {
      const searchInput = page
        .getByPlaceholder(/search properties/i)
        .or(page.getByRole('searchbox'))
        .or(page.getByRole('textbox', { name: /search/i }))
      await searchInput.fill('XXXXXXNONEXISTENT')
      await expect(
        page.getByText(/no properties|no results|no match/i),
      ).toBeVisible({ timeout: 5_000 })
    })

    await test.step('Clear search → results restore', async () => {
      const searchInput = page
        .getByPlaceholder(/search properties/i)
        .or(page.getByRole('searchbox'))
        .or(page.getByRole('textbox', { name: /search/i }))
      await searchInput.fill('')
      await expect(
        page.getByText(/no properties|no results|no match/i),
      ).not.toBeVisible({ timeout: 5_000 })
    })
  })

  test('O2: client filter works', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'O2 — client filter' })

    await test.step('Select All clients and confirm rows visible', async () => {
      await page.goto('/pro/properties')
      const clientFilter = page
        .getByRole('combobox', { name: /filter by client/i })
        .or(page.locator('select[aria-label*="client" i]'))
      if (!await clientFilter.isVisible({ timeout: 5_000 })) {
        test.skip(true, 'Client filter not visible — may not render if no clients exist')
        return
      }
      // Native <select aria-label="Filter by client">. Its first option is
      // <option value="all">All clients</option>. selectOption's { label }
      // form needs an exact string (a RegExp is silently invalid), so select
      // by the stable option value instead.
      await clientFilter.selectOption('all')
      await expect(
        page.locator('table tbody tr, [role="row"]:not([role="columnheader"])').first(),
      ).toBeVisible({ timeout: 5_000 })
    })
  })

  test('O3: footer shows honest count — no silent truncation', async ({ page }) => {
    test.info().annotations.push({ type: 'checklist', description: 'O3 — honest count footer' })

    await test.step('Confirm showing-N-of-M footer pattern visible', async () => {
      await page.goto('/pro/properties')
      await expect(
        page.getByText(/showing (all \d+|\d+ of \d+) propert/i),
      ).toBeVisible({ timeout: 10_000 })
    })
  })
})
