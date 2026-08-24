import { test, expect } from '@playwright/test'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'

// The one seeded E2E Clerk test user (see global-setup.ts) is a MEMBER, not
// an Admin — exercises the access-control half of Session 8 for real: a
// non-Admin must not be able to reach /admin/users at all. The invite flow
// itself (pending User row + real Clerk email) is NOT covered here: sending
// a real invitation email requires a real external inbox and a human
// clicking the link, which this suite has no way to automate — and firing a
// genuine Clerk invitation as part of an unattended test run would be a real
// external side effect this session deliberately did not take without the
// user's say-so. That flow is covered instead, end to end except the actual
// email delivery, by test/db/admin-invite.db.test.ts against real Postgres
// with only the Clerk SDK call itself mocked.

test.beforeEach(async ({ page, context }) => {
  await setupClerkTestingToken({ context })
  await page.goto('/sign-in')
  await clerk.signIn({ page, emailAddress: process.env.E2E_CLERK_USER_EMAIL! })
})

test('a non-Admin user is redirected away from /admin/users, not shown a hidden page', async ({ page }) => {
  await page.goto('/admin/users')
  await expect(page).toHaveURL(/\/incidents$/)
  await expect(page.getByRole('heading', { name: 'Users' })).toHaveCount(0)
})

test('a non-Admin user does not see the Users link on the incidents list', async ({ page }) => {
  await page.goto('/incidents')
  await expect(page.getByRole('link', { name: 'Users', exact: true })).toHaveCount(0)
})
