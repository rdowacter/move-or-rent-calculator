import { test, expect } from '@playwright/test'

/**
 * Mobile viewport smoke tests (375x812).
 *
 * These tests verify that the app loads, renders key sections, and does
 * not produce horizontal overflow at a typical mobile viewport size.
 * They do NOT test financial calculation correctness — that is covered
 * by the Vitest unit tests in src/engine/.
 */

test.describe('Mobile viewport (375x812)', () => {
  test('page loads with correct title', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Move or Rent Calculator/)
  })

  test('input tab is visible and shows form sections', async ({ page }) => {
    await page.goto('/')

    // The mobile layout should show a tab bar with Inputs and Results
    const inputsTab = page.getByRole('tab', { name: 'Inputs' })
    await expect(inputsTab).toBeVisible()

    const resultsTab = page.getByRole('tab', { name: 'Results' })
    await expect(resultsTab).toBeVisible()

    // The heading should be visible
    await expect(
      page.getByRole('heading', { name: 'Move or Rent Calculator' })
    ).toBeVisible()

    // Accordion sections should be present
    await expect(
      page.getByRole('button', { name: 'About You' })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Retirement' })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Current Home/ })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /New Home/ })
    ).toBeVisible()
  })

  test('results tab shows warnings list', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('tab', { name: 'Results' }).click()

    // Warnings section should be present (default inputs produce warnings)
    // Allow time for model computation
    const warningsRegion = page.getByRole('region', { name: 'Warnings' })
    await expect(warningsRegion).toBeVisible({ timeout: 15000 })

    // At least one warning alert should be present
    const alerts = warningsRegion.getByRole('alert')
    await expect(alerts.first()).toBeVisible()
  })

  test('results tab renders verdict or warnings', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('tab', { name: 'Results' }).click()

    // Wait for model to compute — either verdict section or warnings will appear
    // With default inputs ($0 savings), verdict may show "none viable" or
    // warnings will show dealbreakers. Either confirms the engine is working.
    const verdictOrWarnings = page
      .getByTestId('verdict-section')
      .or(page.getByRole('region', { name: 'Warnings' }))
    await expect(verdictOrWarnings.first()).toBeVisible({ timeout: 15000 })
  })

  test('no horizontal overflow at 375px viewport', async ({ page }) => {
    await page.goto('/')

    // Check inputs tab
    const inputsOverflow = await page.evaluate(
      () => document.body.scrollWidth <= window.innerWidth
    )
    expect(inputsOverflow).toBe(true)

    // Switch to results tab and check there too
    await page.getByRole('tab', { name: 'Results' }).click()

    // Wait for any results content to render before checking overflow
    const warningsRegion = page.getByRole('region', { name: 'Warnings' })
    await expect(warningsRegion).toBeVisible({ timeout: 15000 })

    const resultsOverflow = await page.evaluate(
      () => document.body.scrollWidth <= window.innerWidth
    )
    expect(resultsOverflow).toBe(true)
  })

  test('charts render on results tab', async ({ page }) => {
    await page.goto('/')

    // Switch to results — click and wait for results panel to appear
    await page.getByRole('tab', { name: 'Results' }).click()

    // Wait for warnings to confirm we're on the results panel and model computed
    const warningsRegion = page.getByRole('region', { name: 'Warnings' })
    await expect(warningsRegion).toBeVisible({ timeout: 15000 })

    // Net Worth chart heading should be present — scroll into view since
    // it may be below the fold on a mobile viewport
    const netWorthHeading = page.getByRole('heading', { name: 'Net Worth Over Time' })
    await netWorthHeading.scrollIntoViewIfNeeded()
    await expect(netWorthHeading).toBeVisible({ timeout: 5000 })
  })
})
