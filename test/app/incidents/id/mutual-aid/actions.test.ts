import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/current-user')
vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('@/test/helpers/prisma-mock')
  return { prisma: createPrismaMock() }
})

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { updateMutualAid } from '@/app/incidents/[id]/mutual-aid/actions'
import { mockSignedInAs, mockSignedOut } from '@/test/helpers/auth'
import { type MockPrismaClient } from '@/test/helpers/prisma-mock'

const mockPrisma = prisma as unknown as MockPrismaClient
const INCIDENT_ID = 'incident_1'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('updateMutualAid', () => {
  function validFormData() {
    const fd = new FormData()
    fd.set('aidDirection', 'GIVEN')
    fd.set('aidType', 'SUPPORT_AID')
    return fd
  }

  it('returns a message and attempts no DB write when unauthenticated', async () => {
    mockSignedOut()
    const result = await updateMutualAid(INCIDENT_ID, {}, validFormData())
    expect(result.message).toMatch(/signed in/i)
    expect(mockPrisma.incident.findFirst).not.toHaveBeenCalled()
  })

  it('returns fieldErrors and attempts no DB write when NONE is set alongside an aidType', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })
    const fd = new FormData()
    fd.set('aidDirection', 'NONE')
    fd.set('aidType', 'SUPPORT_AID')

    const result = await updateMutualAid(INCIDENT_ID, {}, fd)

    expect(result.errors).toBeDefined()
    expect(mockPrisma.incident.update).not.toHaveBeenCalled()
  })

  it('returns "not found" and attempts no DB write for a cross-tenant incident', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue(null)

    const result = await updateMutualAid(INCIDENT_ID, {}, validFormData())

    expect(result.message).toMatch(/not found/i)
    expect(mockPrisma.incident.update).not.toHaveBeenCalled()
  })

  it('parses newline-separated department names, trimming whitespace and dropping blanks', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })
    const fd = validFormData()
    fd.set('aidDepartmentNames', 'Neighboring FD\n  Second FD  \n\nThird FD')

    await updateMutualAid(INCIDENT_ID, {}, fd)

    expect(mockPrisma.incident.update).toHaveBeenCalledWith({
      where: { id: INCIDENT_ID },
      data: expect.objectContaining({ aidDepartmentNames: ['Neighboring FD', 'Second FD', 'Third FD'] })
    })
  })

  it('saves and revalidates on the happy path', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })

    const result = await updateMutualAid(INCIDENT_ID, {}, validFormData())

    expect(mockPrisma.incident.update).toHaveBeenCalledWith({
      where: { id: INCIDENT_ID },
      data: { aidDirection: 'GIVEN', aidType: 'SUPPORT_AID', aidDepartmentNames: [], aidNonFdTypes: [] }
    })
    expect(revalidatePath).toHaveBeenCalledWith(`/incidents/${INCIDENT_ID}/mutual-aid`)
    expect(result.message).toBe('Saved.')
  })
})
