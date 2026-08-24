import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('@/test/helpers/prisma-mock')
  return { prisma: createPrismaMock() }
})

import { prisma } from '@/lib/prisma'
import { getUsersInScope } from '@/lib/organization/get-users-in-scope'
import { type MockPrismaClient } from '@/test/helpers/prisma-mock'

const mockPrisma = prisma as unknown as MockPrismaClient

beforeEach(() => {
  vi.resetAllMocks()
})

describe('getUsersInScope', () => {
  it('scopes both departments and users to the admin\'s own department when it has no descendants', async () => {
    mockPrisma.department.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'dept_1', name: 'Leaf FD' }])
    mockPrisma.user.findMany.mockResolvedValue([{ id: 'user_1' }])

    const result = await getUsersInScope(prisma, 'dept_1')

    expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
      where: { departmentId: { in: ['dept_1'] } },
      orderBy: { createdAt: 'asc' }
    })
    expect(result.users).toEqual([{ id: 'user_1' }])
    expect(result.departments).toEqual([{ id: 'dept_1', name: 'Leaf FD' }])
  })

  it('includes descendant departments and their users for a district Admin', async () => {
    mockPrisma.department.findMany
      .mockResolvedValueOnce([{ id: 'child' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'district', name: 'District HQ' }, { id: 'child', name: 'Child FD' }])
    mockPrisma.user.findMany.mockResolvedValue([{ id: 'user_district' }, { id: 'user_child' }])

    const result = await getUsersInScope(prisma, 'district')

    expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
      where: { departmentId: { in: ['district', 'child'] } },
      orderBy: { createdAt: 'asc' }
    })
    expect(result.users).toHaveLength(2)
  })
})
