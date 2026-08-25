import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/current-user')
vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('@/test/helpers/prisma-mock')
  return { prisma: createPrismaMock() }
})
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import {
  updateDepartment,
  createStation,
  updateStation,
  deleteStation,
  createUnit,
  updateUnit,
  deleteUnit,
  updateNerisCredentials
} from '@/app/admin/settings/actions'
import { mockSignedInAs, mockSignedOut } from '@/test/helpers/auth'
import { type MockPrismaClient } from '@/test/helpers/prisma-mock'
import { decryptSecret } from '@/lib/crypto/secret-cipher'

const mockPrisma = prisma as unknown as MockPrismaClient
const DEPARTMENT_ID = 'dept_1'

function restrictError() {
  return new Prisma.PrismaClientKnownRequestError('Foreign key constraint violated', { code: 'P2003', clientVersion: 'test' })
}

beforeEach(() => {
  vi.resetAllMocks()
  process.env.ENCRYPTION_KEY = randomBytes(32).toString('base64')
})

describe('updateDepartment', () => {
  function validFormData() {
    const fd = new FormData()
    fd.set('name', 'Fairfax Fire Rescue')
    return fd
  }

  it('returns a message and attempts no DB write when unauthenticated', async () => {
    mockSignedOut()
    const result = await updateDepartment({}, validFormData())
    expect(result.message).toMatch(/signed in/i)
    expect(mockPrisma.department.update).not.toHaveBeenCalled()
  })

  it('returns a message and attempts no DB write for a non-Admin user', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID, role: 'MEMBER' })
    const result = await updateDepartment({}, validFormData())
    expect(result.message).toMatch(/admin/i)
    expect(mockPrisma.department.update).not.toHaveBeenCalled()
  })

  it('returns fieldErrors and attempts no DB write for a missing name', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID, role: 'ADMIN' })
    const result = await updateDepartment({}, new FormData())
    expect(result.errors?.name).toBeDefined()
    expect(mockPrisma.department.update).not.toHaveBeenCalled()
  })

  it('rejects a fdType not in the NERIS TypeDept value set', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID, role: 'ADMIN' })
    const fd = validFormData()
    fd.set('fdType', 'NOT_A_REAL_VALUE')
    const result = await updateDepartment({}, fd)
    expect(result.errors?.fdType).toBeDefined()
    expect(mockPrisma.department.update).not.toHaveBeenCalled()
  })

  it('updates the caller\'s own department on the happy path', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID, role: 'ADMIN' })
    const fd = validFormData()
    fd.set('fdType', 'CAREER')
    fd.set('staffActiveFfCareerFt', '12')

    const result = await updateDepartment({}, fd)

    expect(mockPrisma.department.update).toHaveBeenCalledWith({
      where: { id: DEPARTMENT_ID },
      data: expect.objectContaining({ name: 'Fairfax Fire Rescue', fdType: 'CAREER', staffActiveFfCareerFt: 12 })
    })
    expect(result.message).toBe('Saved.')
  })
})

describe('Station CRUD', () => {
  function validFormData() {
    const fd = new FormData()
    fd.set('label', 'Station 7')
    return fd
  }

  it('createStation rejects a non-Admin user', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID, role: 'OFFICER' })
    const result = await createStation({}, validFormData())
    expect(result.message).toMatch(/admin/i)
    expect(mockPrisma.station.create).not.toHaveBeenCalled()
  })

  it('createStation creates a station scoped to the caller\'s department', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID, role: 'ADMIN' })
    await createStation({}, validFormData())
    expect(mockPrisma.station.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ departmentId: DEPARTMENT_ID, label: 'Station 7' })
    })
  })

  it('updateStation returns "not found" for a station outside the caller\'s department', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID, role: 'ADMIN' })
    mockPrisma.station.findFirst.mockResolvedValue(null)

    const result = await updateStation('station_1', {}, validFormData())

    expect(result.message).toMatch(/not found/i)
    expect(mockPrisma.station.update).not.toHaveBeenCalled()
  })

  it('updateStation updates a station that belongs to the caller\'s department', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID, role: 'ADMIN' })
    mockPrisma.station.findFirst.mockResolvedValue({ id: 'station_1', departmentId: DEPARTMENT_ID })

    await updateStation('station_1', {}, validFormData())

    expect(mockPrisma.station.update).toHaveBeenCalledWith({
      where: { id: 'station_1' },
      data: expect.objectContaining({ label: 'Station 7' })
    })
  })

  it('deleteStation returns a friendly message instead of a raw DB error when a unit is referenced by a historical incident', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID, role: 'ADMIN' })
    mockPrisma.station.findFirst.mockResolvedValue({ id: 'station_1', departmentId: DEPARTMENT_ID })
    mockPrisma.station.delete.mockRejectedValue(restrictError())
    const fd = new FormData()
    fd.set('stationId', 'station_1')

    const result = await deleteStation({}, fd)

    expect(result.message).toMatch(/cannot delete/i)
  })

  it('deleteStation succeeds for an unreferenced station', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID, role: 'ADMIN' })
    mockPrisma.station.findFirst.mockResolvedValue({ id: 'station_1', departmentId: DEPARTMENT_ID })
    const fd = new FormData()
    fd.set('stationId', 'station_1')

    const result = await deleteStation({}, fd)

    expect(mockPrisma.station.delete).toHaveBeenCalledWith({ where: { id: 'station_1' } })
    expect(result.message).toMatch(/removed/i)
  })
})

