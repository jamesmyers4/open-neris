import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Same factory-mock reasoning as incident-journey.db.test.ts.
vi.mock('@/lib/auth/current-user', () => ({ getCurrentAppUser: vi.fn() }))

import { startTestDatabase, stopTestDatabase, type TestDatabase } from '@/test/helpers/db'
import { createTestDepartment, createTestUser, createTestIncident } from '@/test/helpers/db-fixtures'
import { mockSignedInAs } from '@/test/helpers/auth'

type Actions = {
  kickbackIncident: typeof import('@/app/incidents/[id]/actions').kickbackIncident
}
type GetIncidentDetail = typeof import('@/lib/incidents/get-incident-detail').getIncidentDetail

describe('Kickback-with-notes (Testcontainers Postgres)', () => {
  let db: TestDatabase
  let actions: Actions
  let getIncidentDetail: GetIncidentDetail

  beforeAll(async () => {
    db = await startTestDatabase()

    ;(globalThis as { prisma?: unknown }).prisma = undefined
    process.env.DATABASE_URL = db.container.getConnectionUri()

    const [idActions, incidentDetail] = await Promise.all([
      import('@/app/incidents/[id]/actions'),
      import('@/lib/incidents/get-incident-detail')
    ])
    actions = { kickbackIncident: idActions.kickbackIncident }
    getIncidentDetail = incidentDetail.getIncidentDetail
  })

  afterAll(async () => {
    await stopTestDatabase(db)
  })

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('writes a real ReviewEvent audit row and the note round-trips to the submitter-facing getIncidentDetail view', async () => {
    const department = await createTestDepartment(db.prisma)
    const submitter = await createTestUser(db.prisma, department.id, { role: 'MEMBER', name: 'Original Submitter' })
    const officer = await createTestUser(db.prisma, department.id, { role: 'OFFICER', name: 'Reviewing Officer' })
    const incident = await createTestIncident(db.prisma, department.id, submitter.id, { reviewStatus: 'REVIEWED' })
    mockSignedInAs(officer)

    const fd = new FormData()
    fd.set('note', 'Narrative is missing key details — please add before resubmitting.')
    const result = await actions.kickbackIncident(incident.id, {}, fd)
    expect(result.message).toBe('Incident kicked back to Open.')

    const auditRow = await db.prisma.reviewEvent.findFirstOrThrow({ where: { incidentId: incident.id } })
    expect(auditRow).toMatchObject({
      fromStatus: 'REVIEWED',
      toStatus: 'OPEN',
      actorId: officer.id,
      note: 'Narrative is missing key details — please add before resubmitting.'
    })

    // The submitter-facing view is exactly getIncidentDetail, scoped to the
    // submitter's own department — this is what app/incidents/[id]/page.tsx
    // reads to render the kickback banner.
    const submitterView = await getIncidentDetail(incident.id, department.id)
    expect(submitterView?.reviewStatus).toBe('OPEN')
    expect(submitterView?.reviewEvents[0]).toMatchObject({
      toStatus: 'OPEN',
      note: 'Narrative is missing key details — please add before resubmitting.'
    })
    expect(submitterView?.reviewEvents[0].actor.name).toBe('Reviewing Officer')
  })

  it('kicks back an APPROVED incident to OPEN too, with its own audit row', async () => {
    const department = await createTestDepartment(db.prisma)
    const chief = await createTestUser(db.prisma, department.id, { role: 'CHIEF' })
    const incident = await createTestIncident(db.prisma, department.id, chief.id, { reviewStatus: 'APPROVED' })
    mockSignedInAs(chief)

    const fd = new FormData()
    fd.set('note', 'Wrong incident type selected.')
    await actions.kickbackIncident(incident.id, {}, fd)

    const updated = await db.prisma.incident.findUniqueOrThrow({ where: { id: incident.id } })
    expect(updated.reviewStatus).toBe('OPEN')

    const auditRow = await db.prisma.reviewEvent.findFirstOrThrow({ where: { incidentId: incident.id } })
    expect(auditRow).toMatchObject({ fromStatus: 'APPROVED', toStatus: 'OPEN', note: 'Wrong incident type selected.' })
  })

  it('rejects kicking back another department\'s incident', async () => {
    const departmentA = await createTestDepartment(db.prisma)
    const userA = await createTestUser(db.prisma, departmentA.id)
    const incidentA = await createTestIncident(db.prisma, departmentA.id, userA.id, { reviewStatus: 'REVIEWED' })

    const departmentB = await createTestDepartment(db.prisma)
    const officerB = await createTestUser(db.prisma, departmentB.id, { role: 'OFFICER' })
    mockSignedInAs(officerB)

    const fd = new FormData()
    fd.set('note', 'Should never land')
    const result = await actions.kickbackIncident(incidentA.id, {}, fd)

    expect(result.message).toMatch(/not found/i)
    const untouched = await db.prisma.incident.findUniqueOrThrow({ where: { id: incidentA.id } })
    expect(untouched.reviewStatus).toBe('REVIEWED')
    expect(await db.prisma.reviewEvent.count({ where: { incidentId: incidentA.id } })).toBe(0)
  })

  it('rejects an empty note at the server, not just relying on client-side validation', async () => {
    const department = await createTestDepartment(db.prisma)
    const officer = await createTestUser(db.prisma, department.id, { role: 'OFFICER' })
    const incident = await createTestIncident(db.prisma, department.id, officer.id, { reviewStatus: 'REVIEWED' })
    mockSignedInAs(officer)

    const fd = new FormData()
    fd.set('note', '')
    const result = await actions.kickbackIncident(incident.id, {}, fd)

    expect(result.errors?.note).toBeDefined()
    const untouched = await db.prisma.incident.findUniqueOrThrow({ where: { id: incident.id } })
    expect(untouched.reviewStatus).toBe('REVIEWED')
  })
})
