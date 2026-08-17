import { z } from 'zod'
import { TypeExposureLoc, TypeExposureItem, TypeExposureDamage, TypeDisplaceCause } from '../neris/generated/enums'

export const incidentExposureSchema = z.object({
  exposureType: z.enum(TypeExposureLoc),
  exposureItem: z.enum(TypeExposureItem),
  exposureDamage: z.enum(TypeExposureDamage).optional(),
  exposurePeoplePresent: z.boolean().optional(),
  exposureDisplacedNumber: z.number().int().nonnegative().optional(),
  exposureDisplacedCauses: z.array(z.enum(TypeDisplaceCause)).default([])
})

export type IncidentExposureInput = z.infer<typeof incidentExposureSchema>
