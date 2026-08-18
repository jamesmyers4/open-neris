import { z } from 'zod'
import { TypeNoaction } from '../neris/generated/enums'
import { actionTacticOptions } from '../neris/lookups'

const validActionTacticValue1 = new Set(actionTacticOptions.map(o => o.value1))
const validActionTacticPairs = new Set(
  actionTacticOptions.filter(o => o.value2).map(o => `${o.value1}::${o.value2}`)
)

export const incidentActionTakenEntrySchema = z.object({
  value1: z.string().refine(v => validActionTacticValue1.has(v), { message: 'invalid action/tactic value' }),
  value2: z.string().optional()
}).refine(
  entry => !entry.value2 || validActionTacticPairs.has(`${entry.value1}::${entry.value2}`),
  { message: 'value2 is not a valid tactic for the selected action', path: ['value2'] }
)

export const incidentActionsTakenSchema = z.object({
  actionsTaken: z.array(incidentActionTakenEntrySchema).default([]),
  incidentNoActionReason: z.enum(TypeNoaction).optional()
}).superRefine((data, ctx) => {
  if (data.actionsTaken.length > 0 && data.incidentNoActionReason) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['incidentNoActionReason'], message: 'incidentNoActionReason is mutually exclusive with actionsTaken' })
  }
})

export const incidentNoActionReasonSchema = z.object({
  incidentNoActionReason: z.enum(TypeNoaction).optional()
})

export const incidentActionsTakenRequiredSchema = z.object({
  hasActionsTaken: z.boolean(),
  incidentNoActionReason: z.string().nullable()
}).superRefine((data, ctx) => {
  if (!data.hasActionsTaken && !data.incidentNoActionReason) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['incidentActionsTaken'], message: 'an action taken or a no-action reason is required' })
  }
})

export type IncidentActionTakenEntryInput = z.infer<typeof incidentActionTakenEntrySchema>
export type IncidentActionsTakenInput = z.infer<typeof incidentActionsTakenSchema>
export type IncidentNoActionReasonInput = z.infer<typeof incidentNoActionReasonSchema>
