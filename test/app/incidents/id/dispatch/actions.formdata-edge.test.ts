import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/current-user')
vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('@/test/helpers/prisma-mock')
  return { prisma: createPrismaMock() }
})

import { prisma } from '@/lib/prisma'
import { updateDispatch, addDispatchComment } from '@/app/incidents/[id]/dispatch/actions'
import { mockSignedInAs } from '@/test/helpers/auth'
import { type MockPrismaClient } from '@/test/helpers/prisma-mock'

const mockPrisma = prisma as unknown as MockPrismaClient
const INCIDENT_ID = 'incident_1'

beforeEach(() => {
  vi.resetAllMocks()
})

// Phase 5: malformed/partial FormData — key entirely absent vs present-but-empty
// vs explicit null.
describe('updateDispatch — malformed/partial FormData', () => {
  it('nulls out every field when the entire FormData is empty (all fields optional, absent === present-but-empty)', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })

    const result = await updateDispatch(INCIDENT_ID, {}, new FormData())

    expect(mockPrisma.incident.update).toHaveBeenCalledWith({
      where: { id: INCIDENT_ID },
      data: {
        dispatchTimeCallArrival: null,
        dispatchTimeCallAnswer: null,
        dispatchTimeCallCreate: null,
        timeIncidentClear: null,
        dispatchAutomaticAlarm: null,
        dispatchDeterminateCode: null,
        dispatchIncidentCode: null,
        dispatchFinalDisposition: null
      }
    })
    expect(result.message).toBe('Saved.')
  })

  it('coerces any non-empty, non-"true" dispatchAutomaticAlarm value to false rather than rejecting it (documents current parsing — the real UI only ever sends "true"/"false" via a <select>)', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })
    const fd = new FormData()
    fd.set('dispatchAutomaticAlarm', 'yes')

    const result = await updateDispatch(INCIDENT_ID, {}, fd)

    expect(mockPrisma.incident.update).toHaveBeenCalledWith({
      where: { id: INCIDENT_ID },
      data: expect.objectContaining({ dispatchAutomaticAlarm: false })
    })
    expect(result.message).toBe('Saved.')
  })
})

describe('addDispatchComment — malformed/partial FormData', () => {
  it('returns fieldErrors and attempts no DB write when comment is entirely absent (no `|| undefined` fallback — schema sees null, not undefined)', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })
    const fd = new FormData()
    fd.set('timestamp', '2026-01-01T00:00:00Z')

    const result = await addDispatchComment(INCIDENT_ID, {}, fd)

    expect(result.errors).toBeDefined()
    expect(mockPrisma.incidentDispatchComment.create).not.toHaveBeenCalled()
  })

  // Flagged finding, not a bug fix in this pass (see TESTING.md's Phase 5
  // section): same z.coerce.date()-on-null quirk as createIncident's
  // alarmTime. `timestamp: formData.get('timestamp')` has no `|| undefined`
  // fallback, so an absent key becomes `null`, which z.coerce.date()
  // silently coerces to the Unix epoch instead of failing validation.
  it('silently defaults to the Unix epoch when timestamp is entirely absent, rather than rejecting (coercion quirk — see TESTING.md)', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })
    const fd = new FormData()
    fd.set('comment', 'Crew on scene')

    const result = await addDispatchComment(INCIDENT_ID, {}, fd)

    expect(mockPrisma.incidentDispatchComment.create).toHaveBeenCalledWith({
      data: { incidentId: INCIDENT_ID, comment: 'Crew on scene', timestamp: new Date('1970-01-01T00:00:00Z') }
    })
    expect(result.message).toBe('Comment added.')
  })
})
