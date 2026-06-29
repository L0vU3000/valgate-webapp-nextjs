import { test, expect } from './fixtures'

/**
 * Example Playwright tests for the Valgate homepage.
 *
 * These are starter tests — replace or expand them to match your actual app.
 *
 * To run: npm run test:e2e
 */

test('homepage loads and has a title', async ({ page }) => {
  // Go to the homepage
  await page.goto('/')

  // Check the page title contains something (update 'Valgate' to your actual title)
  await expect(page).toHaveTitle(/Valgate/i)
})

test('homepage is visible — not a blank screen', async ({ page }) => {
  await page.goto('/')

  // Wait for the page body to have some content
  const body = page.locator('body')
  await expect(body).not.toBeEmpty()
})
