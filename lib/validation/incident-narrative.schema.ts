import { z } from 'zod'

export const incidentNarrativeTabSchema = z.object({
  narrativeImpediment: z.string().max(100000).optional(),
  narrativeOutcome: z.string().max(100000).optional()
})

export type IncidentNarrativeTabInput = z.infer<typeof incidentNarrativeTabSchema>
