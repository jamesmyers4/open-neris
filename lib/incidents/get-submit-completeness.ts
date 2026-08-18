import type { IncidentDetail } from './get-incident-detail'
import { checkIncidentCompleteness, type CompletenessResult, type ModuleCheck } from '../validation/incident-completeness'
import { incidentDispatchRequiredSchema } from '../validation/incident-dispatch.schema'
import { incidentLocationRequiredSchema } from '../validation/incident-location.schema'
import { incidentNarrativeRequiredSchema } from '../validation/incident-narrative.schema'
import { incidentActionsTakenRequiredSchema } from '../validation/incident-actions-taken.schema'

export function getSubmitCompleteness(incident: IncidentDetail): CompletenessResult {
  const checks: ModuleCheck[] = [
    {
      module: 'core',
      schema: incidentDispatchRequiredSchema,
      data: {
        dispatchTimeCallArrival: incident.dispatchTimeCallArrival,
        dispatchTimeCallAnswer: incident.dispatchTimeCallAnswer,
        dispatchTimeCallCreate: incident.dispatchTimeCallCreate
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
    }
  ]

  return checkIncidentCompleteness(incident.types, checks)
}
