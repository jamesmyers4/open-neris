import { describe, expect, it } from 'vitest'
import { getSubmitCompleteness } from '@/lib/incidents/get-submit-completeness'
import { buildIncidentDetail } from '@/test/helpers/fixtures'
import type { IncidentDetail } from '@/lib/incidents/get-incident-detail'

const completeLocation: IncidentDetail['location'] = {
  id: 'loc_1',
  incidentId: 'incident_test_1',
  streetAddressComplete: '123 Main St',
  city: null,
  county: null,
  state: 'NY',
  postalCode: null,
  country: 'US',
  place: null,
  useType: null,
  useSubtype: null,
  useVacancy: null,
  civicLocationCipher: null
}

function completeIncident(overrides: Partial<IncidentDetail> = {}) {
  return buildIncidentDetail({
    dispatchTimeCallArrival: new Date('2026-01-01T00:00:00Z'),
    dispatchTimeCallAnswer: new Date('2026-01-01T00:01:00Z'),
    dispatchTimeCallCreate: new Date('2026-01-01T00:02:00Z'),
    location: completeLocation,
    narrativeImpediment: 'None',
    narrativeOutcome: 'Resolved on scene',
    incidentNoActionReason: 'CANCELLED',
    actionsTaken: [],
    ...overrides
  })
}

describe('getSubmitCompleteness', () => {
  it('is complete when every required core field is populated', () => {
    const result = getSubmitCompleteness(completeIncident())
    expect(result).toEqual({ complete: true, missing: [] })
  })

  it('reports missing dispatch timestamps', () => {
    const result = getSubmitCompleteness(completeIncident({
      dispatchTimeCallArrival: null,
      dispatchTimeCallAnswer: null,
      dispatchTimeCallCreate: null
    }))
    expect(result.complete).toBe(false)
    expect(result.missing.map(m => m.path).sort()).toEqual([
      'dispatchTimeCallAnswer',
      'dispatchTimeCallArrival',
      'dispatchTimeCallCreate'
    ])
  })

  it('reports missing location when no location row exists', () => {
    const result = getSubmitCompleteness(completeIncident({ location: null }))
    expect(result.complete).toBe(false)
    expect(result.missing.map(m => m.path).sort()).toEqual(['state', 'streetAddressComplete'])
  })

  it('reports missing narrative fields', () => {
    const result = getSubmitCompleteness(completeIncident({ narrativeImpediment: null, narrativeOutcome: null }))
    expect(result.complete).toBe(false)
    expect(result.missing.map(m => m.path).sort()).toEqual(['narrativeImpediment', 'narrativeOutcome'])
  })

  it('reports a missing actions-taken/no-action reason when neither is set', () => {
    const result = getSubmitCompleteness(completeIncident({ incidentNoActionReason: null, actionsTaken: [] }))
    expect(result.complete).toBe(false)
    expect(result.missing.map(m => m.path)).toEqual(['incidentActionsTaken'])
  })

  it('is satisfied by a recorded action taken, with no no-action reason set', () => {
    const result = getSubmitCompleteness(completeIncident({
      incidentNoActionReason: null,
      actionsTaken: [{ id: 'a1', incidentId: 'incident_test_1', value1: 'FORCIBLE_ENTRY', value2: null, sortOrder: 0 }]
    }))
    expect(result.complete).toBe(true)
  })

  it('is satisfied by a no-action reason alone, with no actions taken', () => {
    const result = getSubmitCompleteness(completeIncident({ incidentNoActionReason: 'STAGED_STANDBY', actionsTaken: [] }))
    expect(result.complete).toBe(true)
  })

  it('aggregates missing fields across every required check at once', () => {
    const result = getSubmitCompleteness(completeIncident({
      dispatchTimeCallArrival: null,
      dispatchTimeCallAnswer: null,
      dispatchTimeCallCreate: null,
      location: null,
      narrativeImpediment: null,
      narrativeOutcome: null,
      incidentNoActionReason: null,
      actionsTaken: []
    }))
    expect(result.complete).toBe(false)
    expect(result.missing.length).toBeGreaterThanOrEqual(6)
  })

  it('runs the same core-only checks regardless of incident types, when no type-gated module applies', () => {
    const withNoTypes = getSubmitCompleteness(completeIncident({ types: [] }))
    expect(withNoTypes.complete).toBe(true)
  })

  const fireType = { id: 't1', incidentId: 'incident_test_1', value1: 'FIRE', value2: null, value3: null, isPrimary: true, sortOrder: 0 }
  const medicalType = { id: 't1', incidentId: 'incident_test_1', value1: 'MEDICAL', value2: null, value3: null, isPrimary: true, sortOrder: 0 }
  const hazsitType = { id: 't1', incidentId: 'incident_test_1', value1: 'HAZSIT', value2: null, value3: null, isPrimary: true, sortOrder: 0 }

  it('reports missing fire details for a FIRE incident with no fire record', () => {
    const result = getSubmitCompleteness(completeIncident({ types: [fireType], fire: null }))
    expect(result.complete).toBe(false)
    expect(result.missing.map(m => m.path)).toEqual(['fireInvestigationNeed'])
  })

  it('is satisfied by a FIRE incident with fire investigation-need recorded', () => {
    const result = getSubmitCompleteness(completeIncident({
      types: [fireType],
      fire: {
        id: 'fire_1', incidentId: 'incident_test_1', fireSuppressionAppliance: [], fireWaterSupply: null,
        fireInvestigationNeed: 'NO', fireInvestigationType: [], structureArrivalConditions: null,
        structureProgressionConditions: null, structureDamage: null, structureFloorOfOrigin: null,
        structureRoomOfOrigin: null, structureFireCause: null, outsideFireCause: null, outsideFireAcresBurned: null
      }
    }))
    expect(result.complete).toBe(true)
  })

  it('does not require fire details for a non-FIRE incident', () => {
    const result = getSubmitCompleteness(completeIncident({ types: [], fire: null }))
    expect(result.complete).toBe(true)
  })

  it('reports missing patient record for a MEDICAL incident with no medicals', () => {
    const result = getSubmitCompleteness(completeIncident({ types: [medicalType], medicals: [] }))
    expect(result.complete).toBe(false)
    expect(result.missing.map(m => m.path)).toEqual(['hasPatientRecord'])
  })

  it('is satisfied by a MEDICAL incident with at least one patient record', () => {
    const result = getSubmitCompleteness(completeIncident({
      types: [medicalType],
      medicals: [{
        id: 'med_1', incidentId: 'incident_test_1', patientCareReport: null,
        patientEvaluationCare: 'PATIENT_EVALUATED_CARE_PROVIDED', patientImprovedStatus: null, medicalDisposition: null
      }]
    }))
    expect(result.complete).toBe(true)
  })

  it('reports missing hazsit details for a HAZSIT incident with no hazsit record', () => {
    const result = getSubmitCompleteness(completeIncident({ types: [hazsitType], hazsit: null }))
    expect(result.complete).toBe(false)
    expect(result.missing.map(m => m.path).sort()).toEqual(['hazsitDisposition', 'hazsitEvacuated'])
  })

  it('is satisfied by a HAZSIT incident with disposition and evacuated count recorded', () => {
    const result = getSubmitCompleteness(completeIncident({
      types: [hazsitType],
      hazsit: { id: 'hazsit_1', incidentId: 'incident_test_1', hazsitDisposition: 'COMPLETED_FIRE_SERVICE_ONLY', hazsitEvacuated: 0, chemicals: [] }
    }))
    expect(result.complete).toBe(true)
  })
})
