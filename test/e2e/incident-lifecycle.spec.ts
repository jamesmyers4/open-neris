import { test, expect, type Page } from '@playwright/test'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'

// Real browser-driven equivalent of test/db/incident-journey.db.test.ts's
// happy-path journey — same field values, same sequence, driven through the
// actual forms instead of calling the server actions directly. Reuses that
// file's journey semantics deliberately (see TEST-PLAN.md's Phase 8) rather
// than re-deriving what "happy path" means from scratch.

async function fillDateTime(page: Page, labelText: string, date: string, hour: string, minute: string): Promise<void> {
  const field = page.locator('label', { hasText: labelText })
  await field.locator('input[type="date"]').fill(date)
  await field.locator('select').nth(0).selectOption(hour)
  await field.locator('select').nth(1).selectOption(minute)
}

test.beforeEach(async ({ page, context }) => {
  await setupClerkTestingToken({ context })
  await page.goto('/sign-in')
  // Ticket-based sign-in: @clerk/testing looks the user up and mints a
  // sign-in token via the Backend API, then applies it client-side — no
  // password round-trip through Clerk's hosted FAPI, which is what the
  // password-strategy form triggered a session-refresh redirect loop on.
  await clerk.signIn({ page, emailAddress: process.env.E2E_CLERK_USER_EMAIL! })
})

test('creates, fills, gates, and submits a FIRE incident end to end through real forms', async ({ page }) => {
  await page.goto('/incidents/new')

  await page.locator('select').nth(0).selectOption({ label: 'Fire' })
  await page.locator('select').nth(1).selectOption({ label: 'Structure Fire' })
  await fillDateTime(page, 'Alarm time', '2026-02-01', '12', '00')
  await page.getByRole('button', { name: 'Create incident' }).click()

  // Wait for the incident detail page's own layout (the tab nav), not just a
  // URL regex — /incidents/new itself matches a naive /incidents/[^/]+$
  // pattern, so a URL-only wait can resolve before the redirect even fires.
  await expect(page.getByRole('link', { name: 'Dispatch' })).toBeVisible()
  await expect(page).toHaveURL(/\/incidents\/(?!new$)[^/]+$/)
  const incidentUrl = page.url()

  await page.getByRole('link', { name: 'Dispatch' }).click()
  await fillDateTime(page, 'Call received at dispatch center', '2026-02-01', '12', '00')
  await fillDateTime(page, 'Call answered', '2026-02-01', '12', '01')
  await fillDateTime(page, 'Call created', '2026-02-01', '12', '02')
  await fillDateTime(page, 'Incident clear', '2026-02-01', '13', '00')
  await page.getByRole('button', { name: 'Save dispatch' }).click()
  await expect(page.getByText('Saved.')).toBeVisible()

  await page.getByRole('link', { name: 'Location' }).click()
  await page.getByLabel('Street address').fill('123 Main St')
  await page.getByLabel('State').fill('NY')
  await page.getByRole('button', { name: 'Save location' }).click()
  await expect(page.getByText('Saved.')).toBeVisible()

  await page.getByRole('link', { name: 'Narrative' }).click()
  await page.getByLabel('Impediment').fill('None')
  await page.getByLabel('Outcome').fill('Fire extinguished, no injuries')
  await page.getByRole('button', { name: 'Save narrative' }).click()
  await expect(page.getByText('Saved.')).toBeVisible()

  await page.getByRole('link', { name: 'Actions Taken' }).click()
  await page.getByLabel('Reason').selectOption('CANCELLED')
  await page.getByRole('button', { name: 'Save no-action reason' }).click()
  await expect(page.getByText('Saved.')).toBeVisible()

  // dispatch_unit_response is neris_core_app=TRUE, unconditional (Session 1's
  // finding) — every incident needs at least one responding unit, regardless
  // of type. Wired into the completeness gate in Session 2. Session 5 replaced
  // the tab's freeform unit-id text entry with a real Unit picker plus an
  // inline quick-add — this test department has zero pre-existing Units, so
  // the quick-add form is what's exercised here, matching real first-time use.
  await page.getByRole('link', { name: 'Responding Units' }).click()
  await page.getByLabel('Unit designation').fill('ENGINE_1')
  await page.getByRole('button', { name: 'Create unit' }).click()
  await expect(page.locator('select[name="unitIdLinked"]')).toHaveValue(/.+/)
  await page.getByRole('button', { name: 'Add unit' }).click()

  // Core + unit-response fields are complete, but this is a FIRE-primary
  // incident — Fire module details are still missing, so the Overview tab
  // must not offer a Submit button at all (the UI's own gate, not a
  // rejected click).
  await page.goto(incidentUrl)
  await expect(page.getByText('Fire: investigation need')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Submit for review' })).toHaveCount(0)

  await page.getByRole('link', { name: 'Fire' }).click()
  await page.getByLabel('Investigation need').selectOption('NO')
  await page.getByRole('button', { name: 'Save fire details' }).click()

  await page.goto(incidentUrl)
  await page.getByRole('button', { name: 'Submit for review' }).click()
  await expect(page.getByText(/status: SUBMITTED/)).toBeVisible()
})

// This test department already has the "ENGINE_1" Unit created by the
// quick-add step in the test above (tests in this file run serially against
// one shared department — see global-setup.ts) — exercises Session 5's other
// real-world case: a department that has already set units up, where the
// picker should list and select an existing Unit with no quick-add needed.
test('the Unit picker lists and selects an already-existing unit with no quick-add needed', async ({ page }) => {
  await page.goto('/incidents/new')
  await page.locator('select').nth(0).selectOption({ label: 'Medical' })
  await fillDateTime(page, 'Alarm time', '2026-02-01', '12', '00')
  await page.getByRole('button', { name: 'Create incident' }).click()
  await expect(page.getByRole('link', { name: 'Dispatch' })).toBeVisible()

  await page.getByRole('link', { name: 'Responding Units' }).click()
  const unitSelect = page.locator('select[name="unitIdLinked"]')
  await expect(unitSelect.locator('option', { hasText: 'ENGINE_1' })).toHaveCount(1)
  // The quick-add form itself must not be forced open when units already
  // exist — only its toggle link should be showing.
  await expect(page.getByRole('button', { name: 'Create unit' })).toHaveCount(0)

  await unitSelect.selectOption({ index: 1 })
  await page.getByRole('button', { name: 'Add unit' }).click()

  await expect(page.getByText('ENGINE_1', { exact: false })).toBeVisible()
})
