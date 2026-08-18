import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startTestDatabase, stopTestDatabase, expectUniqueConstraintViolation, type TestDatabase } from '@/test/helpers/db'
import { createTestDepartment, createTestUser, createTestIncident } from '@/test/helpers/db-fixtures'

describe('DB constraints', () => {
  let db: TestDatabase

  beforeAll(async () => {
    db = await startTestDatabase()
  })

  afterAll(async () => {
    await stopTestDatabase(db)
  })

  describe('Incident @@unique([departmentId, internalId])', () => {
    it('rejects a duplicate internalId within the same department', async () => {
      const department = await createTestDepartment(db.prisma)
      const user = await createTestUser(db.prisma, department.id)
      await createTestIncident(db.prisma, department.id, user.id, { internalId: 'DUP-001' })

      await expectUniqueConstraintViolation(
        createTestIncident(db.prisma, department.id, user.id, { internalId: 'DUP-001' })
      )
    })

    it('allows the same internalId across different departments', async () => {
      const departmentA = await createTestDepartment(db.prisma)
      const departmentB = await createTestDepartment(db.prisma)
      const userA = await createTestUser(db.prisma, departmentA.id)
      const userB = await createTestUser(db.prisma, departmentB.id)

      await createTestIncident(db.prisma, departmentA.id, userA.id, { internalId: 'SHARED-001' })
      await expect(
        createTestIncident(db.prisma, departmentB.id, userB.id, { internalId: 'SHARED-001' })
      ).resolves.toBeDefined()
    })
  })

  describe('DepartmentIdCounter @@unique([departmentId, year])', () => {
    it('rejects a duplicate (departmentId, year) pair', async () => {
      const department = await createTestDepartment(db.prisma)
      await db.prisma.departmentIdCounter.create({ data: { departmentId: department.id, year: 2026, counter: 1 } })

      await expectUniqueConstraintViolation(
        db.prisma.departmentIdCounter.create({ data: { departmentId: department.id, year: 2026, counter: 1 } })
      )
    })

    it('allows the same year across different departments', async () => {
      const departmentA = await createTestDepartment(db.prisma)
      const departmentB = await createTestDepartment(db.prisma)

      await db.prisma.departmentIdCounter.create({ data: { departmentId: departmentA.id, year: 2026, counter: 1 } })
      await expect(
        db.prisma.departmentIdCounter.create({ data: { departmentId: departmentB.id, year: 2026, counter: 1 } })
      ).resolves.toBeDefined()
    })
  })

  describe('Department.nerisFdId global uniqueness', () => {
    it('rejects a duplicate nerisFdId across departments', async () => {
      await createTestDepartment(db.prisma, { nerisFdId: 'FD-DUP-001' })
      await expectUniqueConstraintViolation(createTestDepartment(db.prisma, { nerisFdId: 'FD-DUP-001' }))
    })

    it('allows multiple departments with a null nerisFdId', async () => {
      await createTestDepartment(db.prisma, { nerisFdId: null })
      await expect(createTestDepartment(db.prisma, { nerisFdId: null })).resolves.toBeDefined()
    })
  })

  describe('User.clerkId global uniqueness', () => {
    it('rejects a duplicate clerkId across departments', async () => {
      const departmentA = await createTestDepartment(db.prisma)
      const departmentB = await createTestDepartment(db.prisma)

      await createTestUser(db.prisma, departmentA.id, { clerkId: 'clerk_dup_001' })
      await expectUniqueConstraintViolation(createTestUser(db.prisma, departmentB.id, { clerkId: 'clerk_dup_001' }))
    })
  })

  describe('Incident.nerisIncidentId global uniqueness', () => {
    it('rejects a duplicate nerisIncidentId across different departments', async () => {
      const departmentA = await createTestDepartment(db.prisma)
      const departmentB = await createTestDepartment(db.prisma)
      const userA = await createTestUser(db.prisma, departmentA.id)
      const userB = await createTestUser(db.prisma, departmentB.id)

      await createTestIncident(db.prisma, departmentA.id, userA.id, { nerisIncidentId: 'NERIS-DUP-001' })
      await expectUniqueConstraintViolation(
        createTestIncident(db.prisma, departmentB.id, userB.id, { nerisIncidentId: 'NERIS-DUP-001' })
      )
    })

    it('allows multiple incidents with a null nerisIncidentId', async () => {
      const department = await createTestDepartment(db.prisma)
      const user = await createTestUser(db.prisma, department.id)

      await createTestIncident(db.prisma, department.id, user.id, { nerisIncidentId: null })
      await expect(
        createTestIncident(db.prisma, department.id, user.id, { nerisIncidentId: null })
      ).resolves.toBeDefined()
    })
  })
})
