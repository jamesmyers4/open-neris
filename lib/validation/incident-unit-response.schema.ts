import { z } from 'zod'
import { TypeResponseMode } from '../neris/generated/enums'

export const incidentUnitResponseSchema = z.object({
  unitIdLinked: z.string().min(1),
  unitIdReported: z.string().max(255).optional(),
  unitStaffingReported: z.number().int().nonnegative().optional(),
  unableToDispatch: z.boolean().optional(),
  responseMode: z.enum(TypeResponseMode).optional(),
  timeDispatch: z.coerce.date().optional(),
  timeEnrouteToScene: z.coerce.date().optional(),
  timeOnScene: z.coerce.date().optional(),
  timeCanceledEnroute: z.coerce.date().optional(),
  timeStaging: z.coerce.date().optional(),
  timeUnitClear: z.coerce.date().optional(),
  transportMode: z.enum(TypeResponseMode).optional()
})

export type IncidentUnitResponseInput = z.infer<typeof incidentUnitResponseSchema>

export const incidentUnitResponseRequiredSchema = z.object({
  unitResponses: z.array(incidentUnitResponseSchema).min(1, { message: 'at least one responding unit is required' })
})
