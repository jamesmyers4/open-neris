import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('@/test/helpers/prisma-mock')
  return { prisma: createPrismaMock() }
})
vi.mock('@/lib/neris/api-client')
vi.mock('@/lib/neris/build-incident-payload')

import { prisma } from '@/lib/prisma'
import { attemptNerisSubmission } from '@/lib/neris/submit-incident-to-neris'
import { buildIncidentPayload } from '@/lib/neris/build-incident-payload'
import { submitIncident as callNerisSubmit } from '@/lib/neris/api-client'
import { buildIncidentDetail } from '@/test/helpers/fixtures'
import { type MockPrismaClient } from '@/test/helpers/prisma-mock'

const mockPrisma = prisma as unknown as MockPrismaClient
const INCIDENT = buildIncidentDetail({ id: 'incident_1', reviewStatus: 'APPROVED' })
const DEPARTMENT = {
  id: 'dept_1',
  nerisFdId: 'FD24027334',
  nerisVendorClientId: 'client_1',
  nerisVendorSecretCipher: 'cipher_1',
  nerisEnvironment: 'SANDBOX'
} as const

beforeEach(() => {
  vi.resetAllMocks()
  mockPrisma.incident.updateMany.mockResolvedValue({ count: 1 })
})

describe('attemptNerisSubmission', () => {
  it('records a failed submission and never calls the API client when the payload cannot be built', async () => {
    vi.mocked(buildIncidentPayload).mockReturnValue({ ok: false, errors: ['dispatch call_arrival is missing'] })

    const outcome = await attemptNerisSubmission(prisma, INCIDENT, DEPARTMENT as never, 'APPROVAL_AUTO', 'user_1')

    expect(outcome).toBe('ERROR')
    expect(callNerisSubmit).not.toHaveBeenCalled()
    expect(mockPrisma.nerisSubmission.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        incidentId: INCIDENT.id,
        trigger: 'APPROVAL_AUTO',
        succeeded: false,
        responseBody: expect.objectContaining({ details: ['dispatch call_arrival is missing'] })
      })
    })
    expect(mockPrisma.incident.updateMany).toHaveBeenCalledWith({
      where: { id: INCIDENT.id, reviewStatus: 'APPROVED' },
      data: { reviewStatus: 'ERROR', nerisIncidentId: undefined }
    })
    expect(mockPrisma.reviewEvent.create).toHaveBeenCalledWith({
      data: { incidentId: INCIDENT.id, actorId: 'user_1', fromStatus: 'APPROVED', toStatus: 'ERROR' }
    })
  })

  it('records a failed submission without calling the API client when credentials are not configured', async () => {
    vi.mocked(buildIncidentPayload).mockReturnValue({ ok: true, payload: { base: {} } })

    const outcome = await attemptNerisSubmission(prisma, INCIDENT, { ...DEPARTMENT, nerisVendorClientId: null } as never, 'APPROVAL_AUTO', 'user_1')

    expect(outcome).toBe('ERROR')
    expect(callNerisSubmit).not.toHaveBeenCalled()
    expect(mockPrisma.nerisSubmission.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ succeeded: false, responseBody: expect.objectContaining({ error: expect.stringContaining('credentials') }) })
    })
  })

  it('marks the incident SENT and stores the returned neris_id on a 201', async () => {
    vi.mocked(buildIncidentPayload).mockReturnValue({ ok: true, payload: { base: {} } })
    vi.mocked(callNerisSubmit).mockResolvedValue({ status: 201, body: { neris_id: 'FD12345678|abc|123', incident_status: {} } })

    const outcome = await attemptNerisSubmission(prisma, INCIDENT, DEPARTMENT as never, 'APPROVAL_AUTO', 'user_1')

    expect(outcome).toBe('SENT')
    expect(callNerisSubmit).toHaveBeenCalledWith('SANDBOX', 'client_1', 'cipher_1', 'FD24027334', { base: {} })
    expect(mockPrisma.nerisSubmission.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ succeeded: true, responseStatus: 201 })
    })
    expect(mockPrisma.incident.updateMany).toHaveBeenCalledWith({
      where: { id: INCIDENT.id, reviewStatus: 'APPROVED' },
      data: { reviewStatus: 'SENT', nerisIncidentId: 'FD12345678|abc|123' }
    })
  })

  it('marks the incident ERROR on a non-201 (e.g. 422 validation error) response', async () => {
    vi.mocked(buildIncidentPayload).mockReturnValue({ ok: true, payload: { base: {} } })
    vi.mocked(callNerisSubmit).mockResolvedValue({ status: 422, body: { detail: [{ loc: ['body', 'base'], msg: 'field required', type: 'missing' }] } })

    const outcome = await attemptNerisSubmission(prisma, INCIDENT, DEPARTMENT as never, 'APPROVAL_AUTO', 'user_1')

    expect(outcome).toBe('ERROR')
    expect(mockPrisma.nerisSubmission.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ succeeded: false, responseStatus: 422 })
    })
    expect(mockPrisma.incident.updateMany).toHaveBeenCalledWith({
      where: { id: INCIDENT.id, reviewStatus: 'APPROVED' },
      data: { reviewStatus: 'ERROR', nerisIncidentId: undefined }
    })
  })

  it('marks the incident ERROR and records the message on a network failure, without throwing', async () => {
    vi.mocked(buildIncidentPayload).mockReturnValue({ ok: true, payload: { base: {} } })
    vi.mocked(callNerisSubmit).mockRejectedValue(new Error('fetch failed'))

    const outcome = await attemptNerisSubmission(prisma, INCIDENT, DEPARTMENT as never, 'APPROVAL_AUTO', 'user_1')

    expect(outcome).toBe('ERROR')
    expect(mockPrisma.nerisSubmission.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ succeeded: false, responseBody: { error: 'fetch failed' } })
    })
  })

  it('writes no ReviewEvent when the incident status changed underneath it (lost the race)', async () => {
    vi.mocked(buildIncidentPayload).mockReturnValue({ ok: true, payload: { base: {} } })
    vi.mocked(callNerisSubmit).mockResolvedValue({ status: 201, body: { neris_id: 'FD12345678|abc|123' } })
    mockPrisma.incident.updateMany.mockResolvedValue({ count: 0 })

    await attemptNerisSubmission(prisma, INCIDENT, DEPARTMENT as never, 'APPROVAL_AUTO', 'user_1')

    expect(mockPrisma.reviewEvent.create).not.toHaveBeenCalled()
  })

  it('writes no ReviewEvent for a scheduled-sweep trigger with no human actor', async () => {
    vi.mocked(buildIncidentPayload).mockReturnValue({ ok: true, payload: { base: {} } })
    vi.mocked(callNerisSubmit).mockResolvedValue({ status: 201, body: { neris_id: 'FD12345678|abc|123' } })

    await attemptNerisSubmission(prisma, INCIDENT, DEPARTMENT as never, 'SCHEDULED_SWEEP', null)

    expect(mockPrisma.nerisSubmission.create).toHaveBeenCalledWith({ data: expect.objectContaining({ trigger: 'SCHEDULED_SWEEP' }) })
    expect(mockPrisma.reviewEvent.create).not.toHaveBeenCalled()
  })

  it('uses ERROR as the fromStatus when resending a previously-failed incident', async () => {
    const errored = buildIncidentDetail({ id: 'incident_2', reviewStatus: 'ERROR' })
    vi.mocked(buildIncidentPayload).mockReturnValue({ ok: true, payload: { base: {} } })
    vi.mocked(callNerisSubmit).mockResolvedValue({ status: 201, body: { neris_id: 'FD12345678|abc|124' } })

    await attemptNerisSubmission(prisma, errored, DEPARTMENT as never, 'MANUAL_RESEND', 'user_1')

    expect(mockPrisma.incident.updateMany).toHaveBeenCalledWith({
      where: { id: 'incident_2', reviewStatus: 'ERROR' },
      data: { reviewStatus: 'SENT', nerisIncidentId: 'FD12345678|abc|124' }
    })
    expect(mockPrisma.reviewEvent.create).toHaveBeenCalledWith({
      data: { incidentId: 'incident_2', actorId: 'user_1', fromStatus: 'ERROR', toStatus: 'SENT' }
    })
  })
})
