import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startTestDatabase, stopTestDatabase, type TestDatabase } from '@/test/helpers/db'
import { createTestDepartment, createTestUser, createTestIncident } from '@/test/helpers/db-fixtures'
import { getStuckApprovedIncidentIds } from '@/lib/neris/get-stuck-approved-incidents'

describe('getStuckApprovedIncidentIds (Testcontainers Postgres)', () => {
  let db: TestDatabase

  beforeAll(async () => {
    db = await startTestDatabase()
  })

  afterAll(async () => {
    await stopTestDatabase(db)
  })

  it('finds exactly the stuck APPROVED incidents, ignoring every other status, across departments', async () => {
    const departmentA = await createTestDepartment(db.prisma)
    const userA = await createTestUser(db.prisma, departmentA.id)
    const stuckA = await createTestIncident(db.prisma, departmentA.id, userA.id, { reviewStatus: 'APPROVED' })
    await createTestIncident(db.prisma, departmentA.id, userA.id, { reviewStatus: 'OPEN' })
    await createTestIncident(db.prisma, departmentA.id, userA.id, { reviewStatus: 'SUBMITTED' })
    await createTestIncident(db.prisma, departmentA.id, userA.id, { reviewStatus: 'REVIEWED' })
    await createTestIncident(db.prisma, departmentA.id, userA.id, { reviewStatus: 'SENT' })
    await createTestIncident(db.prisma, departmentA.id, userA.id, { reviewStatus: 'ERROR' })
    await createTestIncident(db.prisma, departmentA.id, userA.id, { reviewStatus: 'CONFIRMED' })

    const departmentB = await createTestDepartment(db.prisma)
    const userB = await createTestUser(db.prisma, departmentB.id)
    const stuckB = await createTestIncident(db.prisma, departmentB.id, userB.id, { reviewStatus: 'APPROVED' })

    const stuck = await getStuckApprovedIncidentIds(db.prisma)

    expect(stuck.map(s => s.id).sort()).toEqual([stuckA.id, stuckB.id].sort())
    expect(stuck.find(s => s.id === stuckA.id)?.departmentId).toBe(departmentA.id)
    expect(stuck.find(s => s.id === stuckB.id)?.departmentId).toBe(departmentB.id)
  })
})
