import { test, expect } from '@playwright/test'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'

// The one seeded E2E Clerk test user (see global-setup.ts) is a MEMBER, not
// an Admin — exercises Session 6's access-control requirement for real: a
// non-Admin signed-in user must not be able to reach /admin/settings at all.
// The Admin CRUD happy path itself (edit department fields, add a Station,
// add a Unit) is covered against real Postgres through the real server
// actions in test/db/admin-settings-happy-path.db.test.ts — this suite has
// only one real Clerk identity configured, and it is not an Admin, so a true
// rendered-browser walkthrough of the Admin screen isn't available here.

test.beforeEach(async ({ page, context }) => {
  await setupClerkTestingToken({ context })
  await page.goto('/sign-in')
  await clerk.signIn({ page, emailAddress: process.env.E2E_CLERK_USER_EMAIL! })
})

test('a non-Admin user is redirected away from /admin/settings, not shown a hidden page', async ({ page }) => {
  await page.goto('/admin/settings')
  await expect(page).toHaveURL(/\/incidents$/)
  await expect(page.getByRole('heading', { name: 'Organization settings' })).toHaveCount(0)
})

test('a non-Admin user does not see the Organization settings link on the incidents list', async ({ page }) => {
  await page.goto('/incidents')
  await expect(page.getByRole('link', { name: 'Organization settings' })).toHaveCount(0)
})
