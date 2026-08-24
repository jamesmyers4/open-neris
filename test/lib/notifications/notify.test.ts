import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('@/test/helpers/prisma-mock')
  return { prisma: createPrismaMock() }
})

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn().mockResolvedValue({}) }))
vi.mock('resend', () => {
  class FakeResend {
    emails = { send: mockSend }
  }
  return { Resend: FakeResend }
})

import { prisma } from '@/lib/prisma'
import { notifySubmittedNeedsReview, notifyReviewedNeedsApproval, notifyKickedBack } from '@/lib/notifications/notify'
import { type MockPrismaClient } from '@/test/helpers/prisma-mock'

const mockPrisma = prisma as unknown as MockPrismaClient
const INCIDENT = { id: 'incident_1', internalId: '2026-000001', departmentId: 'dept_1' }

beforeEach(() => {
  vi.resetAllMocks()
  mockSend.mockResolvedValue({})
})

describe('notifySubmittedNeedsReview', () => {
  it('is correctly skipped entirely for a genuinely solo department — no Notification row, no email', async () => {
    mockPrisma.user.count.mockResolvedValue(1)
    mockPrisma.user.findMany.mockResolvedValue([{ id: 'admin_1', email: 'admin@example.com', role: 'ADMIN' }])

    await notifySubmittedNeedsReview(prisma, INCIDENT, 'admin_1')

    expect(mockPrisma.notification.createMany).not.toHaveBeenCalled()
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('sends a Notification row and an email to each eligible reviewer, excluding the actor, in a multi-user department', async () => {
    mockPrisma.user.count.mockResolvedValue(3)
    mockPrisma.user.findMany
      .mockResolvedValueOnce([
        { id: 'officer_1', email: 'officer@example.com', role: 'OFFICER' },
        { id: 'chief_1', email: 'chief@example.com', role: 'CHIEF' }
      ])
      .mockResolvedValueOnce([
        { id: 'officer_1', email: 'officer@example.com', role: 'OFFICER' },
        { id: 'chief_1', email: 'chief@example.com', role: 'CHIEF' }
      ])

    await notifySubmittedNeedsReview(prisma, INCIDENT, 'member_1')

    expect(mockPrisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        { userId: 'officer_1', incidentId: INCIDENT.id, type: 'SUBMITTED_NEEDS_REVIEW' },
        { userId: 'chief_1', incidentId: INCIDENT.id, type: 'SUBMITTED_NEEDS_REVIEW' }
      ]
    })
    expect(mockSend).toHaveBeenCalledTimes(2)
  })

  it('excludes MEMBER users from the recipient list (only OFFICER/CHIEF/ADMIN can review)', async () => {
    mockPrisma.user.count.mockResolvedValue(2)
    mockPrisma.user.findMany.mockResolvedValue([{ id: 'member_2', email: 'other-member@example.com', role: 'MEMBER' }])

    await notifySubmittedNeedsReview(prisma, INCIDENT, 'member_1')

    expect(mockPrisma.notification.createMany).not.toHaveBeenCalled()
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('swallows a Prisma failure rather than throwing, since this is a best-effort side effect', async () => {
    mockPrisma.user.count.mockRejectedValue(new Error('DB unavailable'))

    await expect(notifySubmittedNeedsReview(prisma, INCIDENT, 'member_1')).resolves.toBeUndefined()
  })

  it('swallows an email-send failure for one recipient without preventing Notification rows from being written', async () => {
    mockPrisma.user.count.mockResolvedValue(2)
    mockPrisma.user.findMany
      .mockResolvedValueOnce([{ id: 'officer_1', email: 'officer@example.com', role: 'OFFICER' }])
      .mockResolvedValueOnce([{ id: 'officer_1', email: 'officer@example.com', role: 'OFFICER' }])
    mockSend.mockRejectedValue(new Error('Resend API down'))

    await expect(notifySubmittedNeedsReview(prisma, INCIDENT, 'member_1')).resolves.toBeUndefined()
    expect(mockPrisma.notification.createMany).toHaveBeenCalled()
  })
})

describe('notifyReviewedNeedsApproval', () => {
  it('is correctly skipped for a solo department', async () => {
    mockPrisma.user.count.mockResolvedValue(1)

    await notifyReviewedNeedsApproval(prisma, INCIDENT, 'admin_1')

    expect(mockPrisma.notification.createMany).not.toHaveBeenCalled()
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('only notifies CHIEF/ADMIN (not OFFICER, who cannot approve) in a multi-user department', async () => {
    mockPrisma.user.count.mockResolvedValue(3)
    mockPrisma.user.findMany
      .mockResolvedValueOnce([
        { id: 'officer_1', email: 'officer@example.com', role: 'OFFICER' },
        { id: 'chief_1', email: 'chief@example.com', role: 'CHIEF' }
      ])
      .mockResolvedValueOnce([{ id: 'chief_1', email: 'chief@example.com', role: 'CHIEF' }])

    await notifyReviewedNeedsApproval(prisma, INCIDENT, 'officer_2')

    expect(mockPrisma.notification.createMany).toHaveBeenCalledWith({
      data: [{ userId: 'chief_1', incidentId: INCIDENT.id, type: 'REVIEWED_NEEDS_APPROVAL' }]
    })
    expect(mockSend).toHaveBeenCalledTimes(1)
  })
})

describe('notifyKickedBack', () => {
  it('is correctly skipped for a solo department', async () => {
    mockPrisma.user.count.mockResolvedValue(1)

    await notifyKickedBack(prisma, INCIDENT, 'submitter_1', 'submitter_1')

    expect(mockPrisma.notification.createMany).not.toHaveBeenCalled()
  })

  it('notifies only the original submitter in a multi-user department', async () => {
    mockPrisma.user.count.mockResolvedValue(2)
    mockPrisma.user.findMany.mockResolvedValue([{ id: 'submitter_1', email: 'submitter@example.com', role: 'MEMBER' }])

    await notifyKickedBack(prisma, INCIDENT, 'submitter_1', 'officer_1')

    expect(mockPrisma.notification.createMany).toHaveBeenCalledWith({
      data: [{ userId: 'submitter_1', incidentId: INCIDENT.id, type: 'KICKED_BACK' }]
    })
    expect(mockSend).toHaveBeenCalledTimes(1)
  })

  it('sends nothing when the submitter kicked back their own incident (solo-department role-permissive case)', async () => {
    await notifyKickedBack(prisma, INCIDENT, 'solo_admin', 'solo_admin')

    expect(mockPrisma.user.count).not.toHaveBeenCalled()
    expect(mockPrisma.notification.createMany).not.toHaveBeenCalled()
  })
})
