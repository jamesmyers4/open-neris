import { describe, expect, it } from 'vitest'
import { buildIncidentDetail } from '@/test/helpers/fixtures'
import { buildIncidentPayload } from '@/lib/neris/build-incident-payload'
import type { IncidentDetail } from '@/lib/incidents/get-incident-detail'

const now = new Date('2026-01-01T12:00:00Z')

function withDispatchCore(overrides: Partial<IncidentDetail> = {}): Partial<IncidentDetail> {
  return {
    dispatchTimeCallArrival: now,
    dispatchTimeCallAnswer: now,
    dispatchTimeCallCreate: now,
    timeIncidentClear: now,
    location: {
      id: 'loc_1',
      incidentId: 'incident_test_1',
      streetAddressComplete: '123 Main St',
      city: 'Fairfax',
      county: 'Fairfax County',
      state: 'VA',
      postalCode: '22030',
      country: 'US',
      place: null,
      useType: null,
      useSubtype: null,
      useVacancy: null,
      civicLocationCipher: null
    },
    types: [{ id: 't1', incidentId: 'incident_test_1', value1: 'FIRE', value2: 'OUTSIDE_FIRE', value3: 'VEGETATION_GRASS_FIRE', isPrimary: true, sortOrder: 0 }],
    unitResponses: [
      {
        id: 'ur_1',
        incidentId: 'incident_test_1',
        unitIdLinked: 'unit_1',
        unitIdReported: null,
        unitStaffingReported: 3,
        unableToDispatch: false,
        responseMode: null,
        timeDispatch: now,
        timeEnrouteToScene: null,
        timeOnScene: null,
        timeCanceledEnroute: null,
        timeStaging: null,
        timeUnitClear: null,
        transportMode: null,
        unit: { id: 'unit_1', stationId: 'station_1', designation: 'ENGINE 1', capabilityType: 'ENGINE_STRUCT', nerisUnitId: 'FD24027334S001U001', createdAt: now, updatedAt: now }
      }
    ],
    ...overrides
  }
}

