import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('@/test/helpers/prisma-mock')
  return { prisma: createPrismaMock() }
})

import { prisma } from '@/lib/prisma'
import { getDepartmentUnits } from '@/lib/organization/get-department-units'
import { type MockPrismaClient } from '@/test/helpers/prisma-mock'

const mockPrisma = prisma as unknown as MockPrismaClient

beforeEach(() => {
  vi.resetAllMocks()
})

describe('getDepartmentUnits', () => {
  it('scopes the query to the given department through Station, ordered by designation', async () => {
    mockPrisma.unit.findMany.mockResolvedValue([])

    await getDepartmentUnits('dept_1')

    expect(mockPrisma.unit.findMany).toHaveBeenCalledWith({
      where: { station: { departmentId: 'dept_1' } },
      include: { station: true },
      orderBy: { designation: 'asc' }
    })
  })

  it('returns whatever the query resolves with', async () => {
    const units = [{ id: 'unit_1', designation: 'ENGINE 1', station: { label: 'Station 1' } }]
    mockPrisma.unit.findMany.mockResolvedValue(units)

    const result = await getDepartmentUnits('dept_1')

    expect(result).toBe(units)
  })
})
