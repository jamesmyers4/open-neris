import { currentUser } from '@clerk/nextjs/server'
import { UserButton } from '@clerk/nextjs'

export default async function Home() {
  const user = await currentUser()
  return (
    <main className="p-8">
      {user ? (
        <div className="flex items-center gap-4">
          <p>Signed in as {user.primaryEmailAddress?.emailAddress}</p>
          <UserButton />
        </div>
      ) : (
        <a href="/sign-in">Sign in</a>
      )}
    </main>
  )
}
