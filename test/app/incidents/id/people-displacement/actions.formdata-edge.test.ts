import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/current-user')
vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('@/test/helpers/prisma-mock')
  return { prisma: createPrismaMock() }
})

import { prisma } from '@/lib/prisma'
import { updatePeople, addDisplacement } from '@/app/incidents/[id]/people-displacement/actions'
import { mockSignedInAs } from '@/test/helpers/auth'
import { type MockPrismaClient } from '@/test/helpers/prisma-mock'

const mockPrisma = prisma as unknown as MockPrismaClient
const INCIDENT_ID = 'incident_1'

beforeEach(() => {
  vi.resetAllMocks()
})

// Phase 5: malformed/partial FormData — key entirely absent vs present-but-empty
// vs explicit null.
describe('updatePeople — malformed/partial FormData', () => {
  it('nulls out both fields when the entire FormData is empty (both optional, absent === present-but-empty)', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })

    const result = await updatePeople(INCIDENT_ID, {}, new FormData())

    expect(mockPrisma.incident.update).toHaveBeenCalledWith({
      where: { id: INCIDENT_ID },
      data: { incidentPeoplePresent: null, incidentRescueAnimal: null }
    })
    expect(result.message).toBe('Saved.')
  })

  it('treats incidentRescueAnimal="0" as a real 0, distinct from an absent key (the string "0" is truthy, so the ternary guard does not drop it)', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })
    const fd = new FormData()
    fd.set('incidentRescueAnimal', '0')

    await updatePeople(INCIDENT_ID, {}, fd)

    expect(mockPrisma.incident.update).toHaveBeenCalledWith({
      where: { id: INCIDENT_ID },
      data: expect.objectContaining({ incidentRescueAnimal: 0 })
    })
  })

  it('coerces any non-empty, non-"true" incidentPeoplePresent value to false rather than rejecting it (documents current parsing)', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })
    const fd = new FormData()
    fd.set('incidentPeoplePresent', 'maybe')

    await updatePeople(INCIDENT_ID, {}, fd)

    expect(mockPrisma.incident.update).toHaveBeenCalledWith({
      where: { id: INCIDENT_ID },
      data: expect.objectContaining({ incidentPeoplePresent: false })
    })
  })
})

describe('addDisplacement — malformed/partial FormData', () => {
  it('returns fieldErrors and attempts no DB write when causes contains one unrecognized value among absent others', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })
    const fd = new FormData()
    fd.append('causes', 'NOT_A_REAL_CAUSE')

    const result = await addDisplacement(INCIDENT_ID, {}, fd)

    expect(result.errors).toBeDefined()
    expect(mockPrisma.incidentDisplacement.create).not.toHaveBeenCalled()
  })
})
