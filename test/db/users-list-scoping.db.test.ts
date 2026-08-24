import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startTestDatabase, stopTestDatabase, type TestDatabase } from '@/test/helpers/db'
import { createTestDepartment, createTestUser } from '@/test/helpers/db-fixtures'
import { getUsersInScope } from '@/lib/organization/get-users-in-scope'

// Session 9 (FUTURE-PLAN.md): the Users admin page's list-scoping logic,
// run against real Postgres — a leaf-department Admin's list never includes
// another department's users; a district Admin's does include descendants.
describe('getUsersInScope (Testcontainers Postgres)', () => {
  let db: TestDatabase

  beforeAll(async () => {
    db = await startTestDatabase()
  })

  afterAll(async () => {
    await stopTestDatabase(db)
  })

  it('a leaf department\'s list never includes another department\'s users', async () => {
    const departmentA = await createTestDepartment(db.prisma)
    const userA = await createTestUser(db.prisma, departmentA.id)

    const departmentB = await createTestDepartment(db.prisma)
    await createTestUser(db.prisma, departmentB.id)

    const result = await getUsersInScope(db.prisma, departmentA.id)

    expect(result.users.map(u => u.id)).toEqual([userA.id])
    expect(result.departments.map(d => d.id)).toEqual([departmentA.id])
  })

  it('a district Admin\'s list includes users from every descendant department', async () => {
    const district = await createTestDepartment(db.prisma, { name: 'District HQ' })
    const districtUser = await createTestUser(db.prisma, district.id)

    const child = await createTestDepartment(db.prisma, { name: 'Child FD', parentDepartmentId: district.id })
    const childUser = await createTestUser(db.prisma, child.id)

    const grandchild = await createTestDepartment(db.prisma, { name: 'Grandchild FD', parentDepartmentId: child.id })
    const grandchildUser = await createTestUser(db.prisma, grandchild.id)

    const unrelatedDepartment = await createTestDepartment(db.prisma)
    await createTestUser(db.prisma, unrelatedDepartment.id)

    const result = await getUsersInScope(db.prisma, district.id)

    expect(result.users.map(u => u.id).sort()).toEqual([districtUser.id, childUser.id, grandchildUser.id].sort())
    expect(result.departments.map(d => d.id).sort()).toEqual([district.id, child.id, grandchild.id].sort())
  })
})
