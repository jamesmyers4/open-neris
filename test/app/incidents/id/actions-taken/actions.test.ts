import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/current-user')
vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('@/test/helpers/prisma-mock')
  return { prisma: createPrismaMock() }
})

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { setNoActionReason, addActionTaken, removeActionTaken } from '@/app/incidents/[id]/actions-taken/actions'
import { mockSignedInAs, mockSignedOut } from '@/test/helpers/auth'
import { type MockPrismaClient } from '@/test/helpers/prisma-mock'

const mockPrisma = prisma as unknown as MockPrismaClient
const INCIDENT_ID = 'incident_1'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('setNoActionReason', () => {
  function validFormData() {
    const fd = new FormData()
    fd.set('incidentNoActionReason', 'CANCELLED')
    return fd
  }

  it('returns a message and attempts no DB write when unauthenticated', async () => {
    mockSignedOut()
    const result = await setNoActionReason(INCIDENT_ID, {}, validFormData())
    expect(result.message).toMatch(/signed in/i)
    expect(mockPrisma.incident.findFirst).not.toHaveBeenCalled()
  })

  it('returns fieldErrors and attempts no DB write for an invalid reason', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID, actionsTaken: [] })
    const fd = new FormData()
    fd.set('incidentNoActionReason', 'NOT_A_REAL_REASON')

    const result = await setNoActionReason(INCIDENT_ID, {}, fd)

    expect(result.errors).toBeDefined()
    expect(mockPrisma.incident.update).not.toHaveBeenCalled()
  })

  it('returns "not found" and attempts no DB write for a cross-tenant incident', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue(null)

    const result = await setNoActionReason(INCIDENT_ID, {}, validFormData())

    expect(result.message).toMatch(/not found/i)
    expect(mockPrisma.incident.update).not.toHaveBeenCalled()
  })

  it('rejects when actionsTaken entries already exist (mutual exclusivity)', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID, actionsTaken: [{ id: 'a1' }] })

    const result = await setNoActionReason(INCIDENT_ID, {}, validFormData())

    expect(result.message).toMatch(/remove all actions taken/i)
    expect(mockPrisma.incident.update).not.toHaveBeenCalled()
  })

  it('saves the reason and revalidates on the happy path', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID, actionsTaken: [] })

    const result = await setNoActionReason(INCIDENT_ID, {}, validFormData())

    expect(mockPrisma.incident.update).toHaveBeenCalledWith({
      where: { id: INCIDENT_ID },
      data: { incidentNoActionReason: 'CANCELLED' }
    })
    expect(revalidatePath).toHaveBeenCalledWith(`/incidents/${INCIDENT_ID}/actions-taken`)
    expect(result.message).toBe('Saved.')
  })
})

describe('addActionTaken', () => {
  function validFormData() {
    const fd = new FormData()
    fd.set('value1', 'FORCIBLE_ENTRY')
    return fd
  }

  it('returns a message and attempts no DB write when unauthenticated', async () => {
    mockSignedOut()
    const result = await addActionTaken(INCIDENT_ID, {}, validFormData())
    expect(result.message).toMatch(/signed in/i)
    expect(mockPrisma.incident.findFirst).not.toHaveBeenCalled()
  })

  it('returns fieldErrors and attempts no DB write for an invalid value1', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID, actionsTaken: [], incidentNoActionReason: null })
    const fd = new FormData()
    fd.set('value1', 'NOT_A_REAL_ACTION')

    const result = await addActionTaken(INCIDENT_ID, {}, fd)

    expect(result.errors).toBeDefined()
    expect(mockPrisma.incidentActionTaken.create).not.toHaveBeenCalled()
  })

  it('returns "not found" and attempts no DB write for a cross-tenant incident', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue(null)

    const result = await addActionTaken(INCIDENT_ID, {}, validFormData())

    expect(result.message).toMatch(/not found/i)
    expect(mockPrisma.incidentActionTaken.create).not.toHaveBeenCalled()
  })

  it('rejects when a no-action reason is already set (mutual exclusivity)', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID, actionsTaken: [], incidentNoActionReason: 'CANCELLED' })

    const result = await addActionTaken(INCIDENT_ID, {}, validFormData())

    expect(result.message).toMatch(/clear the no-action reason/i)
    expect(mockPrisma.incidentActionTaken.create).not.toHaveBeenCalled()
  })

  it('creates the entry with the next sortOrder and revalidates on the happy path', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({
      id: INCIDENT_ID,
      actionsTaken: [{ id: 'existing-1' }, { id: 'existing-2' }],
      incidentNoActionReason: null
    })

    const result = await addActionTaken(INCIDENT_ID, {}, validFormData())

    expect(mockPrisma.incidentActionTaken.create).toHaveBeenCalledWith({
      data: { incidentId: INCIDENT_ID, value1: 'FORCIBLE_ENTRY', value2: undefined, sortOrder: 2 }
    })
    expect(revalidatePath).toHaveBeenCalledWith(`/incidents/${INCIDENT_ID}/actions-taken`)
    expect(result.message).toBe('Action added.')
  })
})

describe('removeActionTaken', () => {
  const ACTION_TAKEN_ID = 'action_1'

  it('attempts no DB write when unauthenticated', async () => {
    mockSignedOut()
    await removeActionTaken(INCIDENT_ID, ACTION_TAKEN_ID)
    expect(mockPrisma.incidentActionTaken.findFirst).not.toHaveBeenCalled()
  })

  it('attempts no delete when the entry does not exist under the caller\'s department (cross-tenant or wrong incident)', async () => {
    mockSignedInAs()
    mockPrisma.incidentActionTaken.findFirst.mockResolvedValue(null)

    await removeActionTaken(INCIDENT_ID, ACTION_TAKEN_ID)

    expect(mockPrisma.incidentActionTaken.findFirst).toHaveBeenCalledWith({
      where: { id: ACTION_TAKEN_ID, incidentId: INCIDENT_ID, incident: { departmentId: expect.any(String) } }
    })
    expect(mockPrisma.incidentActionTaken.delete).not.toHaveBeenCalled()
  })

  it('deletes the entry and revalidates on the happy path', async () => {
    mockSignedInAs()
    mockPrisma.incidentActionTaken.findFirst.mockResolvedValue({ id: ACTION_TAKEN_ID, incidentId: INCIDENT_ID })

    await removeActionTaken(INCIDENT_ID, ACTION_TAKEN_ID)

    expect(mockPrisma.incidentActionTaken.delete).toHaveBeenCalledWith({ where: { id: ACTION_TAKEN_ID } })
    expect(revalidatePath).toHaveBeenCalledWith(`/incidents/${INCIDENT_ID}/actions-taken`)
  })
})
