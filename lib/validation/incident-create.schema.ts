import { z } from 'zod'
import { incidentTypeSchema } from './incident-core.schema'
import { TypeSpecialModifier } from '../neris/generated/enums'

export const createIncidentSchema = z.object({
  types: z.array(incidentTypeSchema).min(1).max(3).refine(
    types => types.filter(t => t.isPrimary).length === 1,
    { message: 'exactly one incident type must be marked primary' }
  ),
  specialModifiers: z.array(z.enum(TypeSpecialModifier)).default([]),
  alarmTime: z.coerce.date()
})

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>
