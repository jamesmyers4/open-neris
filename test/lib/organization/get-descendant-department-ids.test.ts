import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('@/test/helpers/prisma-mock')
  return { prisma: createPrismaMock() }
})

import { prisma } from '@/lib/prisma'
import { getDescendantDepartmentIds } from '@/lib/organization/get-descendant-department-ids'
import { type MockPrismaClient } from '@/test/helpers/prisma-mock'

const mockPrisma = prisma as unknown as MockPrismaClient

beforeEach(() => {
  vi.resetAllMocks()
})

describe('getDescendantDepartmentIds', () => {
  it('returns just the department itself when it has no children', async () => {
    mockPrisma.department.findMany.mockResolvedValue([])

    const result = await getDescendantDepartmentIds(prisma, 'dept_leaf')

    expect(result).toEqual(['dept_leaf'])
  })

  it('includes direct children', async () => {
    mockPrisma.department.findMany.mockResolvedValueOnce([{ id: 'child_a' }, { id: 'child_b' }]).mockResolvedValueOnce([])

    const result = await getDescendantDepartmentIds(prisma, 'dept_root')

    expect(result.sort()).toEqual(['child_a', 'child_b', 'dept_root'].sort())
  })

  it('recurses through multiple levels of hierarchy', async () => {
    mockPrisma.department.findMany
      .mockResolvedValueOnce([{ id: 'child' }])
      .mockResolvedValueOnce([{ id: 'grandchild' }])
      .mockResolvedValueOnce([])

    const result = await getDescendantDepartmentIds(prisma, 'root')

    expect(result.sort()).toEqual(['child', 'grandchild', 'root'].sort())
    expect(mockPrisma.department.findMany).toHaveBeenCalledTimes(3)
  })
})
