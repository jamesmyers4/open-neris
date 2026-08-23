import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Same factory-mock reasoning as incident-journey.db.test.ts.
vi.mock('@/lib/auth/current-user', () => ({ getCurrentAppUser: vi.fn() }))

import type { User } from '@prisma/client'
import { startTestDatabase, stopTestDatabase, type TestDatabase } from '@/test/helpers/db'
import { createTestDepartment, createTestUser, createTestStation, createTestUnit } from '@/test/helpers/db-fixtures'
import { mockSignedInAs } from '@/test/helpers/auth'

type Actions = {
  updateStation: typeof import('@/app/admin/settings/actions').updateStation
  deleteStation: typeof import('@/app/admin/settings/actions').deleteStation
  updateUnit: typeof import('@/app/admin/settings/actions').updateUnit
  deleteUnit: typeof import('@/app/admin/settings/actions').deleteUnit
}

// Session 6 (FUTURE-PLAN.md): Admin-only Organization/Station/Unit settings
// screen. Real-Postgres equivalent of test/app/admin/settings/actions.test.ts's
// mocked cross-tenant cases — proves an Admin from department A genuinely
// cannot edit or delete department B's Stations/Units, same pattern as
// cross-department-boundary.db.test.ts.
describe('Admin settings — cross-department tenant isolation (Testcontainers Postgres)', () => {
  let db: TestDatabase
  let actions: Actions

  beforeAll(async () => {
    db = await startTestDatabase()

    ;(globalThis as { prisma?: unknown }).prisma = undefined
    process.env.DATABASE_URL = db.container.getConnectionUri()

    const settingsActions = await import('@/app/admin/settings/actions')
    actions = {
      updateStation: settingsActions.updateStation,
      deleteStation: settingsActions.deleteStation,
      updateUnit: settingsActions.updateUnit,
      deleteUnit: settingsActions.deleteUnit
    }
  })

  afterAll(async () => {
    await stopTestDatabase(db)
  })

  beforeEach(() => {
    vi.resetAllMocks()
  })

  async function setupTwoDepartments() {
    const departmentA = await createTestDepartment(db.prisma)
    const stationA = await createTestStation(db.prisma, departmentA.id, { label: 'A Station' })
    const unitA = await createTestUnit(db.prisma, stationA.id, { designation: 'A Engine' })

    const departmentB = await createTestDepartment(db.prisma)
    const adminB = await createTestUser(db.prisma, departmentB.id, { role: 'ADMIN' })

    return { departmentA, stationA, unitA, departmentB, adminB }
  }

  function actAsAdminB(adminB: User) {
    mockSignedInAs(adminB)
  }

  it('rejects updateStation against another department\'s station', async () => {
    const { stationA, adminB } = await setupTwoDepartments()
    actAsAdminB(adminB)
    const fd = new FormData()
    fd.set('label', 'Hijacked label')

    const result = await actions.updateStation(stationA.id, {}, fd)

    expect(result.message).toMatch(/not found/i)
    const untouched = await db.prisma.station.findUniqueOrThrow({ where: { id: stationA.id } })
    expect(untouched.label).toBe('A Station')
  })

  it('rejects deleteStation against another department\'s station', async () => {
    const { stationA, adminB } = await setupTwoDepartments()
    actAsAdminB(adminB)
    const fd = new FormData()
    fd.set('stationId', stationA.id)

    const result = await actions.deleteStation({}, fd)

    expect(result.message).toMatch(/not found/i)
    expect(await db.prisma.station.findUnique({ where: { id: stationA.id } })).not.toBeNull()
  })

  it('rejects updateUnit against another department\'s unit', async () => {
    const { unitA, adminB } = await setupTwoDepartments()
    actAsAdminB(adminB)
    const fd = new FormData()
    fd.set('designation', 'Hijacked designation')

    const result = await actions.updateUnit(unitA.id, {}, fd)

    expect(result.message).toMatch(/not found/i)
    const untouched = await db.prisma.unit.findUniqueOrThrow({ where: { id: unitA.id } })
    expect(untouched.designation).toBe('A Engine')
  })

  it('rejects deleteUnit against another department\'s unit', async () => {
    const { unitA, adminB } = await setupTwoDepartments()
    actAsAdminB(adminB)
    const fd = new FormData()
    fd.set('unitId', unitA.id)

    const result = await actions.deleteUnit({}, fd)

    expect(result.message).toMatch(/not found/i)
    expect(await db.prisma.unit.findUnique({ where: { id: unitA.id } })).not.toBeNull()
  })
})
