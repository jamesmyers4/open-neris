import type { IncidentDetail } from '@/lib/incidents/get-incident-detail'
import { getRelevantModules } from './module-relevance'

type NerisPayload = Record<string, unknown>

export type BuildIncidentPayloadResult = { ok: true; payload: NerisPayload } | { ok: false; errors: string[] }

type LocationRow = NonNullable<IncidentDetail['location']>
type ExposureRow = IncidentDetail['exposures'][number]
type FireRow = NonNullable<IncidentDetail['fire']>
type HazsitRow = NonNullable<IncidentDetail['hazsit']>
type MedicalRow = IncidentDetail['medicals'][number]
type UnitResponseRow = IncidentDetail['unitResponses'][number]
type RescueFfRow = IncidentDetail['rescuesFf'][number]
type RescueNonFfRow = IncidentDetail['rescuesNonFf'][number]

function mapLocation(location: LocationRow): NerisPayload {
  return {
    street: location.streetAddressComplete,
    incorporated_municipality: location.city ?? undefined,
    county: location.county ?? undefined,
    state: location.state,
    postal_code: location.postalCode ?? undefined,
    country: location.country,
    place_type: location.place ?? undefined
  }
}

function mapLocationUse(location: LocationRow): NerisPayload | undefined {
  if (!location.useType && !location.useVacancy) return undefined
  return {
    use_type: location.useType ?? undefined,
    secondary_use: location.useSubtype ?? undefined,
    vacancy_cause: location.useVacancy ?? undefined
  }
}

function mapBase(incident: IncidentDetail, departmentNerisId: string, location: LocationRow): NerisPayload {
  const displacementCauses = Array.from(new Set(incident.displacements.flatMap(d => d.causes)))

  return {
    department_neris_id: departmentNerisId,
    incident_number: incident.internalId,
    location: mapLocation(location),
    location_use: mapLocationUse(location),
    people_present: incident.incidentPeoplePresent ?? undefined,
    animals_rescued: incident.incidentRescueAnimal ?? undefined,
    displacement_count: incident.displacements.length > 0 ? incident.displacements.length : undefined,
    displacement_causes: displacementCauses.length > 0 ? displacementCauses : undefined,
    impediment_narrative: incident.narrativeImpediment ?? undefined,
    outcome_narrative: incident.narrativeOutcome ?? undefined
  }
}

function mapIncidentTypes(types: IncidentDetail['types']): NerisPayload[] {
  return types.map(t => ({
    type: [t.value1, t.value2, t.value3].filter(Boolean).join('||'),
    primary: t.isPrimary
  }))
}

function mapActionsTactics(incident: IncidentDetail): NerisPayload | undefined {
  if (incident.incidentNoActionReason) {
    return { action_noaction: { type: 'NOACTION', noaction_type: incident.incidentNoActionReason } }
  }
  if (incident.actionsTaken.length > 0) {
    return {
      action_noaction: {
        type: 'ACTION',
        actions: incident.actionsTaken.map(a => (a.value2 ? `${a.value1}||${a.value2}` : a.value1))
      }
    }
  }
  return undefined
}

function mapUnitResponse(ur: UnitResponseRow): NerisPayload {
  return {
    unit_neris_id: ur.unit.nerisUnitId ?? undefined,
    reported_unit_id: ur.unitIdReported ?? ur.unit.designation ?? undefined,
    staffing: ur.unitStaffingReported ?? undefined,
    unable_to_dispatch: ur.unableToDispatch ?? undefined,
    dispatch: ur.timeDispatch?.toISOString(),
    enroute_to_scene: ur.timeEnrouteToScene?.toISOString(),
    on_scene: ur.timeOnScene?.toISOString(),
    canceled_enroute: ur.timeCanceledEnroute?.toISOString(),
    staging: ur.timeStaging?.toISOString(),
    unit_clear: ur.timeUnitClear?.toISOString(),
    response_mode: ur.responseMode ?? undefined,
    transport_mode: ur.transportMode ?? undefined
  }
}

function mapDispatch(incident: IncidentDetail, location: LocationRow, unitResponses: NerisPayload[]): NerisPayload {
  return {
    incident_number: incident.internalId,
    call_arrival: incident.dispatchTimeCallArrival!.toISOString(),
    call_answered: incident.dispatchTimeCallAnswer!.toISOString(),
    call_create: incident.dispatchTimeCallCreate!.toISOString(),
    incident_clear: incident.timeIncidentClear?.toISOString(),
    automatic_alarm: incident.dispatchAutomaticAlarm ?? undefined,
    determinant_code: incident.dispatchDeterminateCode ?? undefined,
    incident_code: incident.dispatchIncidentCode ?? undefined,
    disposition: incident.dispatchFinalDisposition ?? undefined,
    location: mapLocation(location),
    comments: incident.dispatchComments.length > 0
      ? incident.dispatchComments.map(c => ({ comment: c.comment, timestamp: c.timestamp.toISOString() }))
      : undefined,
    unit_responses: unitResponses
  }
}

