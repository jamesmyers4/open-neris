import { z } from 'zod'
import { UserRole } from '@prisma/client'

export const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(UserRole),
  departmentId: z.string().min(1)
})

export type InviteInput = z.infer<typeof inviteSchema>
