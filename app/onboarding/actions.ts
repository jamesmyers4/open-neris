'use server'

import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getCurrentAppUser, isDeactivatedClerkUser } from '@/lib/auth/current-user'
import { onboardingSchema } from '@/lib/validation/onboarding.schema'
import { resolveDepartmentSignup } from '@/lib/onboarding/resolve-department-signup'

export type OnboardingState = {
  errors?: Record<string, string[] | undefined>
  message?: string
  contactAdmin?: { name: string; email: string }
}

export async function submitOnboarding(_prevState: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const clerkUser = await currentUser()
  if (!clerkUser) return { message: 'You must be signed in to continue.' }

  const existing = await getCurrentAppUser()
  if (existing) {
    redirect('/incidents')
    return {}
  }

  if (await isDeactivatedClerkUser(clerkUser.id)) {
    return { message: 'Your account has been deactivated. Contact your department administrator.' }
  }

  const email = clerkUser.primaryEmailAddress?.emailAddress
  if (!email) return { message: 'Your account has no primary email address on file.' }

  const raw = {
    departmentName: formData.get('departmentName') || undefined,
    city: formData.get('city') || undefined,
    state: formData.get('state') || undefined
  }

  const parsed = onboardingSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: 'Fix the errors below and try again.' }
  }

  const signer = {
    clerkId: clerkUser.id,
    name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || email,
    email
  }

  const result = await resolveDepartmentSignup(prisma, parsed.data, signer)

  if (result.outcome === 'CONTACT_ADMIN') {
    return { contactAdmin: result.admin }
  }

  redirect('/incidents')
}
