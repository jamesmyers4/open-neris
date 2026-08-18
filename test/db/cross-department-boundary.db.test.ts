import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Same factory-mock reasoning as incident-journey.db.test.ts.
vi.mock('@/lib/auth/current-user', () => ({ getCurrentAppUser: vi.fn() }))

import { startTestDatabase, stopTestDatabase, type TestDatabase } from '@/test/helpers/db'
import { createTestDepartment, createTestUser, createTestIncident } from '@/test/helpers/db-fixtures'
import { mockSignedInAs } from '@/test/helpers/auth'

type Actions = {
  submitIncident: typeof import('@/app/incidents/[id]/actions').submitIncident
  setNoActionReason: typeof import('@/app/incidents/[id]/actions-taken/actions').setNoActionReason
  addActionTaken: typeof import('@/app/incidents/[id]/actions-taken/actions').addActionTaken
  removeActionTaken: typeof import('@/app/incidents/[id]/actions-taken/actions').removeActionTaken
  updateDispatch: typeof import('@/app/incidents/[id]/dispatch/actions').updateDispatch
  addDispatchComment: typeof import('@/app/incidents/[id]/dispatch/actions').addDispatchComment
  createExposure: typeof import('@/app/incidents/[id]/exposures/actions').createExposure
  updateLocation: typeof import('@/app/incidents/[id]/location/actions').updateLocation
  updateMutualAid: typeof import('@/app/incidents/[id]/mutual-aid/actions').updateMutualAid
  updateNarrative: typeof import('@/app/incidents/[id]/narrative/actions').updateNarrative
  updatePeople: typeof import('@/app/incidents/[id]/people-displacement/actions').updatePeople
  addDisplacement: typeof import('@/app/incidents/[id]/people-displacement/actions').addDisplacement
}

