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
  upsertFire: typeof import('@/app/incidents/[id]/fire/actions').upsertFire
}

// Phase 5: concurrent-write races beyond the internalId counter (already
// covered in Phase 2's ON CONFLICT ... DO UPDATE / concurrency tests). These
// tests characterize what actually happens under a real race against a real
// Postgres instance, rather than assuming either "it's fine" or "it's
// broken". updateDispatch has no optimistic-locking guard (single-statement
// UPDATE, last-write-wins by design); submitIncident gained one in Phase 7
// (see TESTING.md) — a conditional updateMany re-checking reviewStatus at
// write time.
describe('Concurrent-write races (Testcontainers Postgres)', () => {
  let db: TestDatabase
  let actions: Actions

  beforeAll(async () => {
    db = await startTestDatabase()

    ;(globalThis as { prisma?: unknown }).prisma = undefined
    process.env.DATABASE_URL = db.container.getConnectionUri()

    const [incidentActions, idActions, dispatchActions, locationActions, narrativeActions, actionsTakenActions, fireActions] = await Promise.all([
      import('@/app/incidents/actions'),
      import('@/app/incidents/[id]/actions'),
      import('@/app/incidents/[id]/dispatch/actions'),
      import('@/app/incidents/[id]/location/actions'),
      import('@/app/incidents/[id]/narrative/actions'),
      import('@/app/incidents/[id]/actions-taken/actions'),
      import('@/app/incidents/[id]/fire/actions')
    ])

    actions = {
      createIncident: incidentActions.createIncident,
      submitIncident: idActions.submitIncident,
      updateDispatch: dispatchActions.updateDispatch,
      updateLocation: locationActions.updateLocation,
      updateNarrative: narrativeActions.updateNarrative,
      setNoActionReason: actionsTakenActions.setNoActionReason,
      upsertFire: fireActions.upsertFire
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

      const fireFd = new FormData()
      fireFd.set('fireInvestigationNeed', 'NO')
      await actions.upsertFire(incidentId, {}, fireFd)

      return incidentId
    }

    it('ends up SUBMITTED exactly once in reviewStatus, with exactly one ReviewEvent, under two racing calls', async () => {
      await setupCallerContext(db.prisma)
      const incidentId = await buildCompleteOpenIncident()

      await Promise.all([actions.submitIncident(incidentId), actions.submitIncident(incidentId)])

      const final = await db.prisma.incident.findUniqueOrThrow({ where: { id: incidentId } })
      expect(final.reviewStatus).toBe('SUBMITTED')

      // Fixed in Phase 7 (see TESTING.md): submitIncident now re-checks
      // reviewStatus at write time via a conditional updateMany inside the
      // transaction, so only one of the two racing calls can win. This
      // asserts the tightened guarantee — exactly one ReviewEvent, not just
      // "at least one" — that wasn't safe to assert before the fix.
      const events = await db.prisma.reviewEvent.findMany({ where: { incidentId } })
      expect(events).toHaveLength(1)
      expect(events[0]).toMatchObject({ fromStatus: 'OPEN', toStatus: 'SUBMITTED' })
    })
  })
})
