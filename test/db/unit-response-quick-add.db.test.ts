import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Factory form deliberately, matching incident-journey.db.test.ts's own
// reasoning: avoids evaluating the real lib/prisma.ts singleton before this
// file points DATABASE_URL at the test container.
vi.mock('@/lib/auth/current-user', () => ({ getCurrentAppUser: vi.fn() }))

import { startTestDatabase, stopTestDatabase, type TestDatabase } from '@/test/helpers/db'
import { setupCallerContext, createAndGetIncidentId, typesFormData } from '@/test/helpers/journey'
import { createTestDepartment, createTestUser } from '@/test/helpers/db-fixtures'
import { mockSignedInAs } from '@/test/helpers/auth'

type Actions = {
  createIncident: typeof import('@/app/incidents/actions').createIncident
  createUnitResponse: typeof import('@/app/incidents/[id]/unit-response/actions').createUnitResponse
  quickAddUnit: typeof import('@/app/incidents/[id]/unit-response/actions').quickAddUnit
}

// Session 5 (FUTURE-PLAN.md): the Unit Response tab's real-Unit FK picker,
// with an inline quick-add for a department that hasn't set any Units up
// yet. "Never hard-block incident entry on Unit setup being complete" is a
// hard requirement of that session — this test proves the zero-units case
// genuinely reaches a saved unit response end to end, not just that the
// quick-add server action alone works in isolation (already covered by the
// mocked-Prisma fast suite).
describe('Unit Response quick-add, zero pre-existing units (Testcontainers Postgres)', () => {
  let db: TestDatabase
  let actions: Actions

  beforeAll(async () => {
    db = await startTestDatabase()

    ;(globalThis as { prisma?: unknown }).prisma = undefined
    process.env.DATABASE_URL = db.container.getConnectionUri()

    const [incidentActions, unitResponseActions] = await Promise.all([
      import('@/app/incidents/actions'),
      import('@/app/incidents/[id]/unit-response/actions')
    ])

    actions = {
      createIncident: incidentActions.createIncident,
      createUnitResponse: unitResponseActions.createUnitResponse,
      quickAddUnit: unitResponseActions.quickAddUnit
    }
  })

  afterAll(async () => {
    await stopTestDatabase(db)
  })

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('quick-adds a Station and Unit for a department with none, then saves a unit response referencing the new unit', async () => {
    const { department } = await setupNewDepartmentWithNoUnits(db.prisma)

    expect(await db.prisma.station.count({ where: { departmentId: department.id } })).toBe(0)
    expect(await db.prisma.unit.count({ where: { station: { departmentId: department.id } } })).toBe(0)

    const incidentId = await createAndGetIncidentId(actions.createIncident, typesFormData('FIRE'))

    const quickAddFd = new FormData()
    quickAddFd.set('designation', 'ENGINE 1')
    quickAddFd.set('capabilityType', 'ENGINE_STRUCT')
    const quickAddResult = await actions.quickAddUnit(incidentId, {}, quickAddFd)

    expect(quickAddResult.unit).toBeDefined()
    const newUnitId = quickAddResult.unit!.id

    const createdStation = await db.prisma.station.findFirstOrThrow({ where: { departmentId: department.id } })
    const createdUnit = await db.prisma.unit.findUniqueOrThrow({ where: { id: newUnitId } })
    expect(createdUnit.stationId).toBe(createdStation.id)
    expect(createdUnit.designation).toBe('ENGINE 1')

    const unitResponseFd = new FormData()
    unitResponseFd.set('unitIdLinked', newUnitId)
    await actions.createUnitResponse(incidentId, {}, unitResponseFd)

    const savedResponse = await db.prisma.incidentUnitResponse.findFirstOrThrow({ where: { incidentId } })
    expect(savedResponse.unitIdLinked).toBe(newUnitId)
  })

  it('rejects a unitIdLinked belonging to a different department\'s Unit (cross-tenant guard)', async () => {
    const { unit: otherDepartmentsUnit } = await setupCallerContext(db.prisma)
    await setupNewDepartmentWithNoUnits(db.prisma)
    const incidentId = await createAndGetIncidentId(actions.createIncident, typesFormData('FIRE'))

    const unitResponseFd = new FormData()
    unitResponseFd.set('unitIdLinked', otherDepartmentsUnit.id)
    const result = await actions.createUnitResponse(incidentId, {}, unitResponseFd)

    expect(result.errors?.unitIdLinked).toBeDefined()
    expect(await db.prisma.incidentUnitResponse.count({ where: { incidentId } })).toBe(0)
  })

  async function setupNewDepartmentWithNoUnits(prisma: typeof db.prisma) {
    const department = await createTestDepartment(prisma)
    const user = await createTestUser(prisma, department.id)
    mockSignedInAs({ id: user.id, departmentId: department.id, clerkId: user.clerkId, name: user.name, email: user.email, role: user.role })
    return { department, user }
  }
})
