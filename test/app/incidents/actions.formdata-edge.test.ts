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
import { mockSignedInAs } from '@/test/helpers/auth'
import type { MockPrismaClient } from '@/test/helpers/prisma-mock'

const mockPrisma = prisma as unknown as MockPrismaClient

function baseFormData() {
  const fd = new FormData()
  fd.set('typesJson', JSON.stringify([{ value1: 'FIRE', isPrimary: true }]))
  fd.set('alarmTime', '2026-01-01T00:00:00Z')
  return fd
}

// Phase 5: malformed/partial FormData — key entirely absent vs present-but-empty
// vs explicit null, for the createIncident action specifically.
describe('createIncident — malformed/partial FormData', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockSignedInAs({ departmentId: 'dept_1', id: 'user_1' })
    mockPrisma.department.findUniqueOrThrow.mockResolvedValue({
      id: 'dept_1',
      internalIdMode: 'YEAR_SEQUENTIAL',
      internalIdTemplate: null
    })
    vi.mocked(generateInternalId).mockResolvedValue('2026-000001')
    mockPrisma.incident.create.mockResolvedValue({ id: 'incident_new_1' })
  })

  it('returns fieldErrors (not the malformed-JSON message) when typesJson is entirely absent — defaults to "[]", which then fails min(1)', async () => {
    const fd = baseFormData()
    fd.delete('typesJson')

    const result = await createIncident({}, fd)

    expect(result.errors).toBeDefined()
    expect(result.message).not.toMatch(/invalid incident type/i)
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  // Fixed in Phase 7 (see TESTING.md): createIncident's raw payload now
  // reads `formData.get('alarmTime') || undefined`, matching every other
  // date field in this codebase. An entirely-absent alarmTime now fails
  // validation instead of z.coerce.date() silently coercing null to the
  // Unix epoch.
  it('returns fieldErrors and attempts no DB write when alarmTime is entirely absent', async () => {
    const fd = baseFormData()
    fd.delete('alarmTime')

    const result = await createIncident({}, fd)

    expect(result.errors).toBeDefined()
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })

  it('returns fieldErrors and attempts no DB write when alarmTime is a non-string File value', async () => {
    const fd = baseFormData()
    fd.set('alarmTime', new File(['x'], 'not-a-date.txt'))

    const result = await createIncident({}, fd)

    expect(result.errors).toBeDefined()
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('treats an entirely-absent specialModifiers the same as present-but-empty (getAll returns [] either way)', async () => {
    const fd = baseFormData()
    // Neither .set nor .append called for specialModifiers — key is absent.

    await createIncident({}, fd)

    expect(mockPrisma.incident.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ specialModifiers: [] })
    })
  })
})
