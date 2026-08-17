import type { z } from 'zod'
import { getRelevantModules, type IncidentTypeRow, type ModuleKey } from '../neris/module-relevance'

export type MissingField = {
  module: ModuleKey | 'core'
  path: string
  message: string
}

export type CompletenessResult = {
  complete: boolean
  missing: MissingField[]
}

export type ModuleCheck = {
  module: ModuleKey | 'core'
  schema: z.ZodTypeAny
  data: unknown
}

export function checkIncidentCompleteness(types: IncidentTypeRow[], checks: ModuleCheck[]): CompletenessResult {
  const relevantModules = new Set<ModuleKey | 'core'>(['core', ...getRelevantModules(types)])
  const missing: MissingField[] = []

  for (const check of checks) {
    if (!relevantModules.has(check.module)) continue
    const result = check.schema.safeParse(check.data)
    if (!result.success) {
      for (const issue of result.error.issues) {
        missing.push({ module: check.module, path: issue.path.join('.'), message: issue.message })
      }
    }
  }

  return { complete: missing.length === 0, missing }
}
