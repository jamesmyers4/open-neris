import { z } from 'zod'

export const incidentDispatchSchema = z.object({
  dispatchTimeCallArrival: z.coerce.date().optional(),
  dispatchTimeCallAnswer: z.coerce.date().optional(),
  dispatchTimeCallCreate: z.coerce.date().optional(),
  timeIncidentClear: z.coerce.date().optional(),
  dispatchAutomaticAlarm: z.boolean().optional(),
  dispatchDeterminateCode: z.string().max(8).optional(),
  dispatchIncidentCode: z.string().max(255).optional(),
  dispatchFinalDisposition: z.string().max(255).optional()
}).superRefine((data, ctx) => {
  if (data.dispatchTimeCallArrival && data.dispatchTimeCallAnswer && data.dispatchTimeCallArrival > data.dispatchTimeCallAnswer) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dispatchTimeCallAnswer'], message: 'call answered time must be at or after call received at dispatch center' })
  }
  if (data.dispatchTimeCallAnswer && data.dispatchTimeCallCreate && data.dispatchTimeCallAnswer > data.dispatchTimeCallCreate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dispatchTimeCallCreate'], message: 'call created time must be at or after call answered time' })
  }
  if (data.dispatchTimeCallArrival && data.dispatchTimeCallCreate && data.dispatchTimeCallArrival > data.dispatchTimeCallCreate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dispatchTimeCallCreate'], message: 'call created time must be at or after call received at dispatch center' })
  }
})

export type IncidentDispatchInput = z.infer<typeof incidentDispatchSchema>

export const dispatchCommentSchema = z.object({
  comment: z.string().min(1).max(100000),
  timestamp: z.coerce.date()
})

export type DispatchCommentInput = z.infer<typeof dispatchCommentSchema>
