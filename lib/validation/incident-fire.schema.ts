import { z } from 'zod'
import {
  TypeSuppressAppliance,
  TypeWaterSupply,
  TypeFireInvestNeed,
  TypeFireInvest,
  TypeFireConditionArrival,
  TypeFireBldgDamage,
  TypeRoom,
  TypeFireCauseIn,
  TypeFireCauseOut
} from '../neris/generated/enums'

export const incidentFireSchema = z.object({
  fireSuppressionAppliance: z.array(z.enum(TypeSuppressAppliance)).default([]),
  fireWaterSupply: z.enum(TypeWaterSupply).optional(),
  fireInvestigationNeed: z.enum(TypeFireInvestNeed),
  fireInvestigationType: z.array(z.enum(TypeFireInvest)).default([]),
  structureArrivalConditions: z.enum(TypeFireConditionArrival).optional(),
  structureProgressionConditions: z.boolean().optional(),
  structureDamage: z.enum(TypeFireBldgDamage).optional(),
  structureFloorOfOrigin: z.number().int().optional(),
  structureRoomOfOrigin: z.enum(TypeRoom).optional(),
  structureFireCause: z.enum(TypeFireCauseIn).optional(),
  outsideFireCause: z.enum(TypeFireCauseOut).optional(),
  outsideFireAcresBurned: z.number().nonnegative().optional()
})

export type IncidentFireInput = z.infer<typeof incidentFireSchema>
