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

const completeUnitResponse: IncidentDetail['unitResponses'][number] = {
  id: 'ur_1', incidentId: 'incident_test_1', unitIdLinked: 'ENGINE_1', unitIdReported: null,
  unitStaffingReported: null, unableToDispatch: null, responseMode: null, timeDispatch: null,
  timeEnrouteToScene: null, timeOnScene: null, timeCanceledEnroute: null, timeStaging: null,
  timeUnitClear: null, transportMode: null
}

function completeIncident(overrides: Partial<IncidentDetail> = {}) {
  return buildIncidentDetail({
    timeIncidentClear: new Date('2026-01-01T01:00:00Z'),
    location: completeLocation,
    narrativeImpediment: 'None',
    narrativeOutcome: 'Resolved on scene',
    incidentNoActionReason: 'CANCELLED',
    actionsTaken: [],
    unitResponses: [completeUnitResponse],
    ...overrides
  })
}

describe('getSubmitCompleteness', () => {
  it('is complete when every required core field is populated', () => {
    const result = getSubmitCompleteness(completeIncident())
    expect(result).toEqual({ complete: true, missing: [] })
  })

  it('reports a missing timeIncidentClear', () => {
    const result = getSubmitCompleteness(completeIncident({ timeIncidentClear: null }))
    expect(result.complete).toBe(false)
    expect(result.missing.map(m => m.path)).toEqual(['timeIncidentClear'])
  })

  it('does not require dispatchTimeCallArrival/Answer/Create (neris_core_app=FALSE — CAD-populated, not app-required)', () => {
    const result = getSubmitCompleteness(completeIncident({
      dispatchTimeCallArrival: null,
      dispatchTimeCallAnswer: null,
      dispatchTimeCallCreate: null
    }))
    expect(result.complete).toBe(true)
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
      timeIncidentClear: null,
      location: null,
      narrativeImpediment: null,
      narrativeOutcome: null,
      incidentNoActionReason: null,
      actionsTaken: [],
      unitResponses: []
    }))
    expect(result.complete).toBe(false)
    expect(result.missing.length).toBeGreaterThanOrEqual(5)
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

  describe('unit response (dispatch_unit_response is neris_core_app=TRUE, unconditional)', () => {
    it('reports a missing unit response when none is recorded, regardless of incident type', () => {
      const result = getSubmitCompleteness(completeIncident({ types: [], unitResponses: [] }))
      expect(result.complete).toBe(false)
      expect(result.missing.map(m => m.path)).toEqual(['unitResponses'])
    })

    it('is satisfied by at least one recorded unit response', () => {
      const result = getSubmitCompleteness(completeIncident({ unitResponses: [completeUnitResponse] }))
      expect(result.complete).toBe(true)
    })
  })

  describe('exposures (no cardinality requirement — neris_core_if on exposure is ambiguous, see FUTURE-PLAN.md Session 2 findings; per-row validation only)', () => {
    it('does not require any exposure row to exist', () => {
      const result = getSubmitCompleteness(completeIncident({ exposures: [] }))
      expect(result.complete).toBe(true)
    })

    it('reports a missing exposureItem on an external exposure row', () => {
      const result = getSubmitCompleteness(completeIncident({
        exposures: [{
          id: 'exp_1', incidentId: 'incident_test_1', exposureType: 'EXTERNAL_EXPOSURE', exposureItem: null,
          exposureDamage: 'NO_DAMAGE', exposurePeoplePresent: null, exposureDisplacedNumber: null, exposureDisplacedCauses: []
        }]
      }))
      expect(result.complete).toBe(false)
      expect(result.missing.map(m => m.path)).toEqual(['exposures.0.exposureItem'])
    })

    it('reports a missing displacement cause when a displaced number is recorded', () => {
      const result = getSubmitCompleteness(completeIncident({
        exposures: [{
          id: 'exp_1', incidentId: 'incident_test_1', exposureType: 'INTERNAL_EXPOSURE', exposureItem: null,
          exposureDamage: 'MINOR_DAMAGE', exposurePeoplePresent: null, exposureDisplacedNumber: 2, exposureDisplacedCauses: []
        }]
      }))
      expect(result.complete).toBe(false)
      expect(result.missing.map(m => m.path)).toEqual(['exposures.0.exposureDisplacedCauses'])
    })

    it('is satisfied by a fully populated exposure row', () => {
      const result = getSubmitCompleteness(completeIncident({
        exposures: [{
          id: 'exp_1', incidentId: 'incident_test_1', exposureType: 'INTERNAL_EXPOSURE', exposureItem: null,
          exposureDamage: 'MINOR_DAMAGE', exposurePeoplePresent: null, exposureDisplacedNumber: null, exposureDisplacedCauses: []
        }]
      }))
      expect(result.complete).toBe(true)
    })
  })

  describe('rescues (no cardinality requirement — neris_core_if is self-referential "was a rescue involved"; per-row validation only)', () => {
    it('does not require any rescue row to exist', () => {
      const result = getSubmitCompleteness(completeIncident({ rescuesFf: [], rescuesNonFf: [] }))
      expect(result.complete).toBe(true)
    })

    it('reports a missing casualtyType on a firefighter rescue row (ff_casualty_type is neris_core=TRUE, unconditional)', () => {
      const result = getSubmitCompleteness(completeIncident({
        rescuesFf: [{
          id: 'rf_1', incidentId: 'incident_test_1', birthMonthYear: null, gender: null, race: null,
          casualtyRank: null, casualtyService: null, rescueType: 'NO_RESCUE_NEEDED', primaryMode: null,
          actions: [], impedimentTypes: [], mayday: false, maydayRelativeTime: null, ritActivated: null,
          roomType: null, elevationType: null, gasIsolation: null, removalPathType: null, fireRelativeTime: null,
          casualtyType: null, casualtyClassification: null, linkedUnitId: 'ENGINE_1', reportedUnitId: null,
          dutyType: null, casualtyCause: null, casualtyAction: null, casualtyPpe: [], incidentCommand: null,
          casualtyTimeline: null
        }]
      }))
      expect(result.complete).toBe(false)
      expect(result.missing.map(m => m.path)).toEqual(['rescuesFf.0.casualtyType'])
    })

    it('reports a missing rescueType on a civilian rescue row (nonff_rescue_type is neris_core=TRUE, unconditional)', () => {
      const result = getSubmitCompleteness(completeIncident({
        rescuesNonFf: [{
          id: 'rn_1', incidentId: 'incident_test_1', birthMonthYear: null, gender: null, race: null,
          rescueType: null, presenceKnown: null, primaryMode: null, actions: [], impedimentTypes: [],
          roomType: null, elevationType: null, gasIsolation: null, removalPathType: null, fireRelativeTime: null,
          casualtyType: 'UNINJURED', casualtyCause: null
        }]
      }))
      expect(result.complete).toBe(false)
      expect(result.missing.map(m => m.path)).toEqual(['rescuesNonFf.0.rescueType'])
    })

    it('is satisfied by fully populated ff and non-ff rescue rows', () => {
      const result = getSubmitCompleteness(completeIncident({
        rescuesFf: [{
          id: 'rf_1', incidentId: 'incident_test_1', birthMonthYear: null, gender: null, race: null,
          casualtyRank: null, casualtyService: null, rescueType: 'NO_RESCUE_NEEDED', primaryMode: null,
          actions: [], impedimentTypes: [], mayday: false, maydayRelativeTime: null, ritActivated: null,
          roomType: null, elevationType: null, gasIsolation: null, removalPathType: null, fireRelativeTime: null,
          casualtyType: 'UNINJURED', casualtyClassification: null, linkedUnitId: 'ENGINE_1', reportedUnitId: null,
          dutyType: null, casualtyCause: null, casualtyAction: null, casualtyPpe: [], incidentCommand: null,
          casualtyTimeline: null
        }],
        rescuesNonFf: [{
          id: 'rn_1', incidentId: 'incident_test_1', birthMonthYear: null, gender: null, race: null,
          rescueType: 'NO_RESCUE_NEEDED', presenceKnown: null, primaryMode: null, actions: [], impedimentTypes: [],
          roomType: null, elevationType: null, gasIsolation: null, removalPathType: null, fireRelativeTime: null,
          casualtyType: 'UNINJURED', casualtyCause: null
        }]
      }))
      expect(result.complete).toBe(true)
    })
  })
})
