import type { IncidentDetail } from '@/lib/incidents/get-incident-detail'

// A minimal, fully-typed IncidentDetail — matches the exact shape Prisma's
// getIncidentDetail() include produces, so it stays honest against schema
// drift (TS errors here, not a stringly-typed mock, if a field is renamed).
export function buildIncidentDetail(overrides: Partial<IncidentDetail> = {}): IncidentDetail {
  const now = new Date('2026-01-01T00:00:00Z')

  return {
    id: 'incident_test_1',
    departmentId: 'dept_test_1',
    internalId: '2026-000001',
    nerisIncidentId: null,
    reviewStatus: 'OPEN',
    createdById: 'user_test_1',
    reviewedById: null,
    approvedById: null,
    incidentDate: now,
    alarmTime: now,
    specialModifiers: [],
    incidentPointLat: null,
    incidentPointLng: null,
    incidentPeoplePresent: null,
    incidentRescueAnimal: null,
    incidentNoActionReason: null,
    aidDirection: null,
    aidType: null,
    aidDepartmentNames: [],
    aidNonFdTypes: [],
    narrativeImpediment: null,
    narrativeOutcome: null,
    dispatchTimeCallCreate: null,
    dispatchTimeCallAnswer: null,
    dispatchTimeCallArrival: null,
    timeIncidentClear: null,
    dispatchAutomaticAlarm: null,
    dispatchFinalDisposition: null,
    dispatchDeterminateCode: null,
    dispatchIncidentCode: null,
    createdAt: now,
    updatedAt: now,
    types: [],
    actionsTaken: [],
    dispatchComments: [],
    displacements: [],
    location: null,
    exposures: [],
    createdBy: {
      id: 'user_test_1',
      departmentId: 'dept_test_1',
      clerkId: 'clerk_test_1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'MEMBER',
      createdAt: now,
      updatedAt: now
    },
    ...overrides
  }
}
