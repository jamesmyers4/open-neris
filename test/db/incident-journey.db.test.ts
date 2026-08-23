import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Factory form (not bare vi.mock('@/lib/auth/current-user')) deliberately:
// the bare auto-mock form needs to import the REAL module once to derive its
// shape, which would also evaluate the real lib/prisma.ts singleton before
// this file gets a chance to point DATABASE_URL at the test container —
// confirmed empirically. This factory never touches the real module at all.
vi.mock('@/lib/auth/current-user', () => ({ getCurrentAppUser: vi.fn() }))

import { startTestDatabase, stopTestDatabase, type TestDatabase } from '@/test/helpers/db'
import { setupCallerContext, createAndGetIncidentId, typesFormData } from '@/test/helpers/journey'

type Actions = {
  createIncident: typeof import('@/app/incidents/actions').createIncident
  submitIncident: typeof import('@/app/incidents/[id]/actions').submitIncident
  updateDispatch: typeof import('@/app/incidents/[id]/dispatch/actions').updateDispatch
  updateLocation: typeof import('@/app/incidents/[id]/location/actions').updateLocation
  updateNarrative: typeof import('@/app/incidents/[id]/narrative/actions').updateNarrative
  setNoActionReason: typeof import('@/app/incidents/[id]/actions-taken/actions').setNoActionReason
  upsertFire: typeof import('@/app/incidents/[id]/fire/actions').upsertFire
  createMedical: typeof import('@/app/incidents/[id]/medical/actions').createMedical
  createUnitResponse: typeof import('@/app/incidents/[id]/unit-response/actions').createUnitResponse
}

