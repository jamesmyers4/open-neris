import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/current-user')
vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('@/test/helpers/prisma-mock')
  return { prisma: createPrismaMock() }
})
vi.mock('@/lib/incidents/get-submit-completeness')

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { submitIncident } from '@/app/incidents/[id]/actions'
import { getSubmitCompleteness } from '@/lib/incidents/get-submit-completeness'
import { mockSignedInAs, mockSignedOut } from '@/test/helpers/auth'
import { buildIncidentDetail } from '@/test/helpers/fixtures'
import { type MockPrismaClient } from '@/test/helpers/prisma-mock'

const mockPrisma = prisma as unknown as MockPrismaClient
const INCIDENT_ID = 'incident_1'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('submitIncident', () => {
  it('attempts no DB write when unauthenticated', async () => {
    mockSignedOut()

    await submitIncident(INCIDENT_ID)

    // getIncidentDetail's own prisma.incident.findFirst call is never reached.
    expect(mockPrisma.incident.findFirst).not.toHaveBeenCalled()
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('attempts no DB write for a cross-tenant (not found) incident', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue(null)

    await submitIncident(INCIDENT_ID)

    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('rejects when reviewStatus is not OPEN', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue(buildIncidentDetail({ id: INCIDENT_ID, reviewStatus: 'SUBMITTED' }))
    vi.mocked(getSubmitCompleteness).mockReturnValue({ complete: true, missing: [] })

    await submitIncident(INCIDENT_ID)

    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('rejects when the completeness gate reports incomplete', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue(buildIncidentDetail({ id: INCIDENT_ID, reviewStatus: 'OPEN' }))
    vi.mocked(getSubmitCompleteness).mockReturnValue({
      complete: false,
      missing: [{ module: 'core', path: 'narrativeOutcome', message: 'required' }]
    })

    await submitIncident(INCIDENT_ID)

    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('transitions reviewStatus and writes a ReviewEvent atomically on success', async () => {
    const user = mockSignedInAs({ id: 'user_1', departmentId: 'dept_1' })
    mockPrisma.incident.findFirst.mockResolvedValue(buildIncidentDetail({ id: INCIDENT_ID, reviewStatus: 'OPEN' }))
    vi.mocked(getSubmitCompleteness).mockReturnValue({ complete: true, missing: [] })
    mockPrisma.incident.update.mockResolvedValue({ id: INCIDENT_ID, reviewStatus: 'SUBMITTED' })
    mockPrisma.reviewEvent.create.mockResolvedValue({ id: 'review_event_1' })

    await submitIncident(INCIDENT_ID)

    expect(mockPrisma.incident.update).toHaveBeenCalledWith({
      where: { id: INCIDENT_ID },
      data: { reviewStatus: 'SUBMITTED' }
    })
    expect(mockPrisma.reviewEvent.create).toHaveBeenCalledWith({
      data: { incidentId: INCIDENT_ID, actorId: user.id, fromStatus: 'OPEN', toStatus: 'SUBMITTED' }
    })
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
    expect(revalidatePath).toHaveBeenCalledWith(`/incidents/${INCIDENT_ID}`)
  })

  it('propagates a failure from either half of the transaction rather than silently succeeding', async () => {
    // This can only assert error propagation through the mock, not a real
    // rollback (that needs a live DB — see Phase 4's journey test for the
    // real-transaction version of this same guarantee). What it does prove:
    // if reviewEvent.create fails, submitIncident's promise rejects instead
    // of resolving as if both writes had gone through.
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue(buildIncidentDetail({ id: INCIDENT_ID, reviewStatus: 'OPEN' }))
    vi.mocked(getSubmitCompleteness).mockReturnValue({ complete: true, missing: [] })
    mockPrisma.incident.update.mockResolvedValue({ id: INCIDENT_ID, reviewStatus: 'SUBMITTED' })
    mockPrisma.reviewEvent.create.mockRejectedValue(new Error('DB write failed'))

    await expect(submitIncident(INCIDENT_ID)).rejects.toThrow('DB write failed')
  })
})
