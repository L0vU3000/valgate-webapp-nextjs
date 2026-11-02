import { test, expect } from './fixtures'

/**
 * Smoke checks for the public marketing homepage.
 *
 * To run: npm run test:e2e
 */

test('homepage loads and has a title', { tag: '@smoke' }, async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.ok()).toBe(true)
  await expect(page.getByRole('heading', {
    name: 'Your property records, finally in order.', exact: true,
  })).toBeVisible()
  await expect(page).toHaveTitle(/Valgate/i)
})

test('homepage is visible — not a blank screen', { tag: '@smoke' }, async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.ok()).toBe(true)
  const main = page.getByRole('main')
  await expect(main.getByRole('heading', {
    name: 'Your property records, finally in order.', exact: true,
  })).toBeVisible()
  const getStarted = main.getByRole('link', { name: 'Get started', exact: true })
  await expect(getStarted).toBeVisible()
  await expect(getStarted).toHaveAttribute('href', '/register')
})
