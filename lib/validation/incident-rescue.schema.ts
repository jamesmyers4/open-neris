import { z } from 'zod'
import {
  TypeGender,
  TypeRace,
  TypeRescue,
  TypeRescueMode,
  TypeRescueAction,
  TypeRescueImpediment,
  TypeSuppressTime,
  TypeRoom,
  TypeRescueElevation,
  TypeRescuePath,
  TypeCasualty,
  TypeJobClassification,
  TypeDuty,
  TypeCasualtyCause,
  TypeCasualtyAction,
  TypeCasualtyPpe,
  TypeCasualtyTimeline,
  TypeRescuePresenceKnown
} from '../neris/generated/enums'

export const incidentRescueFfSchema = z.object({
  birthMonthYear: z.string().max(7).optional(),
  gender: z.enum(TypeGender).optional(),
  race: z.enum(TypeRace).optional(),
  casualtyRank: z.string().max(255).optional(),
  casualtyService: z.number().nonnegative().optional(),
  rescueType: z.enum(TypeRescue),
  primaryMode: z.enum(TypeRescueMode).optional(),
  actions: z.array(z.enum(TypeRescueAction)).default([]),
  impedimentTypes: z.array(z.enum(TypeRescueImpediment)).default([]),
  mayday: z.boolean(),
  maydayRelativeTime: z.enum(TypeSuppressTime).optional(),
  ritActivated: z.boolean().optional(),
  roomType: z.enum(TypeRoom).optional(),
  elevationType: z.enum(TypeRescueElevation).optional(),
  gasIsolation: z.boolean().optional(),
  removalPathType: z.enum(TypeRescuePath).optional(),
  fireRelativeTime: z.enum(TypeSuppressTime).optional(),
  casualtyClassification: z.enum(TypeJobClassification).optional(),
  linkedUnitId: z.string().min(1),
  reportedUnitId: z.string().max(255).optional(),
  dutyType: z.enum(TypeDuty).optional(),
  casualtyType: z.enum(TypeCasualty),
  casualtyCause: z.enum(TypeCasualtyCause).optional(),
  casualtyAction: z.enum(TypeCasualtyAction).optional(),
  casualtyPpe: z.array(z.enum(TypeCasualtyPpe)).default([]),
  incidentCommand: z.boolean().optional(),
  casualtyTimeline: z.enum(TypeCasualtyTimeline).optional()
})

export const incidentRescueNonFfSchema = z.object({
  birthMonthYear: z.string().max(7).optional(),
  gender: z.enum(TypeGender).optional(),
  race: z.enum(TypeRace).optional(),
  rescueType: z.enum(TypeRescue),
  presenceKnown: z.enum(TypeRescuePresenceKnown).optional(),
  primaryMode: z.enum(TypeRescueMode).optional(),
  actions: z.array(z.enum(TypeRescueAction)).default([]),
  impedimentTypes: z.array(z.enum(TypeRescueImpediment)).default([]),
  roomType: z.enum(TypeRoom).optional(),
  elevationType: z.enum(TypeRescueElevation).optional(),
  gasIsolation: z.boolean().optional(),
  removalPathType: z.enum(TypeRescuePath).optional(),
  fireRelativeTime: z.enum(TypeSuppressTime).optional(),
  casualtyType: z.enum(TypeCasualty),
  casualtyCause: z.enum(TypeCasualtyCause).optional()
})

export type IncidentRescueFfInput = z.infer<typeof incidentRescueFfSchema>
export type IncidentRescueNonFfInput = z.infer<typeof incidentRescueNonFfSchema>

export const incidentRescueFfRequiredSchema = z.object({
  rescuesFf: z.array(incidentRescueFfSchema)
})

export const incidentRescueNonFfRequiredSchema = z.object({
  rescuesNonFf: z.array(incidentRescueNonFfSchema)
})