// Phase 5: cross-department id-guessing, deepened beyond Phase 3's one
// mock-based boundary test per action. These run the real departmentId-scoped
// findFirst guard against genuine adjacent rows in a real Postgres instance —
// Phase 3 proved the *intent* (the right where-clause shape against a mock);
// this proves the *effect* holds against real data.
//
// No soft-deleted-equivalent state exists in this schema (confirmed against
// prisma/schema.prisma — no deletedAt/isDeleted/archivedAt field on Incident
// or any child model), so that sub-case from the phase plan does not apply
// here; a genuinely nonexistent id is the only "gone" state this app has.
describe('Cross-department id-guessing (Testcontainers Postgres)', () => {
  let db: TestDatabase
  let actions: Actions

  beforeAll(async () => {
    db = await startTestDatabase()

    ;(globalThis as { prisma?: unknown }).prisma = undefined
    process.env.DATABASE_URL = db.container.getConnectionUri()

    const [idActions, actionsTakenActions, dispatchActions, exposuresActions, locationActions, mutualAidActions, narrativeActions, peopleActions] =
      await Promise.all([
        import('@/app/incidents/[id]/actions'),
        import('@/app/incidents/[id]/actions-taken/actions'),
        import('@/app/incidents/[id]/dispatch/actions'),
        import('@/app/incidents/[id]/exposures/actions'),
        import('@/app/incidents/[id]/location/actions'),
        import('@/app/incidents/[id]/mutual-aid/actions'),
        import('@/app/incidents/[id]/narrative/actions'),
        import('@/app/incidents/[id]/people-displacement/actions')
      ])

    actions = {
      submitIncident: idActions.submitIncident,
      setNoActionReason: actionsTakenActions.setNoActionReason,
      addActionTaken: actionsTakenActions.addActionTaken,
      removeActionTaken: actionsTakenActions.removeActionTaken,
      updateDispatch: dispatchActions.updateDispatch,
      addDispatchComment: dispatchActions.addDispatchComment,
      createExposure: exposuresActions.createExposure,
      updateLocation: locationActions.updateLocation,
      updateMutualAid: mutualAidActions.updateMutualAid,
      updateNarrative: narrativeActions.updateNarrative,
      updatePeople: peopleActions.updatePeople,
      addDisplacement: peopleActions.addDisplacement
    }
  })

  afterAll(async () => {
    await stopTestDatabase(db)
  })

  beforeEach(() => {
    vi.resetAllMocks()
  })

  async function setupTwoDepartments() {
    const departmentA = await createTestDepartment(db.prisma)
    const userA = await createTestUser(db.prisma, departmentA.id)
    const incidentA = await createTestIncident(db.prisma, departmentA.id, userA.id)

    const departmentB = await createTestDepartment(db.prisma)
    const userB = await createTestUser(db.prisma, departmentB.id)
    const incidentB = await createTestIncident(db.prisma, departmentB.id, userB.id)

    return { departmentA, userA, incidentA, departmentB, userB, incidentB }
  }

  function actAsUserB(userB: { id: string; departmentId: string; clerkId: string; name: string; email: string }) {
    mockSignedInAs(userB)
  }

  describe('adjacent-but-wrong incident IDs — a genuine row that exists, just in a different department', () => {
    it('rejects setNoActionReason', async () => {
      const { userB, incidentA } = await setupTwoDepartments()
      actAsUserB(userB)
      const fd = new FormData()
      fd.set('incidentNoActionReason', 'CANCELLED')

      const result = await actions.setNoActionReason(incidentA.id, {}, fd)

      expect(result.message).toMatch(/not found/i)
      const untouched = await db.prisma.incident.findUniqueOrThrow({ where: { id: incidentA.id } })
      expect(untouched.incidentNoActionReason).toBeNull()
    })

    it('rejects addActionTaken', async () => {
      const { userB, incidentA } = await setupTwoDepartments()
      actAsUserB(userB)
      const fd = new FormData()
      fd.set('value1', 'FORCIBLE_ENTRY')

      const result = await actions.addActionTaken(incidentA.id, {}, fd)

      expect(result.message).toMatch(/not found/i)
      expect(await db.prisma.incidentActionTaken.count({ where: { incidentId: incidentA.id } })).toBe(0)
    })

    it('rejects updateDispatch', async () => {
      const { userB, incidentA } = await setupTwoDepartments()
      actAsUserB(userB)
      const fd = new FormData()
      fd.set('dispatchTimeCallArrival', '2026-01-01T00:00:00Z')

      const result = await actions.updateDispatch(incidentA.id, {}, fd)

      expect(result.message).toMatch(/not found/i)
      const untouched = await db.prisma.incident.findUniqueOrThrow({ where: { id: incidentA.id } })
      expect(untouched.dispatchTimeCallArrival).toBeNull()
    })

    it('rejects addDispatchComment', async () => {
      const { userB, incidentA } = await setupTwoDepartments()
      actAsUserB(userB)
      const fd = new FormData()
      fd.set('comment', 'Should never land')
      fd.set('timestamp', '2026-01-01T00:00:00Z')

      const result = await actions.addDispatchComment(incidentA.id, {}, fd)

      expect(result.message).toMatch(/not found/i)
      expect(await db.prisma.incidentDispatchComment.count({ where: { incidentId: incidentA.id } })).toBe(0)
    })

    it('rejects createExposure', async () => {
      const { userB, incidentA } = await setupTwoDepartments()
      actAsUserB(userB)
      const fd = new FormData()
      fd.set('exposureType', 'INTERNAL_EXPOSURE')
      fd.set('exposureDamage', 'MINOR_DAMAGE')

      const result = await actions.createExposure(incidentA.id, {}, fd)

      expect(result.message).toMatch(/not found/i)
      expect(await db.prisma.incidentExposure.count({ where: { incidentId: incidentA.id } })).toBe(0)
    })

    it('rejects updateLocation', async () => {
      const { userB, incidentA } = await setupTwoDepartments()
      actAsUserB(userB)
      const fd = new FormData()
      fd.set('streetAddressComplete', 'Should never land')
      fd.set('state', 'NY')

      const result = await actions.updateLocation(incidentA.id, {}, fd)

      expect(result.message).toMatch(/not found/i)
      expect(await db.prisma.incidentLocation.findUnique({ where: { incidentId: incidentA.id } })).toBeNull()
    })

    it('rejects updateMutualAid', async () => {
      const { userB, incidentA } = await setupTwoDepartments()
      actAsUserB(userB)
      const fd = new FormData()
      fd.set('aidDirection', 'GIVEN')

      const result = await actions.updateMutualAid(incidentA.id, {}, fd)

      expect(result.message).toMatch(/not found/i)
      const untouched = await db.prisma.incident.findUniqueOrThrow({ where: { id: incidentA.id } })
      expect(untouched.aidDirection).toBeNull()
    })

    it('rejects updateNarrative', async () => {
      const { userB, incidentA } = await setupTwoDepartments()
      actAsUserB(userB)
      const fd = new FormData()
      fd.set('narrativeOutcome', 'Should never land')

      const result = await actions.updateNarrative(incidentA.id, {}, fd)

      expect(result.message).toMatch(/not found/i)
      const untouched = await db.prisma.incident.findUniqueOrThrow({ where: { id: incidentA.id } })
      expect(untouched.narrativeOutcome).toBeNull()
    })

    it('rejects updatePeople', async () => {
      const { userB, incidentA } = await setupTwoDepartments()
      actAsUserB(userB)
      const fd = new FormData()
      fd.set('incidentRescueAnimal', '3')

      const result = await actions.updatePeople(incidentA.id, {}, fd)

      expect(result.message).toMatch(/not found/i)
      const untouched = await db.prisma.incident.findUniqueOrThrow({ where: { id: incidentA.id } })
      expect(untouched.incidentRescueAnimal).toBeNull()
    })

    it('rejects addDisplacement', async () => {
      const { userB, incidentA } = await setupTwoDepartments()
      actAsUserB(userB)
      const fd = new FormData()
      fd.append('causes', 'FIRE')

      const result = await actions.addDisplacement(incidentA.id, {}, fd)

      expect(result.message).toMatch(/not found/i)
      expect(await db.prisma.incidentDisplacement.count({ where: { incidentId: incidentA.id } })).toBe(0)
    })

    it('leaves submitIncident a silent no-op (returns void, does not throw, does not transition status)', async () => {
      const { userB, incidentA } = await setupTwoDepartments()
      actAsUserB(userB)

      await expect(actions.submitIncident(incidentA.id)).resolves.toBeUndefined()

      const untouched = await db.prisma.incident.findUniqueOrThrow({ where: { id: incidentA.id } })
      expect(untouched.reviewStatus).toBe('OPEN')
      expect(await db.prisma.reviewEvent.count({ where: { incidentId: incidentA.id } })).toBe(0)
    })
  })

  describe('nested-row IDs that exist but under a different incident within the SAME department', () => {
    it('rejects removeActionTaken when actionTakenId belongs to a sibling incident in the same department', async () => {
      const department = await createTestDepartment(db.prisma)
      const user = await createTestUser(db.prisma, department.id)
      const incidentOne = await createTestIncident(db.prisma, department.id, user.id)
      const incidentTwo = await createTestIncident(db.prisma, department.id, user.id)
      const actionOnIncidentOne = await db.prisma.incidentActionTaken.create({
        data: { incidentId: incidentOne.id, value1: 'FORCIBLE_ENTRY' }
      })
      mockSignedInAs(user)

      // Caller passes incidentTwo's id (a real incident they DO own) paired
      // with an actionTakenId that is real but belongs to incidentOne — the
      // guard must key on the (id, incidentId) pair together, not either
      // alone, or this would incorrectly succeed.
      await actions.removeActionTaken(incidentTwo.id, actionOnIncidentOne.id)

      const stillThere = await db.prisma.incidentActionTaken.findUnique({ where: { id: actionOnIncidentOne.id } })
      expect(stillThere).not.toBeNull()
    })

    it('allows removeActionTaken when the actionTakenId genuinely belongs to the given incidentId', async () => {
      const department = await createTestDepartment(db.prisma)
      const user = await createTestUser(db.prisma, department.id)
      const incident = await createTestIncident(db.prisma, department.id, user.id)
      const action = await db.prisma.incidentActionTaken.create({ data: { incidentId: incident.id, value1: 'FORCIBLE_ENTRY' } })
      mockSignedInAs(user)

      await actions.removeActionTaken(incident.id, action.id)

      expect(await db.prisma.incidentActionTaken.findUnique({ where: { id: action.id } })).toBeNull()
    })
  })
})
