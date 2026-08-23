import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/current-user')
vi.mock('@/lib/prisma', async () => {
  const { createPrismaMock } = await import('@/test/helpers/prisma-mock')
  return { prisma: createPrismaMock() }
})
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { createUnitResponse, quickAddUnit } from '@/app/incidents/[id]/unit-response/actions'
import { mockSignedInAs, mockSignedOut } from '@/test/helpers/auth'
import { type MockPrismaClient } from '@/test/helpers/prisma-mock'

const mockPrisma = prisma as unknown as MockPrismaClient
const INCIDENT_ID = 'incident_1'
const DEPARTMENT_ID = 'dept_1'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('createUnitResponse', () => {
  function formDataWithUnit(unitId: string) {
    const fd = new FormData()
    fd.set('unitIdLinked', unitId)
    return fd
  }

  it('returns a message and attempts no DB write when unauthenticated', async () => {
    mockSignedOut()
    const result = await createUnitResponse(INCIDENT_ID, {}, formDataWithUnit('unit_1'))
    expect(result.message).toMatch(/signed in/i)
    expect(mockPrisma.incident.findFirst).not.toHaveBeenCalled()
  })

  it('returns "not found" and attempts no DB write for a cross-tenant incident', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID })
    mockPrisma.incident.findFirst.mockResolvedValue(null)

    const result = await createUnitResponse(INCIDENT_ID, {}, formDataWithUnit('unit_1'))

    expect(result.message).toMatch(/not found/i)
    expect(mockPrisma.incidentUnitResponse.create).not.toHaveBeenCalled()
  })

  it('rejects a unitIdLinked that does not belong to the caller\'s department (cross-tenant unit)', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID })
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })
    mockPrisma.unit.findFirst.mockResolvedValue(null)

    const result = await createUnitResponse(INCIDENT_ID, {}, formDataWithUnit('someone-elses-unit'))

    expect(result.errors?.unitIdLinked).toBeDefined()
    expect(mockPrisma.incidentUnitResponse.create).not.toHaveBeenCalled()
  })

  it('creates the unit response and redirects on the happy path', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID })
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })
    mockPrisma.unit.findFirst.mockResolvedValue({ id: 'unit_1' })

    await createUnitResponse(INCIDENT_ID, {}, formDataWithUnit('unit_1'))

    expect(mockPrisma.incidentUnitResponse.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ incidentId: INCIDENT_ID, unitIdLinked: 'unit_1' })
    })
    expect(redirect).toHaveBeenCalledWith(`/incidents/${INCIDENT_ID}/unit-response`)
  })
})

describe('quickAddUnit', () => {
  function validFormData() {
    const fd = new FormData()
    fd.set('designation', 'ENGINE 7')
    fd.set('capabilityType', 'ENGINE_STRUCT')
    return fd
  }

  it('returns a message and attempts no DB write when unauthenticated', async () => {
    mockSignedOut()
    const result = await quickAddUnit(INCIDENT_ID, {}, validFormData())
    expect(result.message).toMatch(/signed in/i)
    expect(mockPrisma.unit.create).not.toHaveBeenCalled()
  })

  it('returns "not found" and attempts no DB write for a cross-tenant incident', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID })
    mockPrisma.incident.findFirst.mockResolvedValue(null)

    const result = await quickAddUnit(INCIDENT_ID, {}, validFormData())

    expect(result.message).toMatch(/not found/i)
    expect(mockPrisma.unit.create).not.toHaveBeenCalled()
  })

  it('returns fieldErrors and attempts no DB write for a missing designation', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID })
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })
    const fd = new FormData()

    const result = await quickAddUnit(INCIDENT_ID, {}, fd)

    expect(result.errors?.designation).toBeDefined()
    expect(mockPrisma.unit.create).not.toHaveBeenCalled()
  })

  it('rejects an invalid capabilityType not in the NERIS value set', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID })
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })
    const fd = new FormData()
    fd.set('designation', 'ENGINE 7')
    fd.set('capabilityType', 'NOT_A_REAL_VALUE')

    const result = await quickAddUnit(INCIDENT_ID, {}, fd)

    expect(result.errors?.capabilityType).toBeDefined()
    expect(mockPrisma.unit.create).not.toHaveBeenCalled()
  })

  it('reuses an existing Station rather than creating a new one when the department already has one', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID })
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })
    mockPrisma.station.findFirst.mockResolvedValue({ id: 'station_1', departmentId: DEPARTMENT_ID })
    mockPrisma.unit.create.mockResolvedValue({ id: 'unit_new', designation: 'ENGINE 7' })

    const result = await quickAddUnit(INCIDENT_ID, {}, validFormData())

    expect(mockPrisma.station.create).not.toHaveBeenCalled()
    expect(mockPrisma.unit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ stationId: 'station_1', designation: 'ENGINE 7', capabilityType: 'ENGINE_STRUCT' })
    })
    expect(result.unit).toEqual({ id: 'unit_new', designation: 'ENGINE 7' })
  })

  it('creates a Station first when the department has none yet', async () => {
    mockSignedInAs({ departmentId: DEPARTMENT_ID })
    mockPrisma.incident.findFirst.mockResolvedValue({ id: INCIDENT_ID })
    mockPrisma.station.findFirst.mockResolvedValue(null)
    mockPrisma.station.create.mockResolvedValue({ id: 'station_new', departmentId: DEPARTMENT_ID })
    mockPrisma.unit.create.mockResolvedValue({ id: 'unit_new', designation: 'ENGINE 7' })

    await quickAddUnit(INCIDENT_ID, {}, validFormData())

    expect(mockPrisma.station.create).toHaveBeenCalledWith({ data: expect.objectContaining({ departmentId: DEPARTMENT_ID }) })
    expect(mockPrisma.unit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ stationId: 'station_new' })
    })
  })
})
