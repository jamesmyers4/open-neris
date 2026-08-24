import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('@/test/helpers/prisma-mock')
  return { prisma: createPrismaMock() }
})

import { prisma } from '@/lib/prisma'
import { getUnreadNotificationCount } from '@/lib/notifications/get-unread-count'
import { type MockPrismaClient } from '@/test/helpers/prisma-mock'

const mockPrisma = prisma as unknown as MockPrismaClient

beforeEach(() => {
  vi.resetAllMocks()
})

describe('getUnreadNotificationCount', () => {
  it('counts only unread Notification rows for the given user', async () => {
    mockPrisma.notification.count.mockResolvedValue(3)

    const result = await getUnreadNotificationCount(prisma, 'user_1')

    expect(mockPrisma.notification.count).toHaveBeenCalledWith({ where: { userId: 'user_1', read: false } })
    expect(result).toBe(3)
  })
})
