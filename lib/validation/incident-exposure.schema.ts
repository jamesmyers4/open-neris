import { z } from 'zod'
import { TypeExposureLoc, TypeExposureItem, TypeExposureDamage, TypeDisplaceCause } from '../neris/generated/enums'

export const incidentExposureSchema = z.object({
  exposureType: z.enum(TypeExposureLoc),
  exposureItem: z.enum(TypeExposureItem).optional(),
  exposureDamage: z.enum(TypeExposureDamage),
  exposurePeoplePresent: z.boolean().optional(),
  exposureDisplacedNumber: z.number().int().nonnegative().optional(),
  exposureDisplacedCauses: z.array(z.enum(TypeDisplaceCause)).default([])
}).superRefine((data, ctx) => {
  if (data.exposureType === 'EXTERNAL_EXPOSURE' && !data.exposureItem) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['exposureItem'], message: 'exposure item is required for an external exposure' })
  }
})

export type IncidentExposureInput = z.infer<typeof incidentExposureSchema>
