import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('@/test/helpers/prisma-mock')
  return { prisma: createPrismaMock() }
})

const { mockAuth, mockCurrentUser } = vi.hoisted(() => ({ mockAuth: vi.fn(), mockCurrentUser: vi.fn() }))
vi.mock('@clerk/nextjs/server', () => ({
  auth: mockAuth,
  currentUser: mockCurrentUser
}))

import { prisma } from '@/lib/prisma'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { type MockPrismaClient } from '@/test/helpers/prisma-mock'

const mockPrisma = prisma as unknown as MockPrismaClient

beforeEach(() => {
  vi.resetAllMocks()
})

describe('getCurrentAppUser', () => {
  it('returns null when there is no Clerk session', async () => {
    mockAuth.mockResolvedValue({ userId: null })

    const result = await getCurrentAppUser()

    expect(result).toBeNull()
    expect(mockPrisma.user.findFirst).not.toHaveBeenCalled()
  })

  it('returns the already-linked User row directly, without checking for a pending invite', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk_1' })
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user_1', clerkId: 'clerk_1' })

    const result = await getCurrentAppUser()

    expect(result).toEqual({ id: 'user_1', clerkId: 'clerk_1' })
    expect(mockCurrentUser).not.toHaveBeenCalled()
  })

  it('links a PENDING User row by matching email on first sign-in, setting clerkId and status', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk_new' })
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockCurrentUser.mockResolvedValue({ primaryEmailAddress: { emailAddress: 'invitee@example.com' } })
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'pending_user', email: 'invitee@example.com', status: 'PENDING' })
    mockPrisma.user.update.mockResolvedValue({ id: 'pending_user', clerkId: 'clerk_new', status: 'ACTIVE' })

    const result = await getCurrentAppUser()

    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
      where: { clerkId: null, status: 'PENDING', email: 'invitee@example.com' }
    })
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'pending_user' },
      data: { clerkId: 'clerk_new', status: 'ACTIVE' }
    })
    expect(result).toEqual({ id: 'pending_user', clerkId: 'clerk_new', status: 'ACTIVE' })
  })

  it('returns null when signed in but no matching User row (linked or pending) exists', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk_stranger' })
    mockCurrentUser.mockResolvedValue({ primaryEmailAddress: { emailAddress: 'stranger@example.com' } })
    mockPrisma.user.findFirst.mockResolvedValue(null)

    const result = await getCurrentAppUser()

    expect(result).toBeNull()
  })

  it('returns null without querying for a pending row when the Clerk account has no primary email', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk_no_email' })
    mockCurrentUser.mockResolvedValue({ primaryEmailAddress: null })

    const result = await getCurrentAppUser()

    expect(result).toBeNull()
    expect(mockPrisma.user.findFirst).not.toHaveBeenCalled()
  })
})
