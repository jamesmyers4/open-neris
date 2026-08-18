import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/current-user')
vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('@/test/helpers/prisma-mock')
  return { prisma: createPrismaMock() }
})

import { prisma } from '@/lib/prisma'
import { updateMutualAid } from '@/app/incidents/[id]/mutual-aid/actions'
import { mockSignedInAs } from '@/test/helpers/auth'
import { type MockPrismaClient } from '@/test/helpers/prisma-mock'

const mockPrisma = prisma as unknown as MockPrismaClient
const INCIDENT_ID = 'incident_1'

beforeEach(() => {
  vi.resetAllMocks()
})

// Phase 5: malformed/partial FormData — key entirely absent vs present-but-empty
// vs explicit null.
describe('updateMutualAid — malformed/partial FormData', () => {
  it('saves an empty aidDepartmentNames array when the key is entirely absent (`formData.get(...) ?? \'\'` catches the null, then split/filter yields [])', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })
    const fd = new FormData()
    // aidDepartmentNames key intentionally omitted.

    await updateMutualAid(INCIDENT_ID, {}, fd)

    expect(mockPrisma.incident.update).toHaveBeenCalledWith({
      where: { id: INCIDENT_ID },
      data: expect.objectContaining({ aidDepartmentNames: [] })
    })
  })

  it('saves an empty aidNonFdTypes array when the key is entirely absent, same as present-but-empty (getAll)', async () => {
    mockSignedInAs()
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })

    await updateMutualAid(INCIDENT_ID, {}, new FormData())

    expect(mockPrisma.incident.update).toHaveBeenCalledWith({
      where: { id: INCIDENT_ID },
      data: expect.objectContaining({ aidNonFdTypes: [] })
    })
  })
})
