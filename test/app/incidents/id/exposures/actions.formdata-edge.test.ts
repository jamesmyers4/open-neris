import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/current-user')
vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('@/test/helpers/prisma-mock')
  return { prisma: createPrismaMock() }
})

import { prisma } from '@/lib/prisma'
import { createExposure } from '@/app/incidents/[id]/exposures/actions'
import { mockSignedInAs } from '@/test/helpers/auth'
import { type MockPrismaClient } from '@/test/helpers/prisma-mock'

const mockPrisma = prisma as unknown as MockPrismaClient
const INCIDENT_ID = 'incident_1'

beforeEach(() => {
  vi.resetAllMocks()
})

// Phase 5: malformed/partial FormData — key entirely absent vs present-but-empty
// vs explicit null.
describe('createExposure — malformed/partial FormData', () => {
  it('returns fieldErrors and attempts no DB write when exposureType is entirely absent', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })
    const fd = new FormData()
    fd.set('exposureDamage', 'MINOR_DAMAGE')

    const result = await createExposure(INCIDENT_ID, {}, fd)

    expect(result.errors).toBeDefined()
    expect(mockPrisma.incidentExposure.create).not.toHaveBeenCalled()
  })

  it('treats exposureDisplacedNumber="0" the same as any other truthy numeric string (not falsy, unlike an absent key)', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })
    const fd = new FormData()
    fd.set('exposureType', 'INTERNAL_EXPOSURE')
    fd.set('exposureDamage', 'MINOR_DAMAGE')
    fd.set('exposureDisplacedNumber', '0')

    await createExposure(INCIDENT_ID, {}, fd)

    expect(mockPrisma.incidentExposure.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ exposureDisplacedNumber: 0 })
    })
  })

  it('leaves exposureDisplacedNumber undefined when the key is entirely absent (distinct from an explicit 0)', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })
    const fd = new FormData()
    fd.set('exposureType', 'INTERNAL_EXPOSURE')
    fd.set('exposureDamage', 'MINOR_DAMAGE')

    await createExposure(INCIDENT_ID, {}, fd)

    expect(mockPrisma.incidentExposure.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ exposureDisplacedNumber: undefined })
    })
  })

  it('treats an entirely-absent exposureDisplacedCauses the same as present-but-empty (getAll returns [] either way)', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })
    const fd = new FormData()
    fd.set('exposureType', 'INTERNAL_EXPOSURE')
    fd.set('exposureDamage', 'MINOR_DAMAGE')

    await createExposure(INCIDENT_ID, {}, fd)

    expect(mockPrisma.incidentExposure.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ exposureDisplacedCauses: [] })
    })
  })
})
