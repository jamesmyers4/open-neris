import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Same factory-mock reasoning as incident-journey.db.test.ts: the bare
// vi.mock('@/lib/auth/current-user') form needs to import the real module
// once, which evaluates the real lib/prisma.ts singleton before this file
// gets a chance to point DATABASE_URL at the test container.
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

// Phase 5: concurrent-write races beyond the internalId counter (already
// covered in Phase 2's ON CONFLICT ... DO UPDATE / concurrency tests). These
// two actions have no optimistic-locking guard (no version column, no
// conditional WHERE on the current state) — these tests characterize what
// actually happens under a real race against a real Postgres instance,
// rather than assuming either "it's fine" or "it's broken".
describe('Concurrent-write races (Testcontainers Postgres)', () => {
  let db: TestDatabase
  let actions: Actions

  beforeAll(async () => {
    db = await startTestDatabase()

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

  describe('two simultaneous updateDispatch calls on the same incident', () => {
    it('lands on exactly one of the two payloads, never a field-level mix of both (single-statement UPDATE has no torn-write risk)', async () => {
      await setupCallerContext(db.prisma)
      const incidentId = await createAndGetIncidentId(actions.createIncident, typesFormData('FIRE'))

      const fdA = new FormData()
      fdA.set('dispatchTimeCallArrival', '2026-02-01T12:00:00Z')
      fdA.set('dispatchTimeCallAnswer', '2026-02-01T12:01:00Z')
      fdA.set('dispatchTimeCallCreate', '2026-02-01T12:02:00Z')
      fdA.set('dispatchDeterminateCode', 'CALLER-A')

      const fdB = new FormData()
      fdB.set('dispatchTimeCallArrival', '2026-03-01T09:00:00Z')
      fdB.set('dispatchTimeCallAnswer', '2026-03-01T09:01:00Z')
      fdB.set('dispatchTimeCallCreate', '2026-03-01T09:02:00Z')
      fdB.set('dispatchDeterminateCode', 'CALLER-B')

      const [resultA, resultB] = await Promise.all([
        actions.updateDispatch(incidentId, {}, fdA),
        actions.updateDispatch(incidentId, {}, fdB)
      ])

      expect(resultA.message).toBe('Saved.')
      expect(resultB.message).toBe('Saved.')

      const final = await db.prisma.incident.findUniqueOrThrow({ where: { id: incidentId } })

      const isA = final.dispatchDeterminateCode === 'CALLER-A'
      const isB = final.dispatchDeterminateCode === 'CALLER-B'
      expect(isA || isB).toBe(true)

      if (isA) {
        expect(final.dispatchTimeCallArrival).toEqual(new Date('2026-02-01T12:00:00Z'))
        expect(final.dispatchTimeCallAnswer).toEqual(new Date('2026-02-01T12:01:00Z'))
        expect(final.dispatchTimeCallCreate).toEqual(new Date('2026-02-01T12:02:00Z'))
      } else {
        expect(final.dispatchTimeCallArrival).toEqual(new Date('2026-03-01T09:00:00Z'))
        expect(final.dispatchTimeCallAnswer).toEqual(new Date('2026-03-01T09:01:00Z'))
        expect(final.dispatchTimeCallCreate).toEqual(new Date('2026-03-01T09:02:00Z'))
      }
    })
  })

  describe('double-submit race on submitIncident', () => {
    async function buildCompleteOpenIncident(): Promise<string> {
      const incidentId = await createAndGetIncidentId(actions.createIncident, typesFormData('FIRE'))

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

      return incidentId
    }

    it('ends up SUBMITTED exactly once in reviewStatus, and does not corrupt the record, under two racing calls', async () => {
      await setupCallerContext(db.prisma)
      const incidentId = await buildCompleteOpenIncident()

      await Promise.all([actions.submitIncident(incidentId), actions.submitIncident(incidentId)])

      const final = await db.prisma.incident.findUniqueOrThrow({ where: { id: incidentId } })
      expect(final.reviewStatus).toBe('SUBMITTED')

      // No optimistic-locking guard exists on this action today (no version
      // column, no conditional WHERE re-checking reviewStatus at write time)
      // — both racing calls can read reviewStatus === 'OPEN' before either
      // writes, so BOTH may proceed to write a ReviewEvent. This assertion
      // documents that as a known, current gap rather than silently locking
      // in "always exactly one event" as a false guarantee: at least one
      // event is written, and every event that IS written is well-formed
      // (correct from/to status), but the count is not guaranteed to be 1.
      const events = await db.prisma.reviewEvent.findMany({ where: { incidentId } })
      expect(events.length).toBeGreaterThanOrEqual(1)
      for (const event of events) {
        expect(event).toMatchObject({ fromStatus: 'OPEN', toStatus: 'SUBMITTED' })
      }
    })
  })
})
