import { z } from 'zod'
import { TypeHazardDisposition, TypeHazardDot, TypeHazardPhysicalState, TypeHazardReleasedInto, TypeHazardCause } from '../neris/generated/enums'
import { hazardUnitOptions } from '../neris/lookups'

const validHazardUnits = new Set(hazardUnitOptions.map(o => o.value))

export const incidentHazsitSchema = z.object({
  hazsitDisposition: z.enum(TypeHazardDisposition),
  hazsitEvacuated: z.number().int().nonnegative()
})

export const incidentHazardChemicalSchema = z.object({
  dotClass: z.enum(TypeHazardDot),
  chemicalName: z.string().max(255),
  releaseOccurred: z.boolean(),
  amountEst: z.number().nonnegative().optional(),
  amountEstUnits: z.string().refine(v => validHazardUnits.has(v), { message: 'invalid unit' }).optional(),
  physicalState: z.enum(TypeHazardPhysicalState).optional(),
  releaseInto: z.enum(TypeHazardReleasedInto).optional(),
  releaseCause: z.enum(TypeHazardCause).optional()
})

export const incidentHazsitRequiredSchema = z.object({
  hazsitDisposition: z.string().min(1),
  hazsitEvacuated: z.number().int().nonnegative()
})

export type IncidentHazsitInput = z.infer<typeof incidentHazsitSchema>
export type IncidentHazardChemicalInput = z.infer<typeof incidentHazardChemicalSchema>
