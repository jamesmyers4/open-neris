import { z } from 'zod'
import { TypeAidDirection, TypeAid, TypeAidNonfd } from '../neris/generated/enums'

export const AID_NONE = 'NONE' as const

export const incidentMutualAidTabSchema = z.object({
  aidDirection: z.union([z.enum(TypeAidDirection), z.literal(AID_NONE)]).optional(),
  aidType: z.enum(TypeAid).optional(),
  aidDepartmentNames: z.array(z.string().min(1)).default([]),
  aidNonFdTypes: z.array(z.enum(TypeAidNonfd)).default([])
}).superRefine((data, ctx) => {
  if (data.aidDirection === AID_NONE) {
    if (data.aidType) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['aidType'], message: 'clear aid type when no mutual aid applies' })
    }
    if (data.aidDepartmentNames.length > 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['aidDepartmentNames'], message: 'clear department names when no mutual aid applies' })
    }
    if (data.aidNonFdTypes.length > 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['aidNonFdTypes'], message: 'clear non-FD types when no mutual aid applies' })
    }
  }
})

export type IncidentMutualAidTabInput = z.infer<typeof incidentMutualAidTabSchema>
