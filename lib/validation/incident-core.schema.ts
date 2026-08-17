import { z } from 'zod'
import { TypeAidDirection, TypeAid, TypeCasualty, TypeNoaction } from '../neris/generated/enums'

export const incidentTypeSchema = z.object({
  value1: z.string().min(1),
  value2: z.string().optional(),
  value3: z.string().optional(),
  isPrimary: z.boolean().default(false)
})

export const incidentLocationSchema = z.object({
  streetAddressComplete: z.string().min(1),
  city: z.string().optional(),
  county: z.string().optional(),
  state: z.string().length(2),
  postalCode: z.string().optional(),
  country: z.string().default('US'),
  place: z.string().optional()
})

export const incidentCoreSchema = z.object({
  internalId: z.string().min(1),
  incidentDate: z.coerce.date(),
  alarmTime: z.coerce.date(),
  types: z.array(incidentTypeSchema).min(1).max(3).refine(
    types => types.filter(t => t.isPrimary).length === 1,
    { message: 'exactly one incident type must be marked primary' }
  ),
  location: incidentLocationSchema,
  incidentPeoplePresent: z.boolean().optional(),
  incidentRescueAnimal: z.number().int().nonnegative().optional(),
  incidentNoActionReason: z.enum(TypeNoaction).optional(),
  aidDirection: z.enum(TypeAidDirection).optional(),
  aidType: z.enum(TypeAid).optional(),
  aidDepartmentNames: z.array(z.string()).default([]),
  aidNonFdTypes: z.array(z.string()).default([]),
  narrativeImpediment: z.string().optional(),
  narrativeOutcome: z.string().optional(),
  dispatchTimeCallCreate: z.coerce.date().optional(),
  dispatchTimeCallAnswer: z.coerce.date().optional(),
  dispatchTimeCallArrival: z.coerce.date().optional()
}).superRefine((data, ctx) => {
  if (data.dispatchTimeCallArrival && data.dispatchTimeCallCreate && data.dispatchTimeCallArrival > data.dispatchTimeCallCreate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dispatchTimeCallCreate'], message: 'call create time must be at or after call arrival at dispatch' })
  }
  if (data.dispatchTimeCallArrival && data.dispatchTimeCallAnswer && data.dispatchTimeCallArrival > data.dispatchTimeCallAnswer) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dispatchTimeCallAnswer'], message: 'call answered time must be at or after call arrival at dispatch' })
  }
  if (data.dispatchTimeCallAnswer && data.dispatchTimeCallCreate && data.dispatchTimeCallAnswer > data.dispatchTimeCallCreate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dispatchTimeCallCreate'], message: 'call create time must be at or after call answered time' })
  }
})

export const rescueCasualtySchema = z.object({
  casualtyType: z.enum(TypeCasualty),
  casualtyCause: z.string().optional()
})

export type IncidentCoreInput = z.infer<typeof incidentCoreSchema>
