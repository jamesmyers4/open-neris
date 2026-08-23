import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { OnboardingForm } from './onboarding-form'

export default async function OnboardingPage() {
  const clerkUser = await currentUser()
  if (!clerkUser) redirect('/sign-in')

  const appUser = await getCurrentAppUser()
  if (appUser) redirect('/incidents')

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-2 text-2xl font-bold">Welcome</h1>
      <p className="mb-6 text-sm text-slate-600">Tell us about your department to get started.</p>
      <OnboardingForm />
    </main>
  )
}
