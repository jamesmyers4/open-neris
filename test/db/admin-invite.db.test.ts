import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Deliberately NOT mocking @/lib/auth/current-user here — that module's real,
// unmocked implementation (including its Session 8 pending-invite-linking
// logic) is exactly what this file tests against real Postgres. Only the
// Clerk SDK calls it wraps are mocked, same factory-mock reasoning as every
// other db.test.ts file uses for other modules.
// createInvite also calls clerkClient().invitations.createInvitation() for
// real — mocked here to a resolving stub so these tests never fire a genuine
// Clerk API call (no real credentials/network access in this test run, and
// even if there were, a test must never actually send email).
const { mockAuth, mockCurrentUser, mockCreateInvitation } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockCurrentUser: vi.fn(),
  mockCreateInvitation: vi.fn().mockResolvedValue({})
}))
vi.mock('@clerk/nextjs/server', () => ({
  auth: mockAuth,
  currentUser: mockCurrentUser,
  clerkClient: vi.fn(async () => ({ invitations: { createInvitation: mockCreateInvitation } }))
}))

import type { User } from '@prisma/client'
import { startTestDatabase, stopTestDatabase, type TestDatabase } from '@/test/helpers/db'
import { createTestDepartment, createTestUser } from '@/test/helpers/db-fixtures'

// @/lib/auth/current-user is deliberately real in this file (see note above),
// so "sign in as" here means pointing the mocked Clerk auth() at a real
// User's real clerkId and letting getCurrentAppUser's own DB lookup resolve
// it — mockSignedInAs (which replaces getCurrentAppUser itself) can't be used
// alongside that.
function actAs(user: User): void {
  mockAuth.mockResolvedValue({ userId: user.clerkId })
}

type Actions = {
  createInvite: typeof import('@/app/admin/users/actions').createInvite
}

describe('Admin-invite flow (Testcontainers Postgres)', () => {
  let db: TestDatabase
  let actions: Actions

  beforeAll(async () => {
    db = await startTestDatabase()

    ;(globalThis as { prisma?: unknown }).prisma = undefined
    process.env.DATABASE_URL = db.container.getConnectionUri()

    const usersActions = await import('@/app/admin/users/actions')
    actions = { createInvite: usersActions.createInvite }
  })

  afterAll(async () => {
    await stopTestDatabase(db)
  })

  beforeEach(() => {
    vi.resetAllMocks()
    mockCreateInvitation.mockResolvedValue({})
  })

  describe('clerkId links on first sign-in', () => {
    it('links a PENDING User row to the real Clerk session and flips it to ACTIVE', async () => {
      const department = await createTestDepartment(db.prisma)
      const pending = await db.prisma.user.create({
        data: { departmentId: department.id, email: 'invitee@example.com', name: 'invitee@example.com', role: 'OFFICER', status: 'PENDING', clerkId: null }
      })

      mockAuth.mockResolvedValue({ userId: 'clerk_real_invitee' })
      mockCurrentUser.mockResolvedValue({ primaryEmailAddress: { emailAddress: 'invitee@example.com' } })

      const { getCurrentAppUser } = await import('@/lib/auth/current-user')
      const linked = await getCurrentAppUser()

      expect(linked).toMatchObject({ id: pending.id, clerkId: 'clerk_real_invitee', status: 'ACTIVE', role: 'OFFICER' })

      const reloaded = await db.prisma.user.findUniqueOrThrow({ where: { id: pending.id } })
      expect(reloaded.clerkId).toBe('clerk_real_invitee')
      expect(reloaded.status).toBe('ACTIVE')
    })

    it('is idempotent: a second sign-in finds the now-linked row directly by clerkId, without re-scanning pending rows', async () => {
      const department = await createTestDepartment(db.prisma)
      await db.prisma.user.create({
        data: { departmentId: department.id, email: 'twice@example.com', name: 'twice@example.com', role: 'MEMBER', status: 'ACTIVE', clerkId: 'clerk_already_linked' }
      })

      mockAuth.mockResolvedValue({ userId: 'clerk_already_linked' })

      const { getCurrentAppUser } = await import('@/lib/auth/current-user')
      const result = await getCurrentAppUser()

      expect(result).toMatchObject({ clerkId: 'clerk_already_linked', status: 'ACTIVE' })
      expect(mockCurrentUser).not.toHaveBeenCalled()
    })
  })

  describe('department-scoping restriction', () => {
    it('rejects an Admin from department A inviting into unrelated department B', async () => {
      const departmentA = await createTestDepartment(db.prisma)
      const adminA = await createTestUser(db.prisma, departmentA.id, { role: 'ADMIN' })
      const departmentB = await createTestDepartment(db.prisma)
      actAs(adminA)

      const fd = new FormData()
      fd.set('email', 'target@example.com')
      fd.set('role', 'MEMBER')
      fd.set('departmentId', departmentB.id)

      const result = await actions.createInvite({}, fd)

      expect(result.message).toMatch(/own department/i)
      expect(await db.prisma.user.findFirst({ where: { departmentId: departmentB.id, email: 'target@example.com' } })).toBeNull()
    })

    it('allows a district Admin to invite into a child department', async () => {
      const district = await createTestDepartment(db.prisma)
      const districtAdmin = await createTestUser(db.prisma, district.id, { role: 'ADMIN' })
      const child = await createTestDepartment(db.prisma, { parentDepartmentId: district.id })
      actAs(districtAdmin)

      const fd = new FormData()
      fd.set('email', 'child-invite@example.com')
      fd.set('role', 'OFFICER')
      fd.set('departmentId', child.id)

      const result = await actions.createInvite({}, fd)

      expect(result.message).toBe('Invite sent.')
      const created = await db.prisma.user.findFirstOrThrow({ where: { departmentId: child.id, email: 'child-invite@example.com' } })
      expect(created).toMatchObject({ status: 'PENDING', clerkId: null, role: 'OFFICER' })
    })

    it('rejects a district Admin inviting into a sibling district\'s department', async () => {
      const districtOne = await createTestDepartment(db.prisma)
      const districtOneAdmin = await createTestUser(db.prisma, districtOne.id, { role: 'ADMIN' })
      await createTestDepartment(db.prisma, { parentDepartmentId: districtOne.id })

      const districtTwo = await createTestDepartment(db.prisma)
      const districtTwoChild = await createTestDepartment(db.prisma, { parentDepartmentId: districtTwo.id })

      actAs(districtOneAdmin)

      const fd = new FormData()
      fd.set('email', 'sibling-target@example.com')
      fd.set('role', 'MEMBER')
      fd.set('departmentId', districtTwoChild.id)

      const result = await actions.createInvite({}, fd)

      expect(result.message).toMatch(/own department/i)
      expect(await db.prisma.user.findFirst({ where: { departmentId: districtTwoChild.id, email: 'sibling-target@example.com' } })).toBeNull()
    })
  })
})
