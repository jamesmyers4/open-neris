import type { IncidentDetail } from './get-incident-detail'
import { checkIncidentCompleteness, type CompletenessResult, type ModuleCheck } from '../validation/incident-completeness'
import { incidentDispatchRequiredSchema } from '../validation/incident-dispatch.schema'
import { incidentLocationRequiredSchema } from '../validation/incident-location.schema'
import { incidentNarrativeRequiredSchema } from '../validation/incident-narrative.schema'
import { incidentActionsTakenRequiredSchema } from '../validation/incident-actions-taken.schema'
import { incidentFireRequiredSchema } from '../validation/incident-fire.schema'
import { incidentMedicalRequiredSchema } from '../validation/incident-medical.schema'
import { incidentHazsitRequiredSchema } from '../validation/incident-hazsit.schema'
import { incidentExposureRequiredSchema } from '../validation/incident-exposure.schema'
import { incidentUnitResponseRequiredSchema } from '../validation/incident-unit-response.schema'
import { incidentRescueFfRequiredSchema, incidentRescueNonFfRequiredSchema } from '../validation/incident-rescue.schema'

function stripNulls<T extends Record<string, unknown>>(row: T): T {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value === null ? undefined : value])) as T
}

export function getSubmitCompleteness(incident: IncidentDetail): CompletenessResult {
  const checks: ModuleCheck[] = [
    {
      module: 'core',
      schema: incidentDispatchRequiredSchema,
      data: {
        timeIncidentClear: incident.timeIncidentClear
      }
    },
    {
      module: 'core',
      schema: incidentLocationRequiredSchema,
      data: {
        streetAddressComplete: incident.location?.streetAddressComplete ?? null,
        state: incident.location?.state ?? null
      }
    },
    {
      module: 'core',
      schema: incidentNarrativeRequiredSchema,
      data: {
        narrativeImpediment: incident.narrativeImpediment,
        narrativeOutcome: incident.narrativeOutcome
      }
    },
    {
      module: 'core',
      schema: incidentActionsTakenRequiredSchema,
      data: {
        hasActionsTaken: incident.actionsTaken.length > 0,
        incidentNoActionReason: incident.incidentNoActionReason
      }
    },
    {
      module: 'fire',
      schema: incidentFireRequiredSchema,
      data: {
        fireInvestigationNeed: incident.fire?.fireInvestigationNeed ?? null
      }
    },
    {
      module: 'medical',
      schema: incidentMedicalRequiredSchema,
      data: {
        hasPatientRecord: incident.medicals.length > 0
      }
    },
    {
      module: 'hazsit',
      schema: incidentHazsitRequiredSchema,
      data: {
        hazsitDisposition: incident.hazsit?.hazsitDisposition ?? null,
        hazsitEvacuated: incident.hazsit?.hazsitEvacuated ?? null
      }
    },
    {
      module: 'exposures',
      schema: incidentExposureRequiredSchema,
      data: { exposures: incident.exposures.map(stripNulls) }
    },
    {
      module: 'unitResponse',
      schema: incidentUnitResponseRequiredSchema,
      data: { unitResponses: incident.unitResponses.map(stripNulls) }
    },
    {
      module: 'rescuesFf',
      schema: incidentRescueFfRequiredSchema,
      data: { rescuesFf: incident.rescuesFf.map(stripNulls) }
    },
    {
      module: 'rescuesNonFf',
      schema: incidentRescueNonFfRequiredSchema,
      data: { rescuesNonFf: incident.rescuesNonFf.map(stripNulls) }
    }
  ]

  return checkIncidentCompleteness(incident.types, checks)
}
