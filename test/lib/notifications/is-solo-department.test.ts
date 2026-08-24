import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('@/test/helpers/prisma-mock')
  return { prisma: createPrismaMock() }
})

import { prisma } from '@/lib/prisma'
import { isSoloDepartment } from '@/lib/notifications/is-solo-department'
import { type MockPrismaClient } from '@/test/helpers/prisma-mock'

const mockPrisma = prisma as unknown as MockPrismaClient

beforeEach(() => {
  vi.resetAllMocks()
})

describe('isSoloDepartment', () => {
  it('counts only ACTIVE users for the given department', async () => {
    mockPrisma.user.count.mockResolvedValue(1)

    await isSoloDepartment(prisma, 'dept_1')

    expect(mockPrisma.user.count).toHaveBeenCalledWith({ where: { departmentId: 'dept_1', status: 'ACTIVE' } })
  })

  it('returns true for exactly one active user', async () => {
    mockPrisma.user.count.mockResolvedValue(1)
    expect(await isSoloDepartment(prisma, 'dept_1')).toBe(true)
  })

  it('returns false for more than one active user', async () => {
    mockPrisma.user.count.mockResolvedValue(2)
    expect(await isSoloDepartment(prisma, 'dept_1')).toBe(false)
  })
})
