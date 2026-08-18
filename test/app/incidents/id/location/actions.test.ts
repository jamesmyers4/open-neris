import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/current-user')
vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('@/test/helpers/prisma-mock')
  return { prisma: createPrismaMock() }
})

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { updateLocation } from '@/app/incidents/[id]/location/actions'
import { mockSignedInAs, mockSignedOut } from '@/test/helpers/auth'
import { type MockPrismaClient } from '@/test/helpers/prisma-mock'

const mockPrisma = prisma as unknown as MockPrismaClient
const INCIDENT_ID = 'incident_1'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('updateLocation', () => {
  function validFormData() {
    const fd = new FormData()
    fd.set('streetAddressComplete', '123 Main St')
    fd.set('state', 'NY')
    return fd
  }

  it('returns a message and attempts no DB write when unauthenticated', async () => {
    mockSignedOut()
    const result = await updateLocation(INCIDENT_ID, {}, validFormData())
    expect(result.message).toMatch(/signed in/i)
    expect(mockPrisma.incident.findFirst).not.toHaveBeenCalled()
  })

  it('returns fieldErrors and attempts no DB write for an invalid state', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })
    const fd = new FormData()
    fd.set('streetAddressComplete', '123 Main St')
    fd.set('state', 'New York')

    const result = await updateLocation(INCIDENT_ID, {}, fd)

    expect(result.errors).toBeDefined()
    expect(mockPrisma.incidentLocation.upsert).not.toHaveBeenCalled()
  })

  it('returns "not found" and attempts no DB write for a cross-tenant incident', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue(null)

    const result = await updateLocation(INCIDENT_ID, {}, validFormData())

    expect(result.message).toMatch(/not found/i)
    expect(mockPrisma.incidentLocation.upsert).not.toHaveBeenCalled()
  })

  it('upserts the location and revalidates on the happy path', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })

    const result = await updateLocation(INCIDENT_ID, {}, validFormData())

    const expectedData = expect.objectContaining({ streetAddressComplete: '123 Main St', state: 'NY', country: 'US' })
    expect(mockPrisma.incidentLocation.upsert).toHaveBeenCalledWith({
      where: { incidentId: INCIDENT_ID },
      create: expect.objectContaining({ incidentId: INCIDENT_ID, streetAddressComplete: '123 Main St', state: 'NY' }),
      update: expectedData
    })
    expect(revalidatePath).toHaveBeenCalledWith(`/incidents/${INCIDENT_ID}/location`)
    expect(result.message).toBe('Saved.')
  })
})
