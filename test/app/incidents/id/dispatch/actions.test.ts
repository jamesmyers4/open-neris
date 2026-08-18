import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/current-user')
vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('@/test/helpers/prisma-mock')
  return { prisma: createPrismaMock() }
})

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { updateDispatch, addDispatchComment } from '@/app/incidents/[id]/dispatch/actions'
import { mockSignedInAs, mockSignedOut } from '@/test/helpers/auth'
import { type MockPrismaClient } from '@/test/helpers/prisma-mock'

const mockPrisma = prisma as unknown as MockPrismaClient
const INCIDENT_ID = 'incident_1'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('updateDispatch', () => {
  function validFormData() {
    const fd = new FormData()
    fd.set('dispatchTimeCallArrival', '2026-01-01T00:00:00Z')
    fd.set('dispatchTimeCallAnswer', '2026-01-01T00:01:00Z')
    fd.set('dispatchTimeCallCreate', '2026-01-01T00:02:00Z')
    return fd
  }

  it('returns a message and attempts no DB write when unauthenticated', async () => {
    mockSignedOut()
    const result = await updateDispatch(INCIDENT_ID, {}, validFormData())
    expect(result.message).toMatch(/signed in/i)
    expect(mockPrisma.incident.findFirst).not.toHaveBeenCalled()
  })

  it('returns fieldErrors and attempts no DB write for a bad chronology', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })
    const fd = new FormData()
    fd.set('dispatchTimeCallArrival', '2026-01-01T00:02:00Z')
    fd.set('dispatchTimeCallCreate', '2026-01-01T00:00:00Z')

    const result = await updateDispatch(INCIDENT_ID, {}, fd)

    expect(result.errors).toBeDefined()
    expect(mockPrisma.incident.update).not.toHaveBeenCalled()
  })

  it('returns "not found" and attempts no DB write for a cross-tenant incident', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue(null)

    const result = await updateDispatch(INCIDENT_ID, {}, validFormData())

    expect(result.message).toMatch(/not found/i)
    expect(mockPrisma.incident.update).not.toHaveBeenCalled()
  })

  it('saves and revalidates on the happy path', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })

    const result = await updateDispatch(INCIDENT_ID, {}, validFormData())

    expect(mockPrisma.incident.update).toHaveBeenCalledWith({
      where: { id: INCIDENT_ID },
      data: expect.objectContaining({
        dispatchTimeCallArrival: new Date('2026-01-01T00:00:00Z'),
        dispatchTimeCallAnswer: new Date('2026-01-01T00:01:00Z'),
        dispatchTimeCallCreate: new Date('2026-01-01T00:02:00Z')
      })
    })
    expect(revalidatePath).toHaveBeenCalledWith(`/incidents/${INCIDENT_ID}/dispatch`)
    expect(result.message).toBe('Saved.')
  })
})

describe('addDispatchComment', () => {
  function validFormData() {
    const fd = new FormData()
    fd.set('comment', 'Crew on scene')
    fd.set('timestamp', '2026-01-01T00:00:00Z')
    return fd
  }

  it('returns a message and attempts no DB write when unauthenticated', async () => {
    mockSignedOut()
    const result = await addDispatchComment(INCIDENT_ID, {}, validFormData())
    expect(result.message).toMatch(/signed in/i)
    expect(mockPrisma.incident.findFirst).not.toHaveBeenCalled()
  })

  it('returns fieldErrors and attempts no DB write for an empty comment', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })
    const fd = new FormData()
    fd.set('comment', '')
    fd.set('timestamp', '2026-01-01T00:00:00Z')

    const result = await addDispatchComment(INCIDENT_ID, {}, fd)

    expect(result.errors).toBeDefined()
    expect(mockPrisma.incidentDispatchComment.create).not.toHaveBeenCalled()
  })

  it('returns "not found" and attempts no DB write for a cross-tenant incident', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue(null)

    const result = await addDispatchComment(INCIDENT_ID, {}, validFormData())

    expect(result.message).toMatch(/not found/i)
    expect(mockPrisma.incidentDispatchComment.create).not.toHaveBeenCalled()
  })

  it('creates the comment and revalidates on the happy path', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })

    const result = await addDispatchComment(INCIDENT_ID, {}, validFormData())

    expect(mockPrisma.incidentDispatchComment.create).toHaveBeenCalledWith({
      data: { incidentId: INCIDENT_ID, comment: 'Crew on scene', timestamp: new Date('2026-01-01T00:00:00Z') }
    })
    expect(revalidatePath).toHaveBeenCalledWith(`/incidents/${INCIDENT_ID}/dispatch`)
    expect(result.message).toBe('Comment added.')
  })
})
