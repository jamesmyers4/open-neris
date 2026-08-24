import { getCurrentAppUser } from './current-user'

type AdminUser = NonNullable<Awaited<ReturnType<typeof getCurrentAppUser>>>

export async function requireAdmin(): Promise<{ user: AdminUser } | { error: string }> {
  const user = await getCurrentAppUser()
  if (!user) return { error: 'You must be signed in.' }
  if (user.role !== 'ADMIN') return { error: 'Admins only.' }
  return { user }
}
