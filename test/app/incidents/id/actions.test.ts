import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/current-user')
vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('@/test/helpers/prisma-mock')
  return { prisma: createPrismaMock() }
})
vi.mock('@/lib/incidents/get-submit-completeness')

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { submitIncident, markReviewed, approveIncident } from '@/app/incidents/[id]/actions'
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
    mockPrisma.incident.updateMany.mockResolvedValue({ count: 1 })
    mockPrisma.reviewEvent.create.mockResolvedValue({ id: 'review_event_1' })

    await submitIncident(INCIDENT_ID)

    expect(mockPrisma.incident.updateMany).toHaveBeenCalledWith({
      where: { id: INCIDENT_ID, reviewStatus: 'OPEN' },
      data: { reviewStatus: 'SUBMITTED' }
    })
    expect(mockPrisma.reviewEvent.create).toHaveBeenCalledWith({
      data: { incidentId: INCIDENT_ID, actorId: user.id, fromStatus: 'OPEN', toStatus: 'SUBMITTED' }
    })
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
    expect(revalidatePath).toHaveBeenCalledWith(`/incidents/${INCIDENT_ID}`)
  })

  // Fixed in Phase 7 (see TESTING.md): submitIncident now re-checks
  // reviewStatus at write time via a conditional updateMany, rather than
  // writing unconditionally after an application-code-only OPEN check. This
  // characterizes the losing side of that race — a request that read OPEN
  // but lost the write to another request in between.
  it('writes no ReviewEvent and does not revalidate when updateMany affects zero rows (lost the optimistic-locking race)', async () => {
    mockSignedInAs({ id: 'user_1', departmentId: 'dept_1' })
    mockPrisma.incident.findFirst.mockResolvedValue(buildIncidentDetail({ id: INCIDENT_ID, reviewStatus: 'OPEN' }))
    vi.mocked(getSubmitCompleteness).mockReturnValue({ complete: true, missing: [] })
    mockPrisma.incident.updateMany.mockResolvedValue({ count: 0 })

    await submitIncident(INCIDENT_ID)

    expect(mockPrisma.reviewEvent.create).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
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
    mockPrisma.incident.updateMany.mockResolvedValue({ count: 1 })
    mockPrisma.reviewEvent.create.mockRejectedValue(new Error('DB write failed'))

    await expect(submitIncident(INCIDENT_ID)).rejects.toThrow('DB write failed')
  })
})

describe('markReviewed', () => {
  it('attempts no DB write when unauthenticated', async () => {
    mockSignedOut()
    await markReviewed(INCIDENT_ID)
    expect(mockPrisma.incident.findFirst).not.toHaveBeenCalled()
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('attempts no DB write for a MEMBER (cannot review)', async () => {
    mockSignedInAs({ role: 'MEMBER' })
    await markReviewed(INCIDENT_ID)
    expect(mockPrisma.incident.findFirst).not.toHaveBeenCalled()
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('attempts no DB write for a cross-tenant (not found) incident', async () => {
    mockSignedInAs({ role: 'OFFICER' })
    mockPrisma.incident.findFirst.mockResolvedValue(null)
    await markReviewed(INCIDENT_ID)
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('rejects when reviewStatus is not SUBMITTED', async () => {
    mockSignedInAs({ role: 'OFFICER' })
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID, reviewStatus: 'OPEN' })
    await markReviewed(INCIDENT_ID)
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('transitions SUBMITTED to REVIEWED and writes a ReviewEvent for an OFFICER', async () => {
    const user = mockSignedInAs({ id: 'user_1', departmentId: 'dept_1', role: 'OFFICER' })
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID, reviewStatus: 'SUBMITTED' })
    mockPrisma.incident.updateMany.mockResolvedValue({ count: 1 })

    await markReviewed(INCIDENT_ID)

    expect(mockPrisma.incident.updateMany).toHaveBeenCalledWith({
      where: { id: INCIDENT_ID, reviewStatus: 'SUBMITTED' },
      data: { reviewStatus: 'REVIEWED', reviewedById: user.id }
    })
    expect(mockPrisma.reviewEvent.create).toHaveBeenCalledWith({
      data: { incidentId: INCIDENT_ID, actorId: user.id, fromStatus: 'SUBMITTED', toStatus: 'REVIEWED' }
    })
    expect(revalidatePath).toHaveBeenCalledWith(`/incidents/${INCIDENT_ID}`)
    expect(revalidatePath).toHaveBeenCalledWith('/incidents/review')
  })

  it('allows an ADMIN to review too (solo-department fast path)', async () => {
    mockSignedInAs({ role: 'ADMIN' })
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID, reviewStatus: 'SUBMITTED' })
    mockPrisma.incident.updateMany.mockResolvedValue({ count: 1 })

    await markReviewed(INCIDENT_ID)

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it('writes no ReviewEvent when updateMany affects zero rows (lost the race)', async () => {
    mockSignedInAs({ role: 'OFFICER' })
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID, reviewStatus: 'SUBMITTED' })
    mockPrisma.incident.updateMany.mockResolvedValue({ count: 0 })

    await markReviewed(INCIDENT_ID)

    expect(mockPrisma.reviewEvent.create).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe('approveIncident', () => {
  it('attempts no DB write when unauthenticated', async () => {
    mockSignedOut()
    await approveIncident(INCIDENT_ID)
    expect(mockPrisma.incident.findFirst).not.toHaveBeenCalled()
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('attempts no DB write for an OFFICER (cannot approve)', async () => {
    mockSignedInAs({ role: 'OFFICER' })
    await approveIncident(INCIDENT_ID)
    expect(mockPrisma.incident.findFirst).not.toHaveBeenCalled()
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('rejects when reviewStatus is not REVIEWED', async () => {
    mockSignedInAs({ role: 'CHIEF' })
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID, reviewStatus: 'SUBMITTED' })
    await approveIncident(INCIDENT_ID)
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('transitions REVIEWED to APPROVED and writes a ReviewEvent for a CHIEF', async () => {
    const user = mockSignedInAs({ id: 'user_1', departmentId: 'dept_1', role: 'CHIEF' })
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID, reviewStatus: 'REVIEWED' })
    mockPrisma.incident.updateMany.mockResolvedValue({ count: 1 })

    await approveIncident(INCIDENT_ID)

    expect(mockPrisma.incident.updateMany).toHaveBeenCalledWith({
      where: { id: INCIDENT_ID, reviewStatus: 'REVIEWED' },
      data: { reviewStatus: 'APPROVED', approvedById: user.id }
    })
    expect(mockPrisma.reviewEvent.create).toHaveBeenCalledWith({
      data: { incidentId: INCIDENT_ID, actorId: user.id, fromStatus: 'REVIEWED', toStatus: 'APPROVED' }
    })
    expect(revalidatePath).toHaveBeenCalledWith(`/incidents/${INCIDENT_ID}`)
    expect(revalidatePath).toHaveBeenCalledWith('/incidents/review')
  })

  it('allows an ADMIN to approve too (solo-department fast path)', async () => {
    mockSignedInAs({ role: 'ADMIN' })
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID, reviewStatus: 'REVIEWED' })
    mockPrisma.incident.updateMany.mockResolvedValue({ count: 1 })

    await approveIncident(INCIDENT_ID)

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
  })
})
