import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/current-user')
vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('@/test/helpers/prisma-mock')
  return { prisma: createPrismaMock() }
})

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { updateNarrative } from '@/app/incidents/[id]/narrative/actions'
import { mockSignedInAs, mockSignedOut } from '@/test/helpers/auth'
import { type MockPrismaClient } from '@/test/helpers/prisma-mock'

const mockPrisma = prisma as unknown as MockPrismaClient
const INCIDENT_ID = 'incident_1'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('updateNarrative', () => {
  function validFormData() {
    const fd = new FormData()
    fd.set('narrativeImpediment', 'None')
    fd.set('narrativeOutcome', 'Resolved on scene')
    return fd
  }

  it('returns a message and attempts no DB write when unauthenticated', async () => {
    mockSignedOut()
    const result = await updateNarrative(INCIDENT_ID, {}, validFormData())
    expect(result.message).toMatch(/signed in/i)
    expect(mockPrisma.incident.findFirst).not.toHaveBeenCalled()
  })

  it('returns fieldErrors and attempts no DB write for an over-length field', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })
    const fd = new FormData()
    fd.set('narrativeOutcome', 'a'.repeat(100_001))

    const result = await updateNarrative(INCIDENT_ID, {}, fd)

    expect(result.errors).toBeDefined()
    expect(mockPrisma.incident.update).not.toHaveBeenCalled()
  })

  it('returns "not found" and attempts no DB write for a cross-tenant incident', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue(null)

    const result = await updateNarrative(INCIDENT_ID, {}, validFormData())

    expect(result.message).toMatch(/not found/i)
    expect(mockPrisma.incident.update).not.toHaveBeenCalled()
  })

  it('saves and revalidates on the happy path', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })

    const result = await updateNarrative(INCIDENT_ID, {}, validFormData())

    expect(mockPrisma.incident.update).toHaveBeenCalledWith({
      where: { id: INCIDENT_ID },
      data: { narrativeImpediment: 'None', narrativeOutcome: 'Resolved on scene' }
    })
    expect(revalidatePath).toHaveBeenCalledWith(`/incidents/${INCIDENT_ID}/narrative`)
    expect(result.message).toBe('Saved.')
  })
})