describe('buildIncidentPayload', () => {
  it('fails with a clear error when the department NERIS ID is missing', () => {
    const incident = buildIncidentDetail(withDispatchCore())
    const result = buildIncidentPayload(incident, null)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.some(e => e.includes('nerisFdId'))).toBe(true)
  })

  it('fails with a clear error when location is missing', () => {
    const incident = buildIncidentDetail(withDispatchCore({ location: null }))
    const result = buildIncidentPayload(incident, 'FD24027334')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.some(e => e.includes('location'))).toBe(true)
  })

  it('fails with a clear error when dispatch call timestamps are missing, even though this app\'s own data entry allows it', () => {
    const incident = buildIncidentDetail(withDispatchCore({ dispatchTimeCallArrival: null }))
    const result = buildIncidentPayload(incident, 'FD24027334')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.some(e => e.includes('call_arrival'))).toBe(true)
  })

  it('fails with a clear error when there is no primary incident type', () => {
    const incident = buildIncidentDetail(withDispatchCore({ types: [] }))
    const result = buildIncidentPayload(incident, 'FD24027334')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.some(e => e.includes('primary'))).toBe(true)
  })

  it('builds a valid payload for a minimal complete incident, joining hierarchical type values with ||', () => {
    const incident = buildIncidentDetail(withDispatchCore())
    const result = buildIncidentPayload(incident, 'FD24027334')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload.base).toMatchObject({ department_neris_id: 'FD24027334', incident_number: incident.internalId })
    expect(result.payload.incident_types).toEqual([{ type: 'FIRE||OUTSIDE_FIRE||VEGETATION_GRASS_FIRE', primary: true }])
    expect(result.payload.dispatch).toMatchObject({
      call_arrival: now.toISOString(),
      call_answered: now.toISOString(),
      call_create: now.toISOString(),
      incident_clear: now.toISOString()
    })
    expect(result.payload.unit_responses).toEqual([
      expect.objectContaining({ unit_neris_id: 'FD24027334S001U001', staffing: 3 })
    ])
  })

  it('does not include fire_detail when the incident type is not FIRE-relevant', () => {
    const incident = buildIncidentDetail(withDispatchCore({
      types: [{ id: 't1', incidentId: 'incident_test_1', value1: 'MEDICAL', value2: null, value3: null, isPrimary: true, sortOrder: 0 }],
      fire: { id: 'f1', incidentId: 'incident_test_1', fireSuppressionAppliance: [], fireWaterSupply: 'NONE', fireInvestigationNeed: 'NO', fireInvestigationType: ['NONE'], structureArrivalConditions: null, structureProgressionConditions: null, structureDamage: null, structureFloorOfOrigin: null, structureRoomOfOrigin: null, structureFireCause: null, outsideFireCause: null, outsideFireAcresBurned: null }
    }))
    const result = buildIncidentPayload(incident, 'FD24027334')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload.fire_detail).toBeUndefined()
  })

  it('omits fire_detail entirely when the app-collected data cannot satisfy the NERIS-required nested fields', () => {
    const incident = buildIncidentDetail(withDispatchCore({
      fire: { id: 'f1', incidentId: 'incident_test_1', fireSuppressionAppliance: [], fireWaterSupply: null, fireInvestigationNeed: 'NO', fireInvestigationType: [], structureArrivalConditions: null, structureProgressionConditions: null, structureDamage: null, structureFloorOfOrigin: null, structureRoomOfOrigin: null, structureFireCause: null, outsideFireCause: null, outsideFireAcresBurned: null }
    }))
    const result = buildIncidentPayload(incident, 'FD24027334')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload.fire_detail).toBeUndefined()
  })

  it('builds fire_detail for an outside fire when the required fields are present', () => {
    const incident = buildIncidentDetail(withDispatchCore({
      fire: { id: 'f1', incidentId: 'incident_test_1', fireSuppressionAppliance: ['SMALL_DIAMETER_FIRE_HOSE'], fireWaterSupply: 'TANK_WATER', fireInvestigationNeed: 'NO', fireInvestigationType: ['NONE'], structureArrivalConditions: null, structureProgressionConditions: null, structureDamage: null, structureFloorOfOrigin: null, structureRoomOfOrigin: null, structureFireCause: null, outsideFireCause: 'VEGETATION', outsideFireAcresBurned: 2.5 }
    }))
    const result = buildIncidentPayload(incident, 'FD24027334')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload.fire_detail).toMatchObject({
      water_supply: 'TANK_WATER',
      location_detail: { type: 'OUTSIDE', cause: 'VEGETATION', acres_burned: 2.5 }
    })
  })

  it('omits hazsit_detail when hazsitEvacuated is null, since the NERIS schema requires it unconditionally', () => {
    const incident = buildIncidentDetail(withDispatchCore({
      types: [{ id: 't1', incidentId: 'incident_test_1', value1: 'HAZSIT', value2: null, value3: null, isPrimary: true, sortOrder: 0 }],
      hazsit: { id: 'h1', incidentId: 'incident_test_1', hazsitDisposition: 'COMPLETED_FIRE_SERVICE_ONLY', hazsitEvacuated: null, chemicals: [] }
    }))
    const result = buildIncidentPayload(incident, 'FD24027334')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload.hazsit_detail).toBeUndefined()
  })

  it('builds hazsit_detail with chemicals when fully populated', () => {
    const incident = buildIncidentDetail(withDispatchCore({
      types: [{ id: 't1', incidentId: 'incident_test_1', value1: 'HAZSIT', value2: null, value3: null, isPrimary: true, sortOrder: 0 }],
      hazsit: {
        id: 'h1',
        incidentId: 'incident_test_1',
        hazsitDisposition: 'COMPLETED_FIRE_SERVICE_ONLY',
        hazsitEvacuated: 0,
        chemicals: [{ id: 'c1', hazsitId: 'h1', dotClass: '3', chemicalName: 'Gasoline', releaseOccurred: true, amountEst: 5, amountEstUnits: 'GALLONS', physicalState: 'LIQUID', releaseInto: 'GROUND', releaseCause: 'ACCIDENT' }]
      }
    }))
    const result = buildIncidentPayload(incident, 'FD24027334')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload.hazsit_detail).toMatchObject({
      evacuated: 0,
      chemicals: [expect.objectContaining({ name: 'Gasoline', dot_class: '3', release_occurred: true })]
    })
  })

  it('maps medical records directly, since patientEvaluationCare is always required locally', () => {
    const incident = buildIncidentDetail(withDispatchCore({
      medicals: [{ id: 'm1', incidentId: 'incident_test_1', patientCareReport: 'PCR-1', patientEvaluationCare: 'PATIENT_EVALUATED_CARE_PROVIDED', patientImprovedStatus: null, medicalDisposition: null }]
    }))
    const result = buildIncidentPayload(incident, 'FD24027334')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload.medical_details).toEqual([
      expect.objectContaining({ patient_care_evaluation: 'PATIENT_EVALUATED_CARE_PROVIDED', patient_care_report_id: 'PCR-1' })
    ])
  })

  it('omits an exposure record entirely when exposureDamage is missing, rather than sending an invalid one', () => {
    const incident = buildIncidentDetail(withDispatchCore({
      exposures: [{ id: 'e1', incidentId: 'incident_test_1', exposureType: 'EXTERNAL_EXPOSURE', exposureItem: 'STRUCTURE', exposureDamage: null, exposurePeoplePresent: null, exposureDisplacedNumber: null, exposureDisplacedCauses: [] }]
    }))
    const result = buildIncidentPayload(incident, 'FD24027334')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload.exposures).toBeUndefined()
  })

  it('builds an exposure record with the EXTERNAL_EXPOSURE location_detail discriminator', () => {
    const incident = buildIncidentDetail(withDispatchCore({
      exposures: [{ id: 'e1', incidentId: 'incident_test_1', exposureType: 'EXTERNAL_EXPOSURE', exposureItem: 'STRUCTURE', exposureDamage: 'MINOR_DAMAGE', exposurePeoplePresent: true, exposureDisplacedNumber: null, exposureDisplacedCauses: [] }]
    }))
    const result = buildIncidentPayload(incident, 'FD24027334')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload.exposures).toEqual([
      expect.objectContaining({ damage_type: 'MINOR_DAMAGE', location_detail: { type: 'EXTERNAL_EXPOSURE', item_type: 'STRUCTURE' } })
    ])
  })

  it('omits the FF rescue detail sub-object when no structure-removal data was collected, but still includes the casualty classification', () => {
    const incident = buildIncidentDetail(withDispatchCore({
      rescuesFf: [{
        id: 'r1', incidentId: 'incident_test_1', birthMonthYear: null, gender: null, race: null,
        casualtyRank: null, casualtyService: null, rescueType: 'RESCUED_BY_FIREFIGHTER', primaryMode: null,
        actions: [], impedimentTypes: [], mayday: false, maydayRelativeTime: null, ritActivated: null,
        roomType: null, elevationType: null, gasIsolation: null, removalPathType: null, fireRelativeTime: null,
        casualtyType: 'UNINJURED', casualtyClassification: null, linkedUnitId: 'FD24027334S001U001', reportedUnitId: null,
        dutyType: null, casualtyCause: null, casualtyAction: null, casualtyPpe: [], incidentCommand: null, casualtyTimeline: null
      }]
    }))
    const result = buildIncidentPayload(incident, 'FD24027334')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const rescue = (result.payload.casualty_rescues as Array<Record<string, unknown>>)[0]
    expect(rescue.type).toBe('FF')
    expect(rescue.rescue).toBeUndefined()
    expect(rescue.casualty).toEqual({ injury_or_noninjury: { type: 'UNINJURED' } })
  })

  it('includes the FF removal detail when structure-removal data is present', () => {
    const incident = buildIncidentDetail(withDispatchCore({
      rescuesFf: [{
        id: 'r1', incidentId: 'incident_test_1', birthMonthYear: '06/1985', gender: 'MALE', race: null,
        casualtyRank: 'Captain', casualtyService: 10, rescueType: 'RESCUED_BY_FIREFIGHTER', primaryMode: null,
        actions: [], impedimentTypes: [], mayday: true, maydayRelativeTime: null, ritActivated: false,
        roomType: 'BEDROOM', elevationType: null, gasIsolation: true, removalPathType: 'WINDOW', fireRelativeTime: null,
        casualtyType: 'INJURED_NONFATAL', casualtyClassification: null, linkedUnitId: 'FD24027334S001U001', reportedUnitId: null,
        dutyType: null, casualtyCause: null, casualtyAction: null, casualtyPpe: [], incidentCommand: null, casualtyTimeline: null
      }]
    }))
    const result = buildIncidentPayload(incident, 'FD24027334')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const rescue = (result.payload.casualty_rescues as Array<Record<string, unknown>>)[0]
    const rescueDetail = rescue.rescue as Record<string, unknown>
    const ffPayload = rescueDetail.ffrescue_or_nonffrescue as Record<string, unknown>
    expect(ffPayload.removal_or_nonremoval).toMatchObject({ type: 'REMOVAL_FROM_STRUCTURE', room_type: 'BEDROOM', rescue_path_type: 'WINDOW' })
    expect(rescueDetail.mayday).toMatchObject({ mayday: true, rit_activated: false })
  })

  it('maps a NonFF rescue with the simpler NonFF discriminator', () => {
    const incident = buildIncidentDetail(withDispatchCore({
      rescuesNonFf: [{
        id: 'r2', incidentId: 'incident_test_1', birthMonthYear: null, gender: null, race: null,
        rescueType: 'SELF_EVACUATION', presenceKnown: 'KNOWN_ARRIVAL', primaryMode: null, actions: [], impedimentTypes: [],
        roomType: null, elevationType: null, gasIsolation: null, removalPathType: null, fireRelativeTime: null,
        casualtyType: 'UNINJURED', casualtyCause: null
      }]
    }))
    const result = buildIncidentPayload(incident, 'FD24027334')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const rescue = (result.payload.casualty_rescues as Array<Record<string, unknown>>)[0]
    expect(rescue.type).toBe('NONFF')
    const rescueDetail = rescue.rescue as Record<string, unknown>
    expect(rescueDetail.presence_known).toEqual({ presence_known_type: 'KNOWN_ARRIVAL' })
  })

  it('maps a NOACTION record via actions_tactics', () => {
    const incident = buildIncidentDetail(withDispatchCore({ incidentNoActionReason: 'CANCELLED' }))
    const result = buildIncidentPayload(incident, 'FD24027334')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload.actions_tactics).toEqual({ action_noaction: { type: 'NOACTION', noaction_type: 'CANCELLED' } })
  })

  it('joins action/tactic value1/value2 pairs with || in actions_tactics', () => {
    const incident = buildIncidentDetail(withDispatchCore({
      actionsTaken: [{ id: 'a1', incidentId: 'incident_test_1', value1: 'COMMAND_AND_CONTROL', value2: 'ESTABLISH_INCIDENT_COMMAND', sortOrder: 0 }]
    }))
    const result = buildIncidentPayload(incident, 'FD24027334')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload.actions_tactics).toEqual({ action_noaction: { type: 'ACTION', actions: ['COMMAND_AND_CONTROL||ESTABLISH_INCIDENT_COMMAND'] } })
  })

  it('never includes aids, since this app only collects free-text department names, not real NERIS department IDs', () => {
    const incident = buildIncidentDetail(withDispatchCore({ aidDepartmentNames: ['Neighboring FD'], aidType: 'ACTING_AS_AID', aidDirection: 'GIVEN' }))
    const result = buildIncidentPayload(incident, 'FD24027334')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload.aids).toBeUndefined()
  })

  it('includes nonfd_aids directly, since those values need no NERIS ID', () => {
    const incident = buildIncidentDetail(withDispatchCore({ aidNonFdTypes: ['LAW_ENFORCEMENT'] }))
    const result = buildIncidentPayload(incident, 'FD24027334')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload.nonfd_aids).toEqual(['LAW_ENFORCEMENT'])
  })
})
