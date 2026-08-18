import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/current-user')
vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('@/test/helpers/prisma-mock')
  return { prisma: createPrismaMock() }
})

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { createExposure } from '@/app/incidents/[id]/exposures/actions'
import { mockSignedInAs, mockSignedOut } from '@/test/helpers/auth'
import { type MockPrismaClient } from '@/test/helpers/prisma-mock'

const mockPrisma = prisma as unknown as MockPrismaClient
const INCIDENT_ID = 'incident_1'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('createExposure', () => {
  function validFormData() {
    const fd = new FormData()
    fd.set('exposureType', 'INTERNAL_EXPOSURE')
    fd.set('exposureDamage', 'MINOR_DAMAGE')
    return fd
  }

  it('returns a message and attempts no DB write when unauthenticated', async () => {
    mockSignedOut()
    const result = await createExposure(INCIDENT_ID, {}, validFormData())
    expect(result.message).toMatch(/signed in/i)
    expect(mockPrisma.incident.findFirst).not.toHaveBeenCalled()
  })

  it('returns fieldErrors and attempts no DB write for an EXTERNAL_EXPOSURE with no exposureItem', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })
    const fd = new FormData()
    fd.set('exposureType', 'EXTERNAL_EXPOSURE')
    fd.set('exposureDamage', 'MINOR_DAMAGE')

    const result = await createExposure(INCIDENT_ID, {}, fd)

    expect(result.errors).toBeDefined()
    expect(mockPrisma.incidentExposure.create).not.toHaveBeenCalled()
  })

  it('returns "not found" and attempts no DB write for a cross-tenant incident', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue(null)

    const result = await createExposure(INCIDENT_ID, {}, validFormData())

    expect(result.message).toMatch(/not found/i)
    expect(mockPrisma.incidentExposure.create).not.toHaveBeenCalled()
  })

  it('creates the exposure and redirects to the exposures list on the happy path', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })

    await createExposure(INCIDENT_ID, {}, validFormData())

    expect(mockPrisma.incidentExposure.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ incidentId: INCIDENT_ID, exposureType: 'INTERNAL_EXPOSURE', exposureDamage: 'MINOR_DAMAGE' })
    })
    expect(redirect).toHaveBeenCalledWith(`/incidents/${INCIDENT_ID}/exposures`)
  })
})
