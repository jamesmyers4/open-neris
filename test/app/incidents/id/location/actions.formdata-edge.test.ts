import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/current-user')
vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('@/test/helpers/prisma-mock')
  return { prisma: createPrismaMock() }
})

import { prisma } from '@/lib/prisma'
import { updateLocation } from '@/app/incidents/[id]/location/actions'
import { mockSignedInAs } from '@/test/helpers/auth'
import { type MockPrismaClient } from '@/test/helpers/prisma-mock'

const mockPrisma = prisma as unknown as MockPrismaClient
const INCIDENT_ID = 'incident_1'

beforeEach(() => {
  vi.resetAllMocks()
})

// Phase 5: malformed/partial FormData — key entirely absent vs present-but-empty
// vs explicit null.
describe('updateLocation — malformed/partial FormData', () => {
  it('returns fieldErrors and attempts no DB write when streetAddressComplete is entirely absent', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })
    const fd = new FormData()
    fd.set('state', 'NY')

    const result = await updateLocation(INCIDENT_ID, {}, fd)

    expect(result.errors).toBeDefined()
    expect(mockPrisma.incidentLocation.upsert).not.toHaveBeenCalled()
  })

  it('returns fieldErrors and attempts no DB write when state is entirely absent', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })
    const fd = new FormData()
    fd.set('streetAddressComplete', '123 Main St')

    const result = await updateLocation(INCIDENT_ID, {}, fd)

    expect(result.errors).toBeDefined()
    expect(mockPrisma.incidentLocation.upsert).not.toHaveBeenCalled()
  })

  it('defaults country to US when the key is entirely absent, same as present-but-empty', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })
    const fd = new FormData()
    fd.set('streetAddressComplete', '123 Main St')
    fd.set('state', 'NY')

    await updateLocation(INCIDENT_ID, {}, fd)

    expect(mockPrisma.incidentLocation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: expect.objectContaining({ country: 'US' }) })
    )
  })
})
