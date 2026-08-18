import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { startTestDatabase, stopTestDatabase, type TestDatabase } from '@/test/helpers/db'
import { createTestDepartment, createTestUser, createTestIncident } from '@/test/helpers/db-fixtures'

// Inserts exactly one row into every child table that hangs off an Incident
// (plus IncidentHazardChemical, hanging off IncidentHazsit), satisfying each
// table's required-column constraints with arbitrary values — the DB itself
// doesn't validate NERIS semantics, only NOT NULL/type, so any string does.
async function seedAllIncidentChildren(prisma: PrismaClient, incidentId: string, actorId: string) {
  await prisma.incidentType.create({ data: { incidentId, value1: 'FIRE' } })
  await prisma.incidentActionTaken.create({ data: { incidentId, value1: 'FORCIBLE_ENTRY' } })
  await prisma.incidentDispatchComment.create({ data: { incidentId, comment: 'note', timestamp: new Date() } })
  await prisma.incidentDisplacement.create({ data: { incidentId, causes: ['FIRE'] } })
  await prisma.incidentLocation.create({ data: { incidentId, streetAddressComplete: '123 Main St', state: 'NY' } })
  await prisma.incidentExposure.create({ data: { incidentId, exposureType: 'INTERNAL_EXPOSURE' } })
  await prisma.incidentFire.create({
    data: {
      incidentId,
      fireWaterSupply: 'MUNICIPAL',
      fireInvestigationNeed: 'NOT_NEEDED',
      structureArrivalConditions: 'SMOKE_SHOWING',
      structureDamage: 'MINOR',
      structureRoomOfOrigin: 'KITCHEN',
      structureFireCause: 'ACCIDENTAL',
      outsideFireCause: 'ACCIDENTAL'
    }
  })
  await prisma.incidentMedical.create({
    data: { incidentId, patientEvaluationCare: 'EVALUATED', patientImprovedStatus: 'IMPROVED', medicalDisposition: 'TRANSPORTED' }
  })
  const hazsit = await prisma.incidentHazsit.create({ data: { incidentId, hazsitDisposition: 'CONTAINED' } })
  await prisma.incidentHazardChemical.create({
    data: {
      hazsitId: hazsit.id,
      dotClass: 'CLASS_3',
      amountEstUnits: 'GALLONS',
      physicalState: 'LIQUID',
      releaseInto: 'AIR',
      releaseCause: 'ACCIDENTAL'
    }
  })
  await prisma.incidentRescueFf.create({
    data: { incidentId, gender: 'UNKNOWN', race: 'UNKNOWN', rescueType: 'SELF_RESCUE', casualtyType: 'UNINJURED', linkedUnitId: 'E731' }
  })
  await prisma.incidentRescueNonFf.create({
    data: { incidentId, gender: 'UNKNOWN', race: 'UNKNOWN', rescueType: 'SELF_RESCUE', casualtyType: 'UNINJURED' }
  })
  await prisma.incidentUnitResponse.create({
    data: { incidentId, unitIdLinked: 'E731', responseMode: 'EMERGENCY', transportMode: 'GROUND' }
  })
  await prisma.incidentRiskReduction.create({
    data: {
      incidentId,
      smokeAlarmPresence: 'PRESENT',
      smokeAlarmOperation: 'OPERATED',
      fireAlarmPresence: 'NOT_PRESENT',
      fireAlarmOperation: 'NA',
      fireSuppressionPresence: 'NOT_PRESENT',
      fireSuppressionOperation: 'NA',
      cookingFireSuppressionPresence: 'NOT_PRESENT'
    }
  })
  await prisma.incidentEmergingHazard.create({ data: { incidentId } })
  await prisma.incidentTacticTimestamps.create({ data: { incidentId } })
  await prisma.reviewEvent.create({ data: { incidentId, actorId, fromStatus: 'OPEN', toStatus: 'SUBMITTED' } })
  await prisma.nerisSubmission.create({ data: { incidentId, trigger: 'APPROVAL_AUTO', requestPayload: {} } })
}

const CHILD_TABLE_COUNTERS = (prisma: PrismaClient, incidentId: string) => ({
  types: prisma.incidentType.count({ where: { incidentId } }),
  actionsTaken: prisma.incidentActionTaken.count({ where: { incidentId } }),
  dispatchComments: prisma.incidentDispatchComment.count({ where: { incidentId } }),
  displacements: prisma.incidentDisplacement.count({ where: { incidentId } }),
  location: prisma.incidentLocation.count({ where: { incidentId } }),
  exposures: prisma.incidentExposure.count({ where: { incidentId } }),
  fire: prisma.incidentFire.count({ where: { incidentId } }),
  medicals: prisma.incidentMedical.count({ where: { incidentId } }),
  hazsit: prisma.incidentHazsit.count({ where: { incidentId } }),
  rescuesFf: prisma.incidentRescueFf.count({ where: { incidentId } }),
  rescuesNonFf: prisma.incidentRescueNonFf.count({ where: { incidentId } }),
  unitResponses: prisma.incidentUnitResponse.count({ where: { incidentId } }),
  riskReduction: prisma.incidentRiskReduction.count({ where: { incidentId } }),
  emergingHazards: prisma.incidentEmergingHazard.count({ where: { incidentId } }),
  tacticTimestamps: prisma.incidentTacticTimestamps.count({ where: { incidentId } }),
  reviewEvents: prisma.reviewEvent.count({ where: { incidentId } }),
  nerisSubmissions: prisma.nerisSubmission.count({ where: { incidentId } })
})

async function countAll(prisma: PrismaClient, incidentId: string) {
  const counters = CHILD_TABLE_COUNTERS(prisma, incidentId)
  const entries = await Promise.all(Object.entries(counters).map(async ([key, promise]) => [key, await promise] as const))
  return Object.fromEntries(entries)
}

describe('Cascade deletes', () => {
  let db: TestDatabase

  beforeAll(async () => {
    db = await startTestDatabase()
  })

  afterAll(async () => {
    await stopTestDatabase(db)
  })

  it('deleting an Incident cascades to every child module table, including the hazsit->chemical grandchild', async () => {
    const department = await createTestDepartment(db.prisma)
    const user = await createTestUser(db.prisma, department.id)
    const incident = await createTestIncident(db.prisma, department.id, user.id)

    await seedAllIncidentChildren(db.prisma, incident.id, user.id)

    const before = await countAll(db.prisma, incident.id)
    expect(Object.values(before).every(count => count === 1)).toBe(true)

    const hazsitBefore = await db.prisma.incidentHazsit.findUniqueOrThrow({ where: { incidentId: incident.id } })
    expect(await db.prisma.incidentHazardChemical.count({ where: { hazsitId: hazsitBefore.id } })).toBe(1)

    await db.prisma.incident.delete({ where: { id: incident.id } })

    const after = await countAll(db.prisma, incident.id)
    expect(Object.values(after).every(count => count === 0)).toBe(true)
    expect(await db.prisma.incidentHazardChemical.count({ where: { hazsitId: hazsitBefore.id } })).toBe(0)
  })

  it('deleting a Department cascades to its DepartmentIdCounter rows', async () => {
    const department = await createTestDepartment(db.prisma)
    await db.prisma.departmentIdCounter.create({ data: { departmentId: department.id, year: 2026, counter: 5 } })

    expect(await db.prisma.departmentIdCounter.count({ where: { departmentId: department.id } })).toBe(1)

    await db.prisma.department.delete({ where: { id: department.id } })

    expect(await db.prisma.departmentIdCounter.count({ where: { departmentId: department.id } })).toBe(0)
  })
})
