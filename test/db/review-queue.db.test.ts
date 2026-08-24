import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Same factory-mock reasoning as incident-journey.db.test.ts.
vi.mock('@/lib/auth/current-user', () => ({ getCurrentAppUser: vi.fn() }))

import { startTestDatabase, stopTestDatabase, type TestDatabase } from '@/test/helpers/db'
import { createTestDepartment, createTestUser, createTestIncident } from '@/test/helpers/db-fixtures'
import { mockSignedInAs } from '@/test/helpers/auth'
import { getReviewQueue } from '@/lib/incidents/get-review-queue'

type Actions = {
  markReviewed: typeof import('@/app/incidents/[id]/actions').markReviewed
  approveIncident: typeof import('@/app/incidents/[id]/actions').approveIncident
}

describe('Review queue (Testcontainers Postgres)', () => {
  let db: TestDatabase
  let actions: Actions

  beforeAll(async () => {
    db = await startTestDatabase()

    ;(globalThis as { prisma?: unknown }).prisma = undefined
    process.env.DATABASE_URL = db.container.getConnectionUri()

    const idActions = await import('@/app/incidents/[id]/actions')
    actions = { markReviewed: idActions.markReviewed, approveIncident: idActions.approveIncident }
  })

  afterAll(async () => {
    await stopTestDatabase(db)
  })

  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('department-scoping', () => {
    it('an Officer never sees another department\'s Submitted incidents', async () => {
      const departmentA = await createTestDepartment(db.prisma)
      const userA = await createTestUser(db.prisma, departmentA.id)
      const incidentA = await createTestIncident(db.prisma, departmentA.id, userA.id, { reviewStatus: 'SUBMITTED' })

      const departmentB = await createTestDepartment(db.prisma)
      const userB = await createTestUser(db.prisma, departmentB.id)
      await createTestIncident(db.prisma, departmentB.id, userB.id, { reviewStatus: 'SUBMITTED' })

      const queueForA = await getReviewQueue(db.prisma, departmentA.id)

      expect(queueForA.map(i => i.id)).toEqual([incidentA.id])
    })

    it('only includes SUBMITTED and REVIEWED incidents, not OPEN or APPROVED ones from the same department', async () => {
      const department = await createTestDepartment(db.prisma)
      const user = await createTestUser(db.prisma, department.id)
      const open = await createTestIncident(db.prisma, department.id, user.id, { reviewStatus: 'OPEN' })
      const submitted = await createTestIncident(db.prisma, department.id, user.id, { reviewStatus: 'SUBMITTED' })
      const reviewed = await createTestIncident(db.prisma, department.id, user.id, { reviewStatus: 'REVIEWED' })
      const approved = await createTestIncident(db.prisma, department.id, user.id, { reviewStatus: 'APPROVED' })
      void open
      void approved

      const queue = await getReviewQueue(db.prisma, department.id)

      expect(queue.map(i => i.id).sort()).toEqual([submitted.id, reviewed.id].sort())
    })
  })

  describe('solo-department collapse behavior, unaffected by the new queue', () => {
    it('a single ADMIN user can carry a Submitted incident through Reviewed and Approved themselves', async () => {
      const department = await createTestDepartment(db.prisma)
      const soloAdmin = await createTestUser(db.prisma, department.id, { role: 'ADMIN' })
      const incident = await createTestIncident(db.prisma, department.id, soloAdmin.id, { reviewStatus: 'SUBMITTED' })
      mockSignedInAs(soloAdmin)

      await actions.markReviewed(incident.id)
      const afterReview = await db.prisma.incident.findUniqueOrThrow({ where: { id: incident.id } })
      expect(afterReview.reviewStatus).toBe('REVIEWED')
      expect(afterReview.reviewedById).toBe(soloAdmin.id)

      await actions.approveIncident(incident.id)
      const afterApproval = await db.prisma.incident.findUniqueOrThrow({ where: { id: incident.id } })
      expect(afterApproval.reviewStatus).toBe('APPROVED')
      expect(afterApproval.approvedById).toBe(soloAdmin.id)

      const events = await db.prisma.reviewEvent.findMany({ where: { incidentId: incident.id }, orderBy: { createdAt: 'asc' } })
      expect(events.map(e => `${e.fromStatus}->${e.toStatus}`)).toEqual(['SUBMITTED->REVIEWED', 'REVIEWED->APPROVED'])
      expect(events.every(e => e.actorId === soloAdmin.id)).toBe(true)
    })
  })
})
