import { test, expect } from '@playwright/test'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'

// The one seeded E2E Clerk test user (see global-setup.ts) already has an
// app User row from the moment the suite starts — it can only ever exercise
// the "already onboarded" guards on / and /onboarding, not a genuine
// first-time signup (which needs a real, not-yet-onboarded Clerk identity).
// The three signup branches themselves (CREATED/CONTACT_ADMIN/CLAIMED, plus
// the concurrent-claim race) are verified against real Postgres through the
// real, unmocked resolveDepartmentSignup logic in
// test/db/onboarding-signup.db.test.ts — this suite only has one real Clerk
// identity, and mutating its shared department mid-suite to force a
// first-time state would corrupt the other specs that depend on that same
// seeded department already having its Station/Unit fixtures.

test.beforeEach(async ({ page, context }) => {
  await setupClerkTestingToken({ context })
  await page.goto('/sign-in')
  await clerk.signIn({ page, emailAddress: process.env.E2E_CLERK_USER_EMAIL! })
})

test('an already-onboarded user visiting / is sent straight to /incidents, not the onboarding form', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/incidents$/)
})

test('an already-onboarded user visiting /onboarding directly is redirected to /incidents', async ({ page }) => {
  await page.goto('/onboarding')
  await expect(page).toHaveURL(/\/incidents$/)
  await expect(page.getByRole('heading', { name: 'Welcome' })).toHaveCount(0)
})
