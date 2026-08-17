import typeIncidentRaw from './generated/type_incident.json'
import typeLocPlaceRaw from './generated/type_loc_place.json'
import typeActionTacticRaw from './generated/type_action_tactic.json'

export type IncidentTypeOption = {
  value1: string
  value2: string
  value3: string
  description1: string
  description2: string
  description3: string
}

export const incidentTypeOptions: IncidentTypeOption[] = typeIncidentRaw
  .filter(row => row.active === 'TRUE')
  .map(row => ({
    value1: row.value_1,
    value2: row.value_2,
    value3: row.value_3,
    description1: row.description_1,
    description2: row.description_2,
    description3: row.description_3
  }))

export type LocPlaceOption = {
  value: string
  description: string
}

export const locPlaceOptions: LocPlaceOption[] = typeLocPlaceRaw
  .filter(row => row.active === 'TRUE')
  .map(row => ({ value: row.value, description: row.description }))

export type ActionTacticOption = {
  value1: string
  value2: string
  description1: string
  description2: string
}

export const actionTacticOptions: ActionTacticOption[] = typeActionTacticRaw
  .filter(row => row.active === 'TRUE')
  .map(row => ({
    value1: row.value_1,
    value2: row.value_2,
    description1: row.description_1,
    description2: row.description_2
  }))