describe('Incident lifecycle journeys (multi-action, real DB)', () => {
  let db: TestDatabase
  let actions: Actions

  beforeAll(async () => {
    db = await startTestDatabase()

    // Defensive: lib/prisma.ts caches its client on globalThis to survive
    // Next.js dev-mode hot reload. Clear it so the dynamic imports below are
    // guaranteed to construct a fresh client against DATABASE_URL as set
    // here, not reuse a stale singleton from elsewhere in this worker.
    ;(globalThis as { prisma?: unknown }).prisma = undefined
    process.env.DATABASE_URL = db.container.getConnectionUri()

    const [incidentActions, idActions, dispatchActions, locationActions, narrativeActions, actionsTakenActions, fireActions, medicalActions, unitResponseActions] =
      await Promise.all([
        import('@/app/incidents/actions'),
        import('@/app/incidents/[id]/actions'),
        import('@/app/incidents/[id]/dispatch/actions'),
        import('@/app/incidents/[id]/location/actions'),
        import('@/app/incidents/[id]/narrative/actions'),
        import('@/app/incidents/[id]/actions-taken/actions'),
        import('@/app/incidents/[id]/fire/actions'),
        import('@/app/incidents/[id]/medical/actions'),
        import('@/app/incidents/[id]/unit-response/actions')
      ])

    actions = {
      createIncident: incidentActions.createIncident,
      submitIncident: idActions.submitIncident,
      updateDispatch: dispatchActions.updateDispatch,
      updateLocation: locationActions.updateLocation,
      updateNarrative: narrativeActions.updateNarrative,
      setNoActionReason: actionsTakenActions.setNoActionReason,
      upsertFire: fireActions.upsertFire,
      createMedical: medicalActions.createMedical,
      createUnitResponse: unitResponseActions.createUnitResponse
    }
  })

  afterAll(async () => {
    await stopTestDatabase(db)
  })

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('creates, fills, gates, completes, and submits an incident end to end', async () => {
    const { user, unit } = await setupCallerContext(db.prisma)

    const incidentId = await createAndGetIncidentId(actions.createIncident, typesFormData('FIRE', 'STRUCTURE_FIRE'))
    const created = await db.prisma.incident.findUniqueOrThrow({ where: { id: incidentId } })
    expect(created.reviewStatus).toBe('OPEN')

    const dispatchFd = new FormData()
    dispatchFd.set('timeIncidentClear', '2026-02-01T13:00:00Z')
    const dispatchResult = await actions.updateDispatch(incidentId, {}, dispatchFd)
    expect(dispatchResult.message).toBe('Saved.')

    const locationFd = new FormData()
    locationFd.set('streetAddressComplete', '123 Main St')
    locationFd.set('state', 'NY')
    const locationResult = await actions.updateLocation(incidentId, {}, locationFd)
    expect(locationResult.message).toBe('Saved.')

    // Narrative and actions-taken/no-action are still missing — submit must be rejected.
    await actions.submitIncident(incidentId)
    const afterFirstAttempt = await db.prisma.incident.findUniqueOrThrow({ where: { id: incidentId } })
    expect(afterFirstAttempt.reviewStatus).toBe('OPEN')
    expect(await db.prisma.reviewEvent.count({ where: { incidentId } })).toBe(0)

    const narrativeFd = new FormData()
    narrativeFd.set('narrativeImpediment', 'None')
    narrativeFd.set('narrativeOutcome', 'Fire extinguished, no injuries')
    await actions.updateNarrative(incidentId, {}, narrativeFd)

    // actions-taken/no-action is still missing — submit must still be rejected.
    await actions.submitIncident(incidentId)
    const afterSecondAttempt = await db.prisma.incident.findUniqueOrThrow({ where: { id: incidentId } })
    expect(afterSecondAttempt.reviewStatus).toBe('OPEN')

    const noActionFd = new FormData()
    noActionFd.set('incidentNoActionReason', 'CANCELLED')
    await actions.setNoActionReason(incidentId, {}, noActionFd)

    // No responding unit recorded yet — submit must still be rejected
    // (dispatch_unit_response is neris_core_app=TRUE, unconditional).
    await actions.submitIncident(incidentId)
    const afterThirdAttempt = await db.prisma.incident.findUniqueOrThrow({ where: { id: incidentId } })
    expect(afterThirdAttempt.reviewStatus).toBe('OPEN')

    const unitResponseFd = new FormData()
    unitResponseFd.set('unitIdLinked', unit.id)
    await actions.createUnitResponse(incidentId, {}, unitResponseFd)

    // Core fields and unit response are complete, but this is a FIRE
    // incident — fire-module details are still missing, so submit must
    // still be rejected.
    await actions.submitIncident(incidentId)
    const afterFourthAttempt = await db.prisma.incident.findUniqueOrThrow({ where: { id: incidentId } })
    expect(afterFourthAttempt.reviewStatus).toBe('OPEN')

    const fireFd = new FormData()
    fireFd.set('fireInvestigationNeed', 'NO')
    await actions.upsertFire(incidentId, {}, fireFd)

    // Every required core, unit-response, and fire-module field is now present — submit succeeds.
    await actions.submitIncident(incidentId)
    const final = await db.prisma.incident.findUniqueOrThrow({ where: { id: incidentId } })
    expect(final.reviewStatus).toBe('SUBMITTED')

    const reviewEvent = await db.prisma.reviewEvent.findFirstOrThrow({ where: { incidentId } })
    expect(reviewEvent).toMatchObject({ fromStatus: 'OPEN', toStatus: 'SUBMITTED', actorId: user.id })
  })

  describe('type-gating path', () => {
    async function runCoreOnlyJourney(value1: string, unitId: string): Promise<string> {
      const incidentId = await createAndGetIncidentId(actions.createIncident, typesFormData(value1))

      const dispatchFd = new FormData()
      dispatchFd.set('timeIncidentClear', '2026-02-01T13:00:00Z')
      await actions.updateDispatch(incidentId, {}, dispatchFd)

      const locationFd = new FormData()
      locationFd.set('streetAddressComplete', '123 Main St')
      locationFd.set('state', 'NY')
      await actions.updateLocation(incidentId, {}, locationFd)

      const narrativeFd = new FormData()
      narrativeFd.set('narrativeImpediment', 'None')
      narrativeFd.set('narrativeOutcome', 'Resolved')
      await actions.updateNarrative(incidentId, {}, narrativeFd)

      const noActionFd = new FormData()
      noActionFd.set('incidentNoActionReason', 'CANCELLED')
      await actions.setNoActionReason(incidentId, {}, noActionFd)

      const unitResponseFd = new FormData()
      unitResponseFd.set('unitIdLinked', unitId)
      await actions.createUnitResponse(incidentId, {}, unitResponseFd)

      return incidentId
    }

    // get-submit-completeness.ts now wires Fire/Medical/HazSit required-schemas
    // in alongside the always-on core + unit-response checks, gated by module
    // relevance — so a FIRE-primary incident and a MEDICAL-primary incident
    // genuinely diverge: core+unit-response completion blocks both (each is
    // still missing its own module's required data), and each unblocks
    // independently once its own module-specific data is added.
    it('a FIRE-primary incident is blocked on fire-module completeness that a MEDICAL-primary incident does not require', async () => {
      const { unit } = await setupCallerContext(db.prisma)

      const fireIncidentId = await runCoreOnlyJourney('FIRE', unit.id)
      await actions.submitIncident(fireIncidentId)
      const blocked = await db.prisma.incident.findUniqueOrThrow({ where: { id: fireIncidentId } })
      expect(blocked.reviewStatus).toBe('OPEN')

      const fireFd = new FormData()
      fireFd.set('fireInvestigationNeed', 'NO')
      await actions.upsertFire(fireIncidentId, {}, fireFd)

      await actions.submitIncident(fireIncidentId)
      const submitted = await db.prisma.incident.findUniqueOrThrow({ where: { id: fireIncidentId } })
      expect(submitted.reviewStatus).toBe('SUBMITTED')
    })

    it('a MEDICAL-primary incident is blocked until at least one patient record exists', async () => {
      const { unit } = await setupCallerContext(db.prisma)

      const medicalIncidentId = await runCoreOnlyJourney('MEDICAL', unit.id)
      await actions.submitIncident(medicalIncidentId)
      const blocked = await db.prisma.incident.findUniqueOrThrow({ where: { id: medicalIncidentId } })
      expect(blocked.reviewStatus).toBe('OPEN')

      const medicalFd = new FormData()
      medicalFd.set('patientEvaluationCare', 'PATIENT_EVALUATED_CARE_PROVIDED')
      await actions.createMedical(medicalIncidentId, {}, medicalFd)

      await actions.submitIncident(medicalIncidentId)
      const submitted = await db.prisma.incident.findUniqueOrThrow({ where: { id: medicalIncidentId } })
      expect(submitted.reviewStatus).toBe('SUBMITTED')
    })
  })
})
