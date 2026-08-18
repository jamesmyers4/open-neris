export type ModuleKey =
  | 'exposures'
  | 'fire'
  | 'medical'
  | 'hazsit'
  | 'rescuesFf'
  | 'rescuesNonFf'
  | 'unitResponse'
  | 'tacticTimestamps'
  | 'riskReduction'
  | 'emergingHazard'

export type IncidentTypeRow = {
  value1: string
  value2?: string | null
}

export function getRelevantModules(types: IncidentTypeRow[]): ModuleKey[] {
  const value1s = new Set(types.map(t => t.value1))
  const value2s = new Set(types.map(t => t.value2).filter((v): v is string => Boolean(v)))

  // tacticTimestamps' own `possible_if` in core_mod_incident.csv is unconditional — the
  // "final incident type includes fire" text lives in its `neris_core_if` column instead,
  // which governs federal-reporting requiredness, not tab availability. Most of its fields
  // (command established, sizeup, primary search, extrication) apply to any incident type;
  // only water_on_fire/fire_under_control/fire_knocked_down are actually FIRE-specific.
  const relevant: ModuleKey[] = ['exposures', 'unitResponse', 'rescuesFf', 'rescuesNonFf', 'emergingHazard', 'tacticTimestamps']

  if (value1s.has('FIRE')) {
    relevant.push('fire')
  }
  if (value1s.has('MEDICAL')) {
    relevant.push('medical')
  }
  if (value1s.has('HAZSIT')) {
    relevant.push('hazsit')
  }
  if (value2s.has('STRUCTURE_FIRE')) {
    relevant.push('riskReduction')
  }

  return relevant
}

export function isModuleRelevant(types: IncidentTypeRow[], module: ModuleKey): boolean {
  return getRelevantModules(types).includes(module)
}
