import { test, expect } from '@playwright/test'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'

// The one seeded E2E Clerk test user (see global-setup.ts) is a MEMBER —
// exercises the access-control half of Session 10 for real: a MEMBER
// (cannot review or approve) must not be able to reach /incidents/review.
// The actual Officer/Chief walkthrough (view queue, Mark Reviewed, Approve)
// is NOT covered here: it needs a real OFFICER/CHIEF-authenticated browser
// session, and promoting the one shared seeded identity to a different role
// would risk breaking admin-settings.spec.ts/admin-users.spec.ts's own
// non-Admin assertions if done carelessly — not worth that cross-spec risk
// for a check already covered end to end, department-scoping included,
// against real Postgres through the real, unmocked action code in
// test/db/review-queue.db.test.ts.

test.beforeEach(async ({ page, context }) => {
  await setupClerkTestingToken({ context })
  await page.goto('/sign-in')
  await clerk.signIn({ page, emailAddress: process.env.E2E_CLERK_USER_EMAIL! })
})

test('a MEMBER is redirected away from /incidents/review, not shown a hidden queue', async ({ page }) => {
  await page.goto('/incidents/review')
  await expect(page).toHaveURL(/\/incidents$/)
  await expect(page.getByRole('heading', { name: 'Review queue' })).toHaveCount(0)
})

test('a MEMBER does not see the Review queue link on the incidents list', async ({ page }) => {
  await page.goto('/incidents')
  await expect(page.getByRole('link', { name: 'Review queue' })).toHaveCount(0)
})
