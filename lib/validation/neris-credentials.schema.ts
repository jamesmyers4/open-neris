import { z } from 'zod'
import { NerisEnvironment } from '@prisma/client'

export const nerisCredentialsSchema = z.object({
  nerisVendorClientId: z.string().optional(),
  nerisVendorClientSecret: z.string().optional(),
  nerisEnvironment: z.enum(NerisEnvironment).default('SANDBOX')
})

export type NerisCredentialsInput = z.infer<typeof nerisCredentialsSchema>
