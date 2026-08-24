import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Deliberately NOT mocking @/lib/auth/current-user — its real implementation
// (including the Session 9 DEACTIVATED lockout) is exactly what the last
// test in this file proves, end to end against real Postgres.
const { mockAuth } = vi.hoisted(() => ({ mockAuth: vi.fn() }))
vi.mock('@clerk/nextjs/server', () => ({ auth: mockAuth, currentUser: vi.fn() }))

import type { User } from '@prisma/client'
import { startTestDatabase, stopTestDatabase, type TestDatabase } from '@/test/helpers/db'
import { createTestDepartment, createTestUser } from '@/test/helpers/db-fixtures'

function actAs(user: User): void {
  mockAuth.mockResolvedValue({ userId: user.clerkId })
}

type Actions = {
  updateUserRole: typeof import('@/app/admin/users/actions').updateUserRole
  deactivateUser: typeof import('@/app/admin/users/actions').deactivateUser
}

describe('Users admin actions — role change and deactivate (Testcontainers Postgres)', () => {
  let db: TestDatabase
  let actions: Actions

  beforeAll(async () => {
    db = await startTestDatabase()

    ;(globalThis as { prisma?: unknown }).prisma = undefined
    process.env.DATABASE_URL = db.container.getConnectionUri()

    const usersActions = await import('@/app/admin/users/actions')
    actions = { updateUserRole: usersActions.updateUserRole, deactivateUser: usersActions.deactivateUser }
  })

  afterAll(async () => {
    await stopTestDatabase(db)
  })

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('rejects an Admin changing the role of a user in an unrelated department', async () => {
    const departmentA = await createTestDepartment(db.prisma)
    const adminA = await createTestUser(db.prisma, departmentA.id, { role: 'ADMIN' })
    const departmentB = await createTestDepartment(db.prisma)
    const memberB = await createTestUser(db.prisma, departmentB.id, { role: 'MEMBER' })
    actAs(adminA)

    const fd = new FormData()
    fd.set('role', 'CHIEF')
    const result = await actions.updateUserRole(memberB.id, {}, fd)

    expect(result.message).toMatch(/not found/i)
    const untouched = await db.prisma.user.findUniqueOrThrow({ where: { id: memberB.id } })
    expect(untouched.role).toBe('MEMBER')
  })

  it('allows a district Admin to change the role of a user in a descendant department', async () => {
    const district = await createTestDepartment(db.prisma)
    const districtAdmin = await createTestUser(db.prisma, district.id, { role: 'ADMIN' })
    const child = await createTestDepartment(db.prisma, { parentDepartmentId: district.id })
    const childMember = await createTestUser(db.prisma, child.id, { role: 'MEMBER' })
    actAs(districtAdmin)

    const fd = new FormData()
    fd.set('role', 'OFFICER')
    const result = await actions.updateUserRole(childMember.id, {}, fd)

    expect(result.message).toBe('Role updated.')
    const updated = await db.prisma.user.findUniqueOrThrow({ where: { id: childMember.id } })
    expect(updated.role).toBe('OFFICER')
  })

  it('rejects an Admin deactivating a user in an unrelated department', async () => {
    const departmentA = await createTestDepartment(db.prisma)
    const adminA = await createTestUser(db.prisma, departmentA.id, { role: 'ADMIN' })
    const departmentB = await createTestDepartment(db.prisma)
    const memberB = await createTestUser(db.prisma, departmentB.id, { role: 'MEMBER' })
    actAs(adminA)

    const fd = new FormData()
    fd.set('userId', memberB.id)
    const result = await actions.deactivateUser({}, fd)

    expect(result.message).toMatch(/not found/i)
    const untouched = await db.prisma.user.findUniqueOrThrow({ where: { id: memberB.id } })
    expect(untouched.status).toBe('ACTIVE')
  })

  it('a deactivated user genuinely loses access: getCurrentAppUser returns null for them immediately after', async () => {
    const department = await createTestDepartment(db.prisma)
    const admin = await createTestUser(db.prisma, department.id, { role: 'ADMIN' })
    const member = await createTestUser(db.prisma, department.id, { role: 'MEMBER' })
    actAs(admin)

    const fd = new FormData()
    fd.set('userId', member.id)
    const result = await actions.deactivateUser({}, fd)
    expect(result.message).toBe('User deactivated.')

    actAs(member)
    const { getCurrentAppUser } = await import('@/lib/auth/current-user')
    expect(await getCurrentAppUser()).toBeNull()
  })
})
