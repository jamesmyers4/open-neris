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

  const relevant: ModuleKey[] = ['exposures', 'unitResponse', 'rescuesFf', 'rescuesNonFf', 'emergingHazard']

  if (value1s.has('FIRE')) {
    relevant.push('fire', 'tacticTimestamps')
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
