import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { resolveDepartmentSignup } from '@/lib/onboarding/resolve-department-signup'

type MockPrisma = {
  department: { findFirst: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> }
  user: { findFirst: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> }
  $transaction: ReturnType<typeof vi.fn>
  $queryRaw: ReturnType<typeof vi.fn>
}

function createMockPrisma(): MockPrisma {
  const mock: MockPrisma = {
    department: { findFirst: vi.fn(), create: vi.fn() },
    user: { findFirst: vi.fn(), create: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn()
  }
  mock.$transaction.mockImplementation(async (arg: (tx: MockPrisma) => unknown) => arg(mock))
  return mock
}

const SIGNER = { clerkId: 'clerk_1', name: 'Jamie Smith', email: 'jamie@example.com' }
const INPUT = { departmentName: 'Metro Fire', city: 'Metro', state: 'NY' }

beforeEach(() => {
  vi.resetAllMocks()
})

describe('resolveDepartmentSignup', () => {
  it('CREATED: creates a new Department and an ADMIN User when no matching department exists', async () => {
    const prisma = createMockPrisma()
    prisma.department.findFirst.mockResolvedValue(null)
    prisma.department.create.mockResolvedValue({ id: 'dept_new' })
    prisma.user.create.mockResolvedValue({ id: 'user_new' })

    const result = await resolveDepartmentSignup(prisma as unknown as PrismaClient, INPUT, SIGNER)

    expect(prisma.department.create).toHaveBeenCalledWith({
      data: { name: INPUT.departmentName, city: INPUT.city, state: INPUT.state }
    })
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ departmentId: 'dept_new', clerkId: SIGNER.clerkId, role: 'ADMIN' })
    })
    expect(result).toEqual({ outcome: 'CREATED', departmentId: 'dept_new', userId: 'user_new' })
  })

  it('CONTACT_ADMIN: returns the existing admin\'s contact info without writing anything when the department already has an Admin', async () => {
    const prisma = createMockPrisma()
    prisma.department.findFirst.mockResolvedValue({ id: 'dept_existing' })
    prisma.user.findFirst.mockResolvedValue({ name: 'Existing Admin', email: 'admin@example.com' })

    const result = await resolveDepartmentSignup(prisma as unknown as PrismaClient, INPUT, SIGNER)

    expect(result).toEqual({ outcome: 'CONTACT_ADMIN', admin: { name: 'Existing Admin', email: 'admin@example.com' } })
    expect(prisma.user.create).not.toHaveBeenCalled()
    expect(prisma.department.create).not.toHaveBeenCalled()
  })

  it('picks the earliest-created Admin when a department has more than one', async () => {
    const prisma = createMockPrisma()
    prisma.department.findFirst.mockResolvedValue({ id: 'dept_existing' })
    prisma.user.findFirst.mockImplementation(async (args: { orderBy?: { createdAt: string } }) => {
      expect(args.orderBy).toEqual({ createdAt: 'asc' })
      return { name: 'Earliest Admin', email: 'earliest@example.com' }
    })

    const result = await resolveDepartmentSignup(prisma as unknown as PrismaClient, INPUT, SIGNER)

    expect(result).toEqual({ outcome: 'CONTACT_ADMIN', admin: { name: 'Earliest Admin', email: 'earliest@example.com' } })
  })

  it('CLAIMED: claims Admin ownership of an orphaned department (matching department, no existing Admin)', async () => {
    const prisma = createMockPrisma()
    prisma.department.findFirst.mockResolvedValue({ id: 'dept_orphan' })
    prisma.user.findFirst.mockResolvedValue(null)
    prisma.user.create.mockResolvedValue({ id: 'user_claimed' })

    const result = await resolveDepartmentSignup(prisma as unknown as PrismaClient, INPUT, SIGNER)

    expect(prisma.$queryRaw).toHaveBeenCalled()
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ departmentId: 'dept_orphan', clerkId: SIGNER.clerkId, role: 'ADMIN' })
    })
    expect(result).toEqual({ outcome: 'CLAIMED', departmentId: 'dept_orphan', userId: 'user_claimed' })
  })

  it('race: a second claimer re-checks after the lock and is told to contact the admin who won, instead of double-claiming', async () => {
    const prisma = createMockPrisma()
    prisma.department.findFirst.mockResolvedValue({ id: 'dept_orphan' })
    // First (outer, pre-lock) check sees no admin — genuinely orphaned at read time.
    // Second (inner, post-lock) check finds the row another transaction just claimed.
    prisma.user.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ name: 'Winner Admin', email: 'winner@example.com' })

    const result = await resolveDepartmentSignup(prisma as unknown as PrismaClient, INPUT, SIGNER)

    expect(result).toEqual({ outcome: 'CONTACT_ADMIN', admin: { name: 'Winner Admin', email: 'winner@example.com' } })
    expect(prisma.user.create).not.toHaveBeenCalled()
  })
})
