import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Same factory-mock reasoning as incident-journey.db.test.ts.
vi.mock('@/lib/auth/current-user', () => ({ getCurrentAppUser: vi.fn() }))

import { startTestDatabase, stopTestDatabase, type TestDatabase } from '@/test/helpers/db'
import { createTestDepartment, createTestUser } from '@/test/helpers/db-fixtures'
import { mockSignedInAs } from '@/test/helpers/auth'

type Actions = {
  updateDepartment: typeof import('@/app/admin/settings/actions').updateDepartment
  createStation: typeof import('@/app/admin/settings/actions').createStation
  createUnit: typeof import('@/app/admin/settings/actions').createUnit
}

// Session 6 (FUTURE-PLAN.md): the Admin CRUD happy path — editing department
// fields, adding a Station, adding a Unit under it — run against real
// Postgres through the real, unmocked server-action code. Only auth is
// mocked (this repo's standard *.db.test.ts convention — see
// cross-department-boundary.db.test.ts). A true rendered-browser
// walkthrough of this screen isn't covered by the E2E suite: the project's
// one seeded Clerk test identity is a MEMBER, not an Admin (see
// test/e2e/admin-settings.spec.ts's own note on this).
describe('Admin settings — CRUD happy path (Testcontainers Postgres)', () => {
  let db: TestDatabase
  let actions: Actions

  beforeAll(async () => {
    db = await startTestDatabase()

    ;(globalThis as { prisma?: unknown }).prisma = undefined
    process.env.DATABASE_URL = db.container.getConnectionUri()

    const settingsActions = await import('@/app/admin/settings/actions')
    actions = {
      updateDepartment: settingsActions.updateDepartment,
      createStation: settingsActions.createStation,
      createUnit: settingsActions.createUnit
    }
  })

  afterAll(async () => {
    await stopTestDatabase(db)
  })

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('an Admin edits department fields, adds a Station, then adds a Unit under it', async () => {
    const department = await createTestDepartment(db.prisma)
    const admin = await createTestUser(db.prisma, department.id, { role: 'ADMIN' })
    mockSignedInAs(admin)

    const departmentFd = new FormData()
    departmentFd.set('name', 'Fairfax Fire Rescue')
    departmentFd.set('city', 'Fairfax')
    departmentFd.set('state', 'VA')
    departmentFd.set('fdType', 'COMBINATION')
    departmentFd.set('staffActiveFfCareerFt', '120')
    departmentFd.set('internalIdMode', 'SEQUENTIAL')

    const departmentResult = await actions.updateDepartment({}, departmentFd)
    expect(departmentResult.message).toBe('Saved.')

    const savedDepartment = await db.prisma.department.findUniqueOrThrow({ where: { id: department.id } })
    expect(savedDepartment).toMatchObject({
      name: 'Fairfax Fire Rescue',
      city: 'Fairfax',
      state: 'VA',
      fdType: 'COMBINATION',
      staffActiveFfCareerFt: 120,
      internalIdMode: 'SEQUENTIAL'
    })

    const stationFd = new FormData()
    stationFd.set('label', 'Station 7')
    stationFd.set('address', '456 Main St')

    const stationResult = await actions.createStation({}, stationFd)
    expect(stationResult.message).toBe('Station added.')

    const savedStation = await db.prisma.station.findFirstOrThrow({ where: { departmentId: department.id } })
    expect(savedStation).toMatchObject({ label: 'Station 7', address: '456 Main St' })

    const unitFd = new FormData()
    unitFd.set('designation', 'ENGINE 7')
    unitFd.set('capabilityType', 'ENGINE_STRUCT')

    const unitResult = await actions.createUnit(savedStation.id, {}, unitFd)
    expect(unitResult.message).toBe('Unit added.')

    const savedUnit = await db.prisma.unit.findFirstOrThrow({ where: { stationId: savedStation.id } })
    expect(savedUnit).toMatchObject({ designation: 'ENGINE 7', capabilityType: 'ENGINE_STRUCT' })
  })
})
