import { z } from 'zod'
import { TypeDisplaceCause } from '../neris/generated/enums'

export const incidentPeopleDisplacementTabSchema = z.object({
  incidentPeoplePresent: z.boolean().optional(),
  incidentRescueAnimal: z.number().int().nonnegative().optional()
})

export type IncidentPeopleDisplacementTabInput = z.infer<typeof incidentPeopleDisplacementTabSchema>

export const incidentDisplacementSchema = z.object({
  causes: z.array(z.enum(TypeDisplaceCause)).min(1)
})

export type IncidentDisplacementInput = z.infer<typeof incidentDisplacementSchema>
