import { z } from 'zod'

export const onboardingSchema = z.object({
  departmentName: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2)
})

export type OnboardingInput = z.infer<typeof onboardingSchema>
