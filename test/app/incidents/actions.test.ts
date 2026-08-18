import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/current-user')
vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('@/test/helpers/prisma-mock')
  return { prisma: createPrismaMock() }
})
vi.mock('@/lib/incidents/generate-internal-id')

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { generateInternalId } from '@/lib/incidents/generate-internal-id'
import { createIncident } from '@/app/incidents/actions'
import { mockSignedInAs, mockSignedOut } from '@/test/helpers/auth'
import type { MockPrismaClient } from '@/test/helpers/prisma-mock'

const mockPrisma = prisma as unknown as MockPrismaClient

function validFormData(overrides: Record<string, string | string[]> = {}) {
  const fd = new FormData()
  fd.set('typesJson', JSON.stringify([{ value1: 'FIRE', isPrimary: true }]))
  fd.set('alarmTime', '2026-01-01T00:00:00Z')
  for (const [key, value] of Object.entries(overrides)) {
    if (Array.isArray(value)) {
      for (const v of value) fd.append(key, v)
    } else {
      fd.set(key, value)
    }
  }
  return fd
}

describe('createIncident', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns a message and attempts no DB write when unauthenticated', async () => {
    mockSignedOut()

    const result = await createIncident({}, validFormData())

    expect(result.message).toMatch(/signed in/i)
    expect(mockPrisma.department.findUniqueOrThrow).not.toHaveBeenCalled()
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('returns fieldErrors and attempts no DB write for invalid FormData', async () => {
    mockSignedInAs()

    const result = await createIncident({}, validFormData({ alarmTime: '' }))

    expect(result.errors).toBeDefined()
    expect(mockPrisma.department.findUniqueOrThrow).not.toHaveBeenCalled()
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('returns a message and attempts no DB write when typesJson is malformed JSON', async () => {
    mockSignedInAs()
    const fd = validFormData()
    fd.set('typesJson', '{not valid json')

    const result = await createIncident({}, fd)

    expect(result.message).toMatch(/invalid incident type/i)
    expect(mockPrisma.department.findUniqueOrThrow).not.toHaveBeenCalled()
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('creates the incident and redirects to it on the happy path', async () => {
    const user = mockSignedInAs({ departmentId: 'dept_1', id: 'user_1' })
    mockPrisma.department.findUniqueOrThrow.mockResolvedValue({
      id: 'dept_1',
      internalIdMode: 'YEAR_SEQUENTIAL',
      internalIdTemplate: null
    })
    vi.mocked(generateInternalId).mockResolvedValue('2026-000001')
    mockPrisma.incident.create.mockResolvedValue({ id: 'incident_new_1' })

    await createIncident({}, validFormData())

    expect(mockPrisma.incident.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        departmentId: user.departmentId,
        createdById: user.id,
        internalId: '2026-000001',
        types: { create: [expect.objectContaining({ value1: 'FIRE', isPrimary: true, sortOrder: 0 })] }
      })
    })
    expect(redirect).toHaveBeenCalledWith('/incidents/incident_new_1')
  })
})
