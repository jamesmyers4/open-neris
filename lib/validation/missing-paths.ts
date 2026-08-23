import type { z } from 'zod'

export function missingPaths(schema: z.ZodTypeAny, data: unknown): Set<string> {
  const result = schema.safeParse(data)
  if (result.success) return new Set()
  return new Set(result.error.issues.map(issue => issue.path.join('.')))
}
