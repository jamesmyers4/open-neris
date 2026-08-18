import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/current-user')
vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('@/test/helpers/prisma-mock')
  return { prisma: createPrismaMock() }
})

import { prisma } from '@/lib/prisma'
import { updateNarrative } from '@/app/incidents/[id]/narrative/actions'
import { mockSignedInAs } from '@/test/helpers/auth'
import { type MockPrismaClient } from '@/test/helpers/prisma-mock'

const mockPrisma = prisma as unknown as MockPrismaClient
const INCIDENT_ID = 'incident_1'

beforeEach(() => {
  vi.resetAllMocks()
})

// Phase 5: malformed/partial FormData — key entirely absent vs present-but-empty
// vs explicit null.
describe('updateNarrative — malformed/partial FormData', () => {
  it('nulls out both fields when the entire FormData is empty (both optional, absent === present-but-empty)', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })

    const result = await updateNarrative(INCIDENT_ID, {}, new FormData())

    expect(mockPrisma.incident.update).toHaveBeenCalledWith({
      where: { id: INCIDENT_ID },
      data: { narrativeImpediment: null, narrativeOutcome: null }
    })
    expect(result.message).toBe('Saved.')
  })

  it('returns fieldErrors and attempts no DB write when narrativeImpediment is a non-string File value', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })
    const fd = new FormData()
    fd.set('narrativeImpediment', new File(['x'], 'not-text.txt'))

    const result = await updateNarrative(INCIDENT_ID, {}, fd)

    expect(result.errors).toBeDefined()
    expect(mockPrisma.incident.update).not.toHaveBeenCalled()
  })
})
