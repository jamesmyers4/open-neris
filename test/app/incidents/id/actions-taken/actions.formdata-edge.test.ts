import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/current-user')
vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('@/test/helpers/prisma-mock')
  return { prisma: createPrismaMock() }
})

import { prisma } from '@/lib/prisma'
import { setNoActionReason, addActionTaken } from '@/app/incidents/[id]/actions-taken/actions'
import { mockSignedInAs } from '@/test/helpers/auth'
import { type MockPrismaClient } from '@/test/helpers/prisma-mock'

const mockPrisma = prisma as unknown as MockPrismaClient
const INCIDENT_ID = 'incident_1'

beforeEach(() => {
  vi.resetAllMocks()
})

// Phase 5: malformed/partial FormData — key entirely absent vs present-but-empty
// vs explicit null.
describe('setNoActionReason — malformed/partial FormData', () => {
  it('clears the reason (success) when incidentNoActionReason is entirely absent — same outcome as present-but-empty', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID, actionsTaken: [] })

    const result = await setNoActionReason(INCIDENT_ID, {}, new FormData())

    expect(mockPrisma.incident.update).toHaveBeenCalledWith({
      where: { id: INCIDENT_ID },
      data: { incidentNoActionReason: null }
    })
    expect(result.message).toBe('Saved.')
  })
})

describe('addActionTaken — malformed/partial FormData', () => {
  it('returns fieldErrors and attempts no DB write when value1 is entirely absent (distinct from an unrecognized value1)', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID, actionsTaken: [], incidentNoActionReason: null })

    const result = await addActionTaken(INCIDENT_ID, {}, new FormData())

    expect(result.errors).toBeDefined()
    expect(mockPrisma.incidentActionTaken.create).not.toHaveBeenCalled()
  })

  it('returns fieldErrors and attempts no DB write when value1 is a non-string File value', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID, actionsTaken: [], incidentNoActionReason: null })
    const fd = new FormData()
    fd.set('value1', new File(['x'], 'not-a-tactic.txt'))

    const result = await addActionTaken(INCIDENT_ID, {}, fd)

    expect(result.errors).toBeDefined()
    expect(mockPrisma.incidentActionTaken.create).not.toHaveBeenCalled()
  })
})
