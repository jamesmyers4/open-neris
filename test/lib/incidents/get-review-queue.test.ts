import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('@/test/helpers/prisma-mock')
  return { prisma: createPrismaMock() }
})

import { prisma } from '@/lib/prisma'
import { getReviewQueue } from '@/lib/incidents/get-review-queue'
import { type MockPrismaClient } from '@/test/helpers/prisma-mock'

const mockPrisma = prisma as unknown as MockPrismaClient

beforeEach(() => {
  vi.resetAllMocks()
})

describe('getReviewQueue', () => {
  it('queries only SUBMITTED/REVIEWED incidents scoped to the given department', async () => {
    mockPrisma.incident.findMany.mockResolvedValue([])

    await getReviewQueue(prisma, 'dept_1')

    expect(mockPrisma.incident.findMany).toHaveBeenCalledWith({
      where: { departmentId: 'dept_1', reviewStatus: { in: ['SUBMITTED', 'REVIEWED'] } },
      include: { types: { where: { isPrimary: true }, take: 1 } },
      orderBy: { createdAt: 'asc' }
    })
  })

  it('returns whatever the query resolves with', async () => {
    const incidents = [{ id: 'incident_1', reviewStatus: 'SUBMITTED' }]
    mockPrisma.incident.findMany.mockResolvedValue(incidents)

    const result = await getReviewQueue(prisma, 'dept_1')

    expect(result).toBe(incidents)
  })
})