function mapExposure(exposure: ExposureRow, incidentLocation: LocationRow): NerisPayload | null {
  if (!exposure.exposureDamage) return null

  const locationDetail = exposure.exposureType === 'EXTERNAL_EXPOSURE'
    ? (exposure.exposureItem ? { type: 'EXTERNAL_EXPOSURE', item_type: exposure.exposureItem } : null)
    : { type: 'INTERNAL_EXPOSURE' }
  if (!locationDetail) return null

  return {
    damage_type: exposure.exposureDamage,
    location_detail: locationDetail,
    location: mapLocation(incidentLocation),
    people_present: exposure.exposurePeoplePresent ?? undefined,
    displacement_count: exposure.exposureDisplacedNumber ?? undefined,
    displacement_causes: exposure.exposureDisplacedCauses.length > 0 ? exposure.exposureDisplacedCauses : undefined
  }
}

function mapFireDetail(fire: FireRow | null, types: IncidentDetail['types']): NerisPayload | undefined {
  if (!fire) return undefined
  if (!fire.fireWaterSupply || !fire.fireInvestigationNeed || fire.fireInvestigationType.length === 0) return undefined

  const isStructureFire = types.some(t => t.value2 === 'STRUCTURE_FIRE')
  let locationDetail: NerisPayload | undefined

  if (isStructureFire) {
    if (fire.structureFloorOfOrigin != null && fire.structureArrivalConditions && fire.structureDamage && fire.structureRoomOfOrigin && fire.structureFireCause) {
      locationDetail = {
        type: 'STRUCTURE',
        floor_of_origin: fire.structureFloorOfOrigin,
        arrival_condition: fire.structureArrivalConditions,
        damage_type: fire.structureDamage,
        room_of_origin_type: fire.structureRoomOfOrigin,
        cause: fire.structureFireCause,
        progression_evident: fire.structureProgressionConditions ?? undefined
      }
    }
  } else if (fire.outsideFireCause) {
    locationDetail = { type: 'OUTSIDE', cause: fire.outsideFireCause, acres_burned: fire.outsideFireAcresBurned ?? undefined }
  }

  if (!locationDetail) return undefined

  return {
    location_detail: locationDetail,
    water_supply: fire.fireWaterSupply,
    investigation_needed: fire.fireInvestigationNeed,
    investigation_types: fire.fireInvestigationType,
    suppression_appliances: fire.fireSuppressionAppliance.length > 0 ? fire.fireSuppressionAppliance : undefined
  }
}

function mapHazsitDetail(hazsit: HazsitRow | null): NerisPayload | undefined {
  if (!hazsit) return undefined
  if (hazsit.hazsitEvacuated == null || !hazsit.hazsitDisposition) return undefined

  const chemicals = hazsit.chemicals
    .filter(c => c.chemicalName && c.dotClass && c.releaseOccurred != null)
    .map(c => ({
      name: c.chemicalName as string,
      release_occurred: c.releaseOccurred as boolean,
      dot_class: c.dotClass,
      release: (c.amountEst != null || c.amountEstUnits || c.physicalState || c.releaseInto || c.releaseCause)
        ? {
            estimated_amount: c.amountEst ?? undefined,
            unit_of_measurement: c.amountEstUnits ?? undefined,
            physical_state: c.physicalState ?? undefined,
            released_into: c.releaseInto ?? undefined,
            cause: c.releaseCause ?? undefined
          }
        : undefined
    }))

  return {
    evacuated: hazsit.hazsitEvacuated,
    disposition: hazsit.hazsitDisposition,
    chemicals: chemicals.length > 0 ? chemicals : undefined
  }
}

function mapMedical(medical: MedicalRow): NerisPayload {
  return {
    patient_care_evaluation: medical.patientEvaluationCare,
    patient_status: medical.patientImprovedStatus ?? undefined,
    transport_disposition: medical.medicalDisposition ?? undefined,
    patient_care_report_id: medical.patientCareReport ?? undefined
  }
}

function mapFfRemoval(r: RescueFfRow): NerisPayload | undefined {
  const hasStructureData = r.roomType || r.elevationType || r.gasIsolation != null || r.removalPathType || r.fireRelativeTime
  if (!hasStructureData) return undefined
  return {
    type: 'REMOVAL_FROM_STRUCTURE',
    room_type: r.roomType ?? undefined,
    elevation_type: r.elevationType ?? undefined,
    gas_isolation: r.gasIsolation ?? undefined,
    rescue_path_type: r.removalPathType ?? undefined,
    fire_removal: r.fireRelativeTime ? { relative_suppression_time: r.fireRelativeTime } : undefined
  }
}

function mapFfInjuryDetails(r: RescueFfRow): NerisPayload | undefined {
  const hasAny = r.linkedUnitId || r.reportedUnitId || r.incidentCommand != null || r.casualtyClassification || r.dutyType || r.casualtyAction || r.casualtyTimeline || r.casualtyPpe.length > 0
  if (!hasAny) return undefined
  return {
    unit_neris_id: r.linkedUnitId || undefined,
    reported_unit_id: r.reportedUnitId ?? undefined,
    incident_command: r.incidentCommand ?? undefined,
    job_classification: r.casualtyClassification ?? undefined,
    duty_type: r.dutyType ?? undefined,
    action_type: r.casualtyAction ?? undefined,
    incident_stage: r.casualtyTimeline ?? undefined,
    ppe_items: r.casualtyPpe.length > 0 ? r.casualtyPpe : undefined
  }
}

