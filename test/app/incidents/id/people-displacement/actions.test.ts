import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/current-user')
vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('@/test/helpers/prisma-mock')
  return { prisma: createPrismaMock() }
})

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { updatePeople, addDisplacement } from '@/app/incidents/[id]/people-displacement/actions'
import { mockSignedInAs, mockSignedOut } from '@/test/helpers/auth'
import { type MockPrismaClient } from '@/test/helpers/prisma-mock'

const mockPrisma = prisma as unknown as MockPrismaClient
const INCIDENT_ID = 'incident_1'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('updatePeople', () => {
  function validFormData() {
    const fd = new FormData()
    fd.set('incidentPeoplePresent', 'true')
    fd.set('incidentRescueAnimal', '2')
    return fd
  }

  it('returns a message and attempts no DB write when unauthenticated', async () => {
    mockSignedOut()
    const result = await updatePeople(INCIDENT_ID, {}, validFormData())
    expect(result.message).toMatch(/signed in/i)
    expect(mockPrisma.incident.findFirst).not.toHaveBeenCalled()
  })

  it('returns fieldErrors and attempts no DB write for a negative incidentRescueAnimal', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })
    const fd = new FormData()
    fd.set('incidentRescueAnimal', '-1')

    const result = await updatePeople(INCIDENT_ID, {}, fd)

    expect(result.errors).toBeDefined()
    expect(mockPrisma.incident.update).not.toHaveBeenCalled()
  })

  it('returns "not found" and attempts no DB write for a cross-tenant incident', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue(null)

    const result = await updatePeople(INCIDENT_ID, {}, validFormData())

    expect(result.message).toMatch(/not found/i)
    expect(mockPrisma.incident.update).not.toHaveBeenCalled()
  })

  it('saves and revalidates on the happy path', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })

    const result = await updatePeople(INCIDENT_ID, {}, validFormData())

    expect(mockPrisma.incident.update).toHaveBeenCalledWith({
      where: { id: INCIDENT_ID },
      data: { incidentPeoplePresent: true, incidentRescueAnimal: 2 }
    })
    expect(revalidatePath).toHaveBeenCalledWith(`/incidents/${INCIDENT_ID}/people-displacement`)
    expect(result.message).toBe('Saved.')
  })
})

describe('addDisplacement', () => {
  function validFormData() {
    const fd = new FormData()
    fd.append('causes', 'FIRE')
    fd.append('causes', 'SMOKE')
    return fd
  }

  it('returns a message and attempts no DB write when unauthenticated', async () => {
    mockSignedOut()
    const result = await addDisplacement(INCIDENT_ID, {}, validFormData())
    expect(result.message).toMatch(/signed in/i)
    expect(mockPrisma.incident.findFirst).not.toHaveBeenCalled()
  })

  it('returns fieldErrors and attempts no DB write for an empty causes array', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })

    const result = await addDisplacement(INCIDENT_ID, {}, new FormData())

    expect(result.errors).toBeDefined()
    expect(mockPrisma.incidentDisplacement.create).not.toHaveBeenCalled()
  })

  it('returns "not found" and attempts no DB write for a cross-tenant incident', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue(null)

    const result = await addDisplacement(INCIDENT_ID, {}, validFormData())

    expect(result.message).toMatch(/not found/i)
    expect(mockPrisma.incidentDisplacement.create).not.toHaveBeenCalled()
  })

  it('creates the displaced person and revalidates on the happy path', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })

    const result = await addDisplacement(INCIDENT_ID, {}, validFormData())

    expect(mockPrisma.incidentDisplacement.create).toHaveBeenCalledWith({
      data: { incidentId: INCIDENT_ID, causes: ['FIRE', 'SMOKE'] }
    })
    expect(revalidatePath).toHaveBeenCalledWith(`/incidents/${INCIDENT_ID}/people-displacement`)
    expect(result.message).toBe('Displaced person added.')
  })
})
