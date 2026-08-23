import { z } from 'zod'
import { unitCapabilityOptions } from '../neris/lookups'

const validCapabilityType = new Set(unitCapabilityOptions.map(o => o.value))

export const quickAddUnitSchema = z.object({
  designation: z.string().min(1),
  capabilityType: z.string().optional()
}).superRefine((data, ctx) => {
  if (data.capabilityType && !validCapabilityType.has(data.capabilityType)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['capabilityType'], message: 'invalid unit capability type' })
  }
})

export type QuickAddUnitInput = z.infer<typeof quickAddUnitSchema>