function mapCasualty(casualtyType: string | null | undefined, casualtyCause: string | null | undefined, ffInjuryDetails: NerisPayload | undefined): NerisPayload | undefined {
  if (!casualtyType) return undefined
  if (casualtyType === 'UNINJURED') return { injury_or_noninjury: { type: 'UNINJURED' } }
  return {
    injury_or_noninjury: {
      type: casualtyType,
      cause: casualtyCause ?? undefined,
      ff_injury_details: ffInjuryDetails
    }
  }
}

function mapFfRescue(r: RescueFfRow): NerisPayload {
  const removal = mapFfRemoval(r)
  const rescue = removal
    ? {
        mayday: { mayday: r.mayday, rit_activated: r.ritActivated ?? undefined, relative_suppression_time: r.maydayRelativeTime ?? undefined },
        ffrescue_or_nonffrescue: {
          type: r.rescueType,
          actions: r.actions.length > 0 ? r.actions : undefined,
          impediments: r.impedimentTypes.length > 0 ? r.impedimentTypes : undefined,
          removal_or_nonremoval: removal
        }
      }
    : undefined

  return {
    type: 'FF',
    rank: r.casualtyRank ?? undefined,
    years_of_service: r.casualtyService ?? undefined,
    birth_month_year: r.birthMonthYear ?? undefined,
    gender: r.gender ?? undefined,
    race: r.race ?? undefined,
    rescue,
    casualty: mapCasualty(r.casualtyType, r.casualtyCause, mapFfInjuryDetails(r))
  }
}

function mapNonFfRescue(r: RescueNonFfRow): NerisPayload {
  return {
    type: 'NONFF',
    birth_month_year: r.birthMonthYear ?? undefined,
    gender: r.gender ?? undefined,
    race: r.race ?? undefined,
    rescue: {
      presence_known: r.presenceKnown ? { presence_known_type: r.presenceKnown } : undefined,
      ffrescue_or_nonffrescue: {
        type: r.rescueType,
        actions: r.actions.length > 0 ? r.actions : undefined,
        impediments: r.impedimentTypes.length > 0 ? r.impedimentTypes : undefined
      }
    },
    casualty: mapCasualty(r.casualtyType, r.casualtyCause, undefined)
  }
}

export function buildIncidentPayload(incident: IncidentDetail, departmentNerisId: string | null): BuildIncidentPayloadResult {
  const errors: string[] = []

  if (!departmentNerisId) {
    errors.push('Department.nerisFdId is not set — cannot submit to NERIS without a department NERIS ID')
  }

  if (!incident.location) {
    errors.push('incident location is required')
  }

  if (!incident.dispatchTimeCallArrival || !incident.dispatchTimeCallAnswer || !incident.dispatchTimeCallCreate) {
    errors.push('dispatch call_arrival / call_answered / call_create are all required by the NERIS submission API — this incident is missing at least one (these are optional in this app\'s own data entry, see FUTURE-PLAN.md Session 14 findings)')
  }

  const primaryType = incident.types.find(t => t.isPrimary)
  if (incident.types.length === 0 || !primaryType) {
    errors.push('exactly one primary incident type is required')
  }

  if (errors.length > 0) return { ok: false, errors }

  const location = incident.location as LocationRow
  const relevantModules = getRelevantModules(incident.types)
  const unitResponses = incident.unitResponses.map(mapUnitResponse)

  const exposures = incident.exposures
    .map(e => mapExposure(e, location))
    .filter((e): e is NerisPayload => e !== null)

  const casualtyRescues = [
    ...incident.rescuesFf.map(mapFfRescue),
    ...incident.rescuesNonFf.map(mapNonFfRescue)
  ]

  const payload: NerisPayload = {
    base: mapBase(incident, departmentNerisId as string, location),
    incident_types: mapIncidentTypes(incident.types),
    special_modifiers: incident.specialModifiers.length > 0 ? incident.specialModifiers : undefined,
    nonfd_aids: incident.aidNonFdTypes.length > 0 ? incident.aidNonFdTypes : undefined,
    actions_tactics: mapActionsTactics(incident),
    dispatch: mapDispatch(incident, location, unitResponses),
    unit_responses: unitResponses.length > 0 ? unitResponses : undefined,
    exposures: exposures.length > 0 ? exposures : undefined,
    casualty_rescues: casualtyRescues.length > 0 ? casualtyRescues : undefined,
    fire_detail: relevantModules.includes('fire') ? mapFireDetail(incident.fire, incident.types) : undefined,
    hazsit_detail: relevantModules.includes('hazsit') ? mapHazsitDetail(incident.hazsit) : undefined,
    medical_details: incident.medicals.length > 0 ? incident.medicals.map(mapMedical) : undefined
  }

  return { ok: true, payload }
}
