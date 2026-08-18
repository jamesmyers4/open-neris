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

    const [incidentActions, idActions, dispatchActions, locationActions, narrativeActions, actionsTakenActions] = await Promise.all([
      import('@/app/incidents/actions'),
      import('@/app/incidents/[id]/actions'),
      import('@/app/incidents/[id]/dispatch/actions'),
      import('@/app/incidents/[id]/location/actions'),
      import('@/app/incidents/[id]/narrative/actions'),
      import('@/app/incidents/[id]/actions-taken/actions')
    ])

    actions = {
      createIncident: incidentActions.createIncident,
      submitIncident: idActions.submitIncident,
      updateDispatch: dispatchActions.updateDispatch,
      updateLocation: locationActions.updateLocation,
      updateNarrative: narrativeActions.updateNarrative,
      setNoActionReason: actionsTakenActions.setNoActionReason
    }
  })

  afterAll(async () => {
    await stopTestDatabase(db)
  })

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('creates, fills, gates, completes, and submits an incident end to end', async () => {
    const { user } = await setupCallerContext(db.prisma)

    const incidentId = await createAndGetIncidentId(actions.createIncident, typesFormData('FIRE', 'STRUCTURE_FIRE'))
    const created = await db.prisma.incident.findUniqueOrThrow({ where: { id: incidentId } })
    expect(created.reviewStatus).toBe('OPEN')

    const dispatchFd = new FormData()
    dispatchFd.set('dispatchTimeCallArrival', '2026-02-01T12:00:00Z')
    dispatchFd.set('dispatchTimeCallAnswer', '2026-02-01T12:01:00Z')
    dispatchFd.set('dispatchTimeCallCreate', '2026-02-01T12:02:00Z')
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

    // Every required core field is now present — submit succeeds.
    await actions.submitIncident(incidentId)
    const final = await db.prisma.incident.findUniqueOrThrow({ where: { id: incidentId } })
    expect(final.reviewStatus).toBe('SUBMITTED')

    const reviewEvent = await db.prisma.reviewEvent.findFirstOrThrow({ where: { incidentId } })
    expect(reviewEvent).toMatchObject({ fromStatus: 'OPEN', toStatus: 'SUBMITTED', actorId: user.id })
  })

  describe('type-gating path', () => {
    async function runMinimalCoreJourney(value1: string): Promise<string> {
      const incidentId = await createAndGetIncidentId(actions.createIncident, typesFormData(value1))

      const dispatchFd = new FormData()
      dispatchFd.set('dispatchTimeCallArrival', '2026-02-01T12:00:00Z')
      dispatchFd.set('dispatchTimeCallAnswer', '2026-02-01T12:01:00Z')
      dispatchFd.set('dispatchTimeCallCreate', '2026-02-01T12:02:00Z')
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

      await actions.submitIncident(incidentId)
      const result = await db.prisma.incident.findUniqueOrThrow({ where: { id: incidentId } })
      return result.reviewStatus
    }

    // TODO_pending_sections_2_7_completeness_gate: lib/incidents/get-submit-completeness.ts
    // tags all four of its checks (dispatch/location/narrative/actions-taken)
    // as 'core', which checkIncidentCompleteness always includes regardless
    // of incident type — so the submit gate does NOT currently differ by
    // module relevance at all. That's correct today: Sections 2-7
    // (Fire/Medical/HazSit/etc, see CONTEXT.md's Roadmap) are still
    // mid-rebuild and don't have required-schemas wired into this gate yet.
    // This test is a deliberate tripwire, not stale documentation: once
    // Sections 2-7's required fields DO get wired into getSubmitCompleteness,
    // a FIRE-primary incident should start requiring fire-module fields that
    // a MEDICAL-primary incident doesn't (or vice versa), and this test
    // SHOULD start failing. That failure is the correct, intended outcome —
    // it means the gate genuinely changed — so update this test to assert
    // the new (differing) behavior rather than treating the failure as a
    // regression to silently fix.
    it('TODO_pending_sections_2_7_completeness_gate: FIRE-primary and MEDICAL-primary journeys currently have identical completeness requirements', async () => {
      await setupCallerContext(db.prisma)

      const fireStatus = await runMinimalCoreJourney('FIRE')
      const medicalStatus = await runMinimalCoreJourney('MEDICAL')

      expect(fireStatus).toBe('SUBMITTED')
      expect(medicalStatus).toBe('SUBMITTED')
    })
  })
})
