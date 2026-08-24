import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function getCurrentAppUser() {
  const { userId } = await auth()
  if (!userId) return null

  const linked = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (linked) return linked

  return linkPendingInvite(userId)
}

async function linkPendingInvite(clerkId: string) {
  const clerkUser = await currentUser()
  const email = clerkUser?.primaryEmailAddress?.emailAddress
  if (!email) return null

  const pending = await prisma.user.findFirst({ where: { clerkId: null, status: 'PENDING', email } })
  if (!pending) return null

  return prisma.user.update({ where: { id: pending.id }, data: { clerkId, status: 'ACTIVE' } })
}
