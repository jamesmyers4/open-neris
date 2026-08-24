import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Same factory-mock reasoning as incident-journey.db.test.ts.
vi.mock('@/lib/auth/current-user', () => ({ getCurrentAppUser: vi.fn() }))

// The Resend network boundary is mocked (no real email sent in an automated
// test run) — everything else in this file (Prisma, the actions, the notify
// logic) is real, against a real Postgres Testcontainers instance.
const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn().mockResolvedValue({}) }))
vi.mock('resend', () => {
  class FakeResend {
    emails = { send: mockSend }
  }
  return { Resend: FakeResend }
})

import { startTestDatabase, stopTestDatabase, type TestDatabase } from '@/test/helpers/db'
import { createTestDepartment, createTestUser, createTestIncident, createTestStation, createTestUnit } from '@/test/helpers/db-fixtures'
import { mockSignedInAs } from '@/test/helpers/auth'

type Actions = {
  submitIncident: typeof import('@/app/incidents/[id]/actions').submitIncident
  markReviewed: typeof import('@/app/incidents/[id]/actions').markReviewed
  kickbackIncident: typeof import('@/app/incidents/[id]/actions').kickbackIncident
}

describe('Notifications on status transitions (Testcontainers Postgres)', () => {
  let db: TestDatabase
  let actions: Actions

  beforeAll(async () => {
    db = await startTestDatabase()

    ;(globalThis as { prisma?: unknown }).prisma = undefined
    process.env.DATABASE_URL = db.container.getConnectionUri()

    const idActions = await import('@/app/incidents/[id]/actions')
    actions = {
      submitIncident: idActions.submitIncident,
      markReviewed: idActions.markReviewed,
      kickbackIncident: idActions.kickbackIncident
    }
  })

  afterAll(async () => {
    await stopTestDatabase(db)
  })

  beforeEach(() => {
    vi.resetAllMocks()
    mockSend.mockResolvedValue({})
  })

  it('a genuinely solo department produces zero Notification rows on Submit — not just skipped email', async () => {
    const department = await createTestDepartment(db.prisma)
    const soloAdmin = await createTestUser(db.prisma, department.id, { role: 'ADMIN' })
    const incident = await createTestIncident(db.prisma, department.id, soloAdmin.id, { reviewStatus: 'REVIEWED' })
    mockSignedInAs(soloAdmin)

    const fd = new FormData()
    fd.set('note', 'Kicking back my own incident to fix something')
    await actions.kickbackIncident(incident.id, {}, fd)

    expect(await db.prisma.notification.count()).toBe(0)
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('a multi-user department creates real Notification rows and attempts email for each eligible reviewer on Submit, excluding the submitter', async () => {
    const department = await createTestDepartment(db.prisma)
    const member = await createTestUser(db.prisma, department.id, { role: 'MEMBER', name: 'Submitting Member' })
    const officer = await createTestUser(db.prisma, department.id, { role: 'OFFICER', email: 'officer@example.com' })
    const chief = await createTestUser(db.prisma, department.id, { role: 'CHIEF', email: 'chief@example.com' })
    const incident = await createTestIncident(db.prisma, department.id, member.id, {
      reviewStatus: 'OPEN',
      timeIncidentClear: new Date('2026-01-01T01:00:00Z'),
      narrativeImpediment: 'None',
      narrativeOutcome: 'Resolved',
      incidentNoActionReason: 'CANCELLED'
    })
    await db.prisma.incidentLocation.create({ data: { incidentId: incident.id, streetAddressComplete: '123 Main St', state: 'NY' } })
    const station = await createTestStation(db.prisma, department.id)
    const unit = await createTestUnit(db.prisma, station.id)
    await db.prisma.incidentUnitResponse.create({ data: { incidentId: incident.id, unitIdLinked: unit.id } })
    mockSignedInAs(member)

    await actions.submitIncident(incident.id)

    const updated = await db.prisma.incident.findUniqueOrThrow({ where: { id: incident.id } })
    expect(updated.reviewStatus).toBe('SUBMITTED')

    const notifications = await db.prisma.notification.findMany({ where: { incidentId: incident.id } })
    expect(notifications.map(n => n.userId).sort()).toEqual([officer.id, chief.id].sort())
    expect(notifications.every(n => n.type === 'SUBMITTED_NEEDS_REVIEW' && n.read === false)).toBe(true)
    expect(mockSend).toHaveBeenCalledTimes(2)
  })

  it('kickback notifies the original submitter (and only them) in a multi-user department', async () => {
    const department = await createTestDepartment(db.prisma)
    const member = await createTestUser(db.prisma, department.id, { role: 'MEMBER', email: 'member@example.com' })
    const officer = await createTestUser(db.prisma, department.id, { role: 'OFFICER' })
    const incident = await createTestIncident(db.prisma, department.id, member.id, { reviewStatus: 'REVIEWED' })
    mockSignedInAs(officer)

    const fd = new FormData()
    fd.set('note', 'Needs a correction before it can be approved')
    await actions.kickbackIncident(incident.id, {}, fd)

    const notifications = await db.prisma.notification.findMany({ where: { incidentId: incident.id } })
    expect(notifications).toHaveLength(1)
    expect(notifications[0]).toMatchObject({ userId: member.id, type: 'KICKED_BACK', read: false })
    expect(mockSend).toHaveBeenCalledTimes(1)
  })
})
