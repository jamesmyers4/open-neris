import { z } from 'zod'
import { TypeDept } from '../neris/generated/enums'

export const internalIdModes = ['YEAR_SEQUENTIAL', 'SEQUENTIAL', 'CUSTOM_TEMPLATE', 'MANUAL'] as const

export const departmentSettingsSchema = z.object({
  name: z.string().min(1),
  address1: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  mailingAddress1: z.string().optional(),
  mailingAddress2: z.string().optional(),
  mailingCity: z.string().optional(),
  mailingState: z.string().optional(),
  mailingZip: z.string().optional(),
  fdType: z.enum(TypeDept).optional(),
  staffActiveFfCareerFt: z.coerce.number().int().nonnegative().optional(),
  staffActiveFfCareerPt: z.coerce.number().int().nonnegative().optional(),
  staffActiveFfVolunteer: z.coerce.number().int().nonnegative().optional(),
  staffActiveEmsOnlyCareerFt: z.coerce.number().int().nonnegative().optional(),
  staffActiveEmsOnlyCareerPt: z.coerce.number().int().nonnegative().optional(),
  staffActiveEmsOnlyVolunteer: z.coerce.number().int().nonnegative().optional(),
  staffActiveCiviliansCareerFt: z.coerce.number().int().nonnegative().optional(),
  staffActiveCiviliansCareerPt: z.coerce.number().int().nonnegative().optional(),
  staffActiveCiviliansVolunteer: z.coerce.number().int().nonnegative().optional(),
  internalIdMode: z.enum(internalIdModes).default('YEAR_SEQUENTIAL'),
  internalIdTemplate: z.string().optional()
})

export type DepartmentSettingsInput = z.infer<typeof departmentSettingsSchema>