describe('Unit CRUD', () => {
  function validFormData() {
    const fd = new FormData()
    fd.set('designation', 'ENGINE 7')
    return fd
  }

  it('createUnit returns "not found" for a station outside the caller\'s department', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID, role: 'ADMIN' })
    mockPrisma.station.findFirst.mockResolvedValue(null)

    const result = await createUnit('station_1', {}, validFormData())

    expect(result.message).toMatch(/not found/i)
    expect(mockPrisma.unit.create).not.toHaveBeenCalled()
  })

  it('createUnit creates a unit under the given station', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID, role: 'ADMIN' })
    mockPrisma.station.findFirst.mockResolvedValue({ id: 'station_1', departmentId: DEPARTMENT_ID })

    await createUnit('station_1', {}, validFormData())

    expect(mockPrisma.unit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ stationId: 'station_1', designation: 'ENGINE 7' })
    })
  })

  it('updateUnit returns "not found" for a unit outside the caller\'s department', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID, role: 'ADMIN' })
    mockPrisma.unit.findFirst.mockResolvedValue(null)

    const result = await updateUnit('unit_1', {}, validFormData())

    expect(result.message).toMatch(/not found/i)
    expect(mockPrisma.unit.update).not.toHaveBeenCalled()
  })

  it('deleteUnit returns a friendly message instead of a raw DB error when referenced by a historical incident', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID, role: 'ADMIN' })
    mockPrisma.unit.findFirst.mockResolvedValue({ id: 'unit_1' })
    mockPrisma.unit.delete.mockRejectedValue(restrictError())
    const fd = new FormData()
    fd.set('unitId', 'unit_1')

    const result = await deleteUnit({}, fd)

    expect(result.message).toMatch(/cannot delete/i)
  })

  it('deleteUnit succeeds for an unreferenced unit', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID, role: 'ADMIN' })
    mockPrisma.unit.findFirst.mockResolvedValue({ id: 'unit_1' })
    const fd = new FormData()
    fd.set('unitId', 'unit_1')

    const result = await deleteUnit({}, fd)

    expect(mockPrisma.unit.delete).toHaveBeenCalledWith({ where: { id: 'unit_1' } })
    expect(result.message).toMatch(/removed/i)
  })
})

describe('updateNerisCredentials', () => {
  function validFormData() {
    const fd = new FormData()
    fd.set('nerisVendorClientId', 'vendor-client-123')
    fd.set('nerisEnvironment', 'SANDBOX')
    return fd
  }

  it('returns a message and attempts no DB write when unauthenticated', async () => {
    mockSignedOut()
    const result = await updateNerisCredentials({}, validFormData())
    expect(result.message).toMatch(/signed in/i)
    expect(mockPrisma.department.update).not.toHaveBeenCalled()
  })

  it('returns a message and attempts no DB write for a non-Admin user', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID, role: 'MEMBER' })
    const result = await updateNerisCredentials({}, validFormData())
    expect(result.message).toMatch(/admin/i)
    expect(mockPrisma.department.update).not.toHaveBeenCalled()
  })

  it('rejects a nerisEnvironment not in the NerisEnvironment enum', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID, role: 'ADMIN' })
    const fd = validFormData()
    fd.set('nerisEnvironment', 'NOT_A_REAL_ENVIRONMENT')
    const result = await updateNerisCredentials({}, fd)
    expect(result.errors?.nerisEnvironment).toBeDefined()
    expect(mockPrisma.department.update).not.toHaveBeenCalled()
  })

  it('updates the client ID and environment without touching the secret when left blank', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID, role: 'ADMIN' })
    const fd = validFormData()
    fd.set('nerisEnvironment', 'PRODUCTION')

    const result = await updateNerisCredentials({}, fd)

    expect(mockPrisma.department.update).toHaveBeenCalledWith({
      where: { id: DEPARTMENT_ID },
      data: { nerisVendorClientId: 'vendor-client-123', nerisEnvironment: 'PRODUCTION' }
    })
    expect(result.message).toBe('Saved.')
  })

  it('encrypts a newly-entered secret before storing it, never storing or returning the plaintext', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID, role: 'ADMIN' })
    const fd = validFormData()
    fd.set('nerisVendorClientSecret', 'super-secret-value')

    const result = await updateNerisCredentials({}, fd)

    expect(mockPrisma.department.update).toHaveBeenCalledTimes(1)
    const call = mockPrisma.department.update.mock.calls[0][0]
    expect(call.data.nerisVendorSecretCipher).toBeDefined()
    expect(call.data.nerisVendorSecretCipher).not.toBe('super-secret-value')
    expect(decryptSecret(call.data.nerisVendorSecretCipher as string)).toBe('super-secret-value')
    expect(result.message).toBe('Saved.')
    expect(JSON.stringify(result)).not.toMatch(/super-secret-value/)
  })
})
