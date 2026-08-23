import Link from 'next/link'
import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { getCurrentAppUser } from '@/lib/auth/current-user'

export default async function Home() {
  const clerkUser = await currentUser()
  if (!clerkUser) {
    return (
      <main className="p-8">
        <Link href="/sign-in">Sign in</Link>
      </main>
    )
  }

  const appUser = await getCurrentAppUser()
  redirect(appUser ? '/incidents' : '/onboarding')
}
