import { z } from 'zod'
import { TypeVacancy } from '../neris/generated/enums'
import { locationUseOptions, locPlaceOptions } from '../neris/lookups'

const validUseType = new Set(locationUseOptions.map(o => o.value1))
const validUsePairs = new Set(locationUseOptions.map(o => `${o.value1}::${o.value2}`))
const validPlace = new Set(locPlaceOptions.map(o => o.value))

export const incidentLocationTabSchema = z.object({
  streetAddressComplete: z.string().min(1),
  city: z.string().optional(),
  county: z.string().optional(),
  state: z.string().length(2),
  postalCode: z.string().optional(),
  country: z.string().default('US'),
  place: z.string().optional(),
  useType: z.string().optional(),
  useSubtype: z.string().optional(),
  useVacancy: z.enum(TypeVacancy).optional()
}).superRefine((data, ctx) => {
  if (data.place && !validPlace.has(data.place)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['place'], message: 'invalid place value' })
  }
  if (data.useType && !validUseType.has(data.useType)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['useType'], message: 'invalid location use type' })
  }
  if (data.useSubtype && !data.useType) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['useSubtype'], message: 'select a location use type first' })
  }
  if (data.useType && data.useSubtype && !validUsePairs.has(`${data.useType}::${data.useSubtype}`)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['useSubtype'], message: 'invalid subtype for the selected location use type' })
  }
})

export type IncidentLocationTabInput = z.infer<typeof incidentLocationTabSchema>

export const incidentLocationRequiredSchema = z.object({
  streetAddressComplete: z.string().min(1),
  state: z.string().length(2)
})
