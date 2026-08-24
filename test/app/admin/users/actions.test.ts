import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/current-user')
vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('@/test/helpers/prisma-mock')
  return { prisma: createPrismaMock() }
})
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const { mockCreateInvitation } = vi.hoisted(() => ({ mockCreateInvitation: vi.fn() }))
vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn(async () => ({ invitations: { createInvitation: mockCreateInvitation } }))
}))

import { prisma } from '@/lib/prisma'
import { createInvite } from '@/app/admin/users/actions'
import { mockSignedInAs, mockSignedOut } from '@/test/helpers/auth'
import { type MockPrismaClient } from '@/test/helpers/prisma-mock'

const mockPrisma = prisma as unknown as MockPrismaClient
const DEPARTMENT_ID = 'dept_1'

function validFormData() {
  const fd = new FormData()
  fd.set('email', 'newperson@example.com')
  fd.set('role', 'OFFICER')
  return fd
}

beforeEach(() => {
  vi.resetAllMocks()
  mockPrisma.department.findMany.mockResolvedValue([])
})

describe('createInvite', () => {
  it('returns a message and sends no invite when unauthenticated', async () => {
    mockSignedOut()
    const result = await createInvite({}, validFormData())
    expect(result.message).toMatch(/signed in/i)
    expect(mockCreateInvitation).not.toHaveBeenCalled()
  })

  it('returns a message and sends no invite for a non-Admin user', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID, role: 'OFFICER' })
    const result = await createInvite({}, validFormData())
    expect(result.message).toMatch(/admin/i)
    expect(mockCreateInvitation).not.toHaveBeenCalled()
  })

  it('returns fieldErrors for an invalid email without creating a pending user or sending an invite', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID, role: 'ADMIN' })
    const fd = new FormData()
    fd.set('email', 'not-an-email')
    fd.set('role', 'OFFICER')

    const result = await createInvite({}, fd)

    expect(result.errors?.email).toBeDefined()
    expect(mockPrisma.user.create).not.toHaveBeenCalled()
    expect(mockCreateInvitation).not.toHaveBeenCalled()
  })

  it('rejects a departmentId outside the caller\'s own department and its descendants', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID, role: 'ADMIN' })
    mockPrisma.department.findMany.mockResolvedValue([])
    const fd = validFormData()
    fd.set('departmentId', 'some-other-department')

    const result = await createInvite({}, fd)

    expect(result.message).toMatch(/own department/i)
    expect(mockPrisma.user.create).not.toHaveBeenCalled()
    expect(mockCreateInvitation).not.toHaveBeenCalled()
  })

  it('allows inviting into a descendant department (district Admin case)', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID, role: 'ADMIN' })
    mockPrisma.department.findMany.mockResolvedValueOnce([{ id: 'child_dept' }]).mockResolvedValueOnce([])
    mockPrisma.user.findFirst.mockResolvedValue(null)
    const fd = validFormData()
    fd.set('departmentId', 'child_dept')

    const result = await createInvite({}, fd)

    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ departmentId: 'child_dept', status: 'PENDING', clerkId: null })
    })
    expect(result.message).toBe('Invite sent.')
  })

  it('rejects an email that already exists in the target department without creating a duplicate or sending an invite', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID, role: 'ADMIN' })
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'existing_user' })

    const result = await createInvite({}, validFormData())

    expect(result.message).toMatch(/already exists/i)
    expect(mockPrisma.user.create).not.toHaveBeenCalled()
    expect(mockCreateInvitation).not.toHaveBeenCalled()
  })

  it('creates a PENDING User row with a null clerkId and sends the Clerk invitation on the happy path', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID, role: 'ADMIN' })
    mockPrisma.user.findFirst.mockResolvedValue(null)

    const result = await createInvite({}, validFormData())

    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: {
        departmentId: DEPARTMENT_ID,
        email: 'newperson@example.com',
        name: 'newperson@example.com',
        role: 'OFFICER',
        status: 'PENDING',
        clerkId: null
      }
    })
    expect(mockCreateInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ emailAddress: 'newperson@example.com' })
    )
    expect(result.message).toBe('Invite sent.')
  })

  it('returns a friendly message (not a raw throw) when the Clerk invite email fails to send', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID, role: 'ADMIN' })
    mockPrisma.user.findFirst.mockResolvedValue(null)
    mockCreateInvitation.mockRejectedValue(new Error('Clerk API down'))

    const result = await createInvite({}, validFormData())

    expect(result.message).toMatch(/sign up normally/i)
  })
})
